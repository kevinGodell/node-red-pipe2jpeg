# @kevingodell/node-red-pipe2jpeg
######
[![GitHub license](https://img.shields.io/badge/license-MIT-brightgreen.svg)](https://raw.githubusercontent.com/kevinGodell/node-red-pipe2jpeg/master/LICENSE)
[![npm](https://img.shields.io/npm/dt/@kevingodell/node-red-pipe2jpeg.svg?style=flat-square)](https://www.npmjs.com/package/@kevingodell/node-red-pipe2jpeg)
[![GitHub issues](https://img.shields.io/github/issues/kevinGodell/node-red-pipe2jpeg.svg)](https://github.com/kevinGodell/node-red-pipe2jpeg/issues)

**A [Node-RED](https://nodered.org/) node used for parsing jpegs from [ffmpeg](https://ffmpeg.org/).**

* designed to live stream mjpeg video or static jpeg images via http
* video or images can be viewed in modern browsers by setting the `src` in an `img` tag

### Expectations:
* You should have working knowledge of ffmpeg on the command line.
* When using ffmpeg, set `-c mjpeg -f image2pipe`.
* If you have difficulties making it work, please open a new [discussion](https://discourse.nodered.org/) and tag me `@kevinGodell`.
* Do not send private messages asking for help because that will not benefit others with similar issues.

### Installation:
* go to the correct directory, usually ~/.node-red
```
cd ~/.node-red
```
* using npm
```
npm install @kevingodell/node-red-pipe2jpeg
```
* reboot the node-red server
```
node-red-stop && node-red-start
```

### Instructions:
* See the detailed help text in the sidebar.

### Screenshots:
<img width="500" alt="flow" src="">
<img width="500" alt="properties" src="">
<img width="500" alt="help" src="">

### Flows:
https://github.com/kevinGodell/node-red-pipe2jpeg/tree/master/examples
