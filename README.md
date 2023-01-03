# @kevingodell/node-red-pipe2jpeg

######
[![Buy me a coffee](https://img.shields.io/badge/-buy%20me%20a%20coffee-red?logo=buy%20me%20a%20coffee&style=flat-square)](https://buymeacoffee.com/kevinGodell)
[![GitHub license](https://img.shields.io/badge/license-MIT-brightgreen.svg?style=flat-square)](https://raw.githubusercontent.com/kevinGodell/node-red-pipe2jpeg/master/LICENSE)
[![npm](https://img.shields.io/npm/dt/@kevingodell/node-red-pipe2jpeg.svg?style=flat-square)](https://www.npmjs.com/package/@kevingodell/node-red-pipe2jpeg)
[![GitHub issues](https://img.shields.io/github/issues/kevinGodell/node-red-pipe2jpeg.svg?style=flat-square)](https://github.com/kevinGodell/node-red-pipe2jpeg/issues)

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
<img width="500" alt="flow" src="https://user-images.githubusercontent.com/6091746/210290124-60aa11d6-40d6-4ea9-88e0-deda3177380c.png">
<img width="500" alt="properties" src="https://user-images.githubusercontent.com/6091746/210290159-d53fd0ad-64cb-4151-8d54-140b43f8342c.png">
<img width="500" alt="help" src="https://user-images.githubusercontent.com/6091746/210290168-696e38c2-7cb9-487b-8139-e73cb070544e.png">

### Flows:
https://github.com/kevinGodell/node-red-pipe2jpeg/tree/master/examples
