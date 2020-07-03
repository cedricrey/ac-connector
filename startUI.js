#!/usr/bin/env node
var ACCUI = require('./ACCUI').ACCUI;
ACCUI.start( {port:4545} );


var url = ACCUI.getServerURL();
var start = (process.platform == 'darwin'? 'open': process.platform == 'win32'? 'start': 'xdg-open');
require('child_process').exec(start + ' ' + url);