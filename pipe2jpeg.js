'use strict';

const { Router } = require('express');

const Pipe2jpeg = require('pipe2jpeg');

const { name: xPoweredByName, version: xPoweredByVersion } = require(require.resolve('pipe2jpeg/package.json'));

module.exports = RED => {
  const {
    httpNode,
    // server, will be needed for socket.io
    settings: { httpNodeRoot, pipe2jpeg: pipe2jpegSettings },
    _,
    nodes: { createNode, registerType },
  } = RED;

  const { httpMiddleware = null } = pipe2jpegSettings instanceof Object ? pipe2jpegSettings : {};

  class Pipe2jpegNode {
    constructor(config) {
      createNode(this, config);

      this.basePath = config.basePath === 'id' ? this.id : config.basePath;

      this.serveHttp = config.serveHttp !== 'false';

      this.bufferType = ['array', 'concat'].includes(config.bufferType) ? config.bufferType : 'array';

      this.bufferPool = Pipe2jpegNode.validateInt(config.bufferPool, 0, 0, 1);

      this.playlist = '';

      this.displayedStatus = { http: 'off', fill: 'yellow' };

      this.updateDisplayedStatus();

      try {
        this.createPaths(); // throws

        this.createPipe2jpeg();

        this.createHttpRoute(); // throws

        this.on('input', this.onInput);

        this.on('close', this.onClose);
      } catch (error) {
        this.error(error);

        this.status({ fill: 'red', shape: 'dot', text: error.toString() });
      }
    }

    updateDisplayedStatus() {
      const { fill, http } = this.displayedStatus;

      this.status({ fill, shape: 'dot', text: _('pipe2jpeg.info.status', { http }) });
    }

    createPaths() {
      if (this.id !== this.basePath && Pipe2jpegNode.basePathRegex.test(this.basePath) === false) {
        throw new Error(_('pipe2jpeg.error.base_path_invalid', { basePath: this.basePath }));
      }

      const item = Pipe2jpegNode.basePathMap.get(this.basePath);

      if (typeof item === 'object' && item.id !== this.id) {
        throw new Error(_('pipe2jpeg.error.base_path_duplicate', { basePath: this.basePath }));
      }

      Pipe2jpegNode.basePathMap.set(this.basePath, { id: this.id, running: false, serveHttp: false });

      this.topic = {
        status: `pipe2jpeg/${this.basePath}/status`,
        buffer: `pipe2jpeg/${this.basePath}/buffer/${this.bufferType}`,
      };
    }

    destroyPaths() {
      Pipe2jpegNode.basePathMap.delete(this.basePath);

      this.topic = undefined;
    }

    createPipe2jpeg() {
      const pipe2jpegConfig = { readableObjectMode: true, bufferConcat: this.bufferType === 'concat', pool: this.bufferPool };

      this.pipe2jpeg = new Pipe2jpeg(pipe2jpegConfig);

      const handleFirstJpeg = () => {
        const item = Pipe2jpegNode.basePathMap.get(this.basePath);

        item.running = true;

        if (this.serveHttp) {
          this.playlist = {
            jpegImage: this.jpegImagePath,

            mjpegVideo: this.mjpegVideoPath,
          };

          this.send({ _msgid: this._msgid, topic: this.topic.status, retain: true, status: 'playlist', payload: this.playlist });
        }

        this.displayedStatus.fill = 'green';

        this.updateDisplayedStatus();
      };

      this.pipe2jpeg.prependOnceListener('data', handleFirstJpeg);

      const retain = true;

      const topic = this.topic.buffer;

      const getPayload = this.bufferType === 'concat' ? Pipe2jpegNode.getPayloadAsJpeg : Pipe2jpegNode.getPayloadAsList;

      this.pipe2jpeg.on('data', data => {
        const { payload, totalLength } = getPayload(data);

        this.send([null, { _msgid: this._msgid, topic, retain, payload, totalLength }]);
      });

      this.pipe2jpeg.on('error', error => {
        this.pipe2jpeg.reset();

        this.error(error);

        this.status({ fill: 'red', shape: 'dot', text: error.toString() });
      });

      this.pipe2jpeg.on('reset', () => {
        if (this.resWaitingForMjpeg && this.resWaitingForMjpeg.size > 0) {
          this.resWaitingForMjpeg.forEach(res => {
            if (res.writableEnded === false || res.finished === false) {
              res.end();
            }
          });
        }

        const item = Pipe2jpegNode.basePathMap.get(this.basePath);

        item.running = false;

        if (this.playlist) {
          this.playlist = '';

          this.send({ _msgid: this._msgid, topic: this.topic.status, retain: true, status: 'reset', payload: this.playlist });
        }

        this.displayedStatus.fill = 'yellow';

        this.updateDisplayedStatus();

        !this.pipe2jpeg.listeners('data').includes(handleFirstJpeg) && this.pipe2jpeg.prependOnceListener('data', handleFirstJpeg);
      });
    }

    destroyPipe2jpeg() {
      this.pipe2jpeg.removeAllListeners('data');

      this.pipe2jpeg.removeAllListeners('error');

      this.pipe2jpeg.removeAllListeners('reset');

      this.pipe2jpeg.reset();

      this.pipe2jpeg = undefined;
    }

    createHttpRoute() {
      if (typeof Pipe2jpegNode.httpRouter === 'undefined') {
        Pipe2jpegNode.httpRouter = Router({ caseSensitive: true });

        Pipe2jpegNode.httpRouter.pipe2jpegRouter = true;

        Pipe2jpegNode.httpRouter.use((req, res, next) => {
          // https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control#cache_directives
          res.set('Cache-Control', 'no-store');

          // https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Vary#directives
          res.set('Vary', '*');

          // overwrite X-Powered-By Express header
          res.set('X-Powered-By', Pipe2jpegNode.xPoweredBy);

          // note: X-Powered-By can be only removed from Router in middleware calling res.removeHeader('X-Powered-By');

          next();
        });

        if (Pipe2jpegNode.httpMiddleware !== null) {
          Pipe2jpegNode.httpRouter.use(Pipe2jpegNode.httpMiddleware);
        }

        Pipe2jpegNode.httpRouter.get('/', (req, res) => {
          let basePathArray = Array.from(Pipe2jpegNode.basePathMap);

          res.type('json').send(JSON.stringify(basePathArray, null, 2));
        });

        httpNode.use('/pipe2jpeg', Pipe2jpegNode.httpRouter);
      }

      const httpRouter = Router({ caseSensitive: true });

      httpRouter.get('/', (req, res) => {
        res.type('json');

        res.send(
          JSON.stringify(
            { playlist: this.playlist, serveHttp: this.serveHttp, pipe2jpeg: this.pipe2jpeg },
            (key, value) => {
              if (value && value.type === 'Buffer') {
                return `<Buffer ${value.data.length}>`;
              }

              return value;
            },
            2
          )
        );
      });

      httpRouter.basePath = this.basePath;

      Pipe2jpegNode.httpRouter.use(`/${this.basePath}`, httpRouter);

      if (this.serveHttp) {
        this.mjpegVideoPath = `${httpNodeRoot}pipe2jpeg/${this.basePath}/video.mjpeg`;

        this.jpegImagePath = `${httpNodeRoot}pipe2jpeg/${this.basePath}/image.jpeg`;

        this.resWaitingForMjpeg = new Set();

        httpRouter.use((req, res, next) => {
          if (this.pipe2jpeg instanceof Pipe2jpeg && this.pipe2jpeg.totalLength) {
            return next();
          }

          return res.status(404).send(_('pipe2jpeg.error.jpeg_data_not_found', { basePath: this.basePath }));
        });

        const [getPayload, writePayload] =
          this.bufferType === 'concat' ? [Pipe2jpegNode.getPayloadAsJpeg, Pipe2jpegNode.writePayloadAsJpeg] : [Pipe2jpegNode.getPayloadAsList, Pipe2jpegNode.writePayloadAsList];

        const getImage = (req, res) => {
          const { payload } = getPayload(this.pipe2jpeg);

          if (payload) {
            res.type('jpeg');

            writePayload(res, payload);

            return res.end();
          }

          return res.status(404).send(_('pipe2jpeg.error.jpeg_not_found', { basePath: this.basePath }));
        };

        const getVideo = (req, res) => {
          const { payload, totalLength } = getPayload(this.pipe2jpeg);

          if (payload) {
            res.set('Content-Type', 'multipart/x-mixed-replace;boundary=pipe2jpeg');

            res.write(`Content-Type: image/jpeg\r\nContent-Length: ${totalLength}\r\n\r\n`);

            writePayload(res, payload);

            res.write('\r\n--pipe2jpeg\r\n');

            this.resWaitingForMjpeg.add(res);

            return res.once('close', () => {
              this.resWaitingForMjpeg instanceof Set && this.resWaitingForMjpeg.delete(res);

              res.end();
            });
          }

          return res.status(404).send(_('pipe2jpeg.error.mjpeg_not_found', { basePath: this.basePath }));
        };

        this.pipe2jpeg.on('data', data => {
          if (this.resWaitingForMjpeg && this.resWaitingForMjpeg.size > 0) {
            const { payload, totalLength } = getPayload(data);

            this.resWaitingForMjpeg.forEach(res => {
              if (res.writableEnded === false || res.finished === false) {
                res.write(`Content-Type: image/jpeg\r\nContent-Length: ${totalLength}\r\n\r\n`);

                writePayload(res, payload);

                res.write('\r\n--pipe2jpeg\r\n');
              }
            });
          }
        });

        httpRouter.get('/image.jpeg', getImage);

        httpRouter.get('/video.mjpeg', getVideo);

        const item = Pipe2jpegNode.basePathMap.get(this.basePath);

        item.serveHttp = true;

        this.displayedStatus.http = 'on';

        this.updateDisplayedStatus();
      }
    }

    destroyHttpRoute() {
      if (this.serveHttp) {
        if (this.resWaitingForMjpeg.size > 0) {
          this.resWaitingForMjpeg.forEach(res => {
            if (res.writableEnded === false || res.finished === false) {
              res.end();
            }
          });

          this.resWaitingForMjpeg.clear();
        }

        this.mjpegVideoPath = undefined;

        this.jpegImagePath = undefined;

        this.resWaitingForMjpeg = undefined;

        this.displayedStatus.http = 'off';

        this.updateDisplayedStatus();
      }

      const { stack } = Pipe2jpegNode.httpRouter;

      for (let i = stack.length - 1; i >= 0; --i) {
        const layer = stack[i];

        if (layer.name === 'router' && layer.handle.basePath === this.basePath) {
          stack.splice(i, 1);

          break;
        }
      }
    }

    reset() {
      this.pipe2jpeg.reset();
    }

    destroy() {
      this.removeListener('input', this.onInput);

      this.removeListener('close', this.onClose);

      this.destroyHttpRoute();

      this.destroyPipe2jpeg();

      this.destroyPaths();
    }

    onInput(msg, send, done) {
      this._msgid = msg._msgid;

      // this.lastSend = send;

      // this.lastMsg = msg;

      this.handleMsg(msg);

      done();
    }

    handleMsg(msg) {
      const { payload } = msg;

      if (Buffer.isBuffer(payload)) {
        if (payload.length) {
          this.pipe2jpeg.write(payload);
        } else {
          // zero length buffer

          this.reset();
        }

        return;
      }

      const { code, signal } = payload;

      // current method for resetting cache, grab exit code or signal from exec
      if (typeof code !== 'undefined' || typeof signal !== 'undefined') {
        this.reset();
      }
    }

    onClose(removed, done) {
      this.destroy();

      if (removed) {
        this.status({ fill: 'grey', shape: 'ring', text: _('pipe2jpeg.info.removed') });
      } else {
        this.status({ fill: 'grey', shape: 'dot', text: _('pipe2jpeg.info.closed') });
      }

      done();
    }

    static getPayloadAsJpeg(data) {
      return { payload: data.jpeg, totalLength: data.totalLength };
    }

    static getPayloadAsList(data) {
      return { payload: data.list, totalLength: data.totalLength };
    }

    static writePayloadAsJpeg(res, payload) {
      res.write(payload);
    }

    static writePayloadAsList(res, payload) {
      payload.forEach(buffer => {
        res.write(buffer);
      });
    }

    static validateInt(val, def, min, max) {
      const int = Number.parseInt(val);

      return Number.isNaN(int) ? def : int < min ? min : int > max ? max : int;
    }
  }

  Pipe2jpegNode.xPoweredBy = `${xPoweredByName}@${xPoweredByVersion}`;

  Pipe2jpegNode.basePathRegex = /^[a-z\d_.]{1,50}$/i;

  Pipe2jpegNode.basePathMap = new Map();

  Pipe2jpegNode.httpMiddleware = httpMiddleware;

  Pipe2jpegNode.httpRouter = undefined;

  Pipe2jpegNode.type = 'pipe2jpeg';

  registerType(Pipe2jpegNode.type, Pipe2jpegNode);
};
