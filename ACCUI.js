"use strict";
const http          = require('http');
const fs            = require('fs');
const { Server }    = require('socket.io');
const ACCLogManager = require('./ACCLogManager').ACCLogManager;

/**
 * ACCUI — Local web interface for managing ACC connections.
 *
 * Changes v0.3:
 *  - Upgraded socket.io v2 → v4 (explicit CORS, init via new Server())
 *  - Fixed broadcast bug: socket responses are sent only to the requesting
 *    client (socket.emit) instead of broadcasting to all clients.
 */
class ACCUI {

  static start( options ) {
    const UIOptions = options || {};
    ACCUI.UIhttpServerPort = UIOptions.port || "2802";
    ACCUI.UIhttpServerURL  = "http://localhost:" + ACCUI.UIhttpServerPort;

    ACCUI.UIhttpServer = http.createServer( ACCUI.clientRequest )
                             .listen( ACCUI.UIhttpServerPort );

    console.log(
      `\n\n================================\n\n` +
      `Interface Access started, please open : \n\n` +
      `\x1B[36m${ACCUI.UIhttpServerURL} \x1B[0;40;37m\n\n` +
      `================================\n\n`
    );

    // socket.io v4: CORS restricted to local origin
    ACCUI.UIsocket = new Server( ACCUI.UIhttpServer, {
      cors: {
        origin : ACCUI.UIhttpServerURL,
        methods: ["GET", "POST"]
      }
    });

    ACCUI.UIsocket.on('connection', (socket) => {
      // Each handler replies only to the requesting socket (socket.emit),
      // not as a broadcast (ACCUI.UIsocket.emit).
      socket.on('listConnections',    ()             => ACCUI._listConnections(socket));
      socket.on('getConnectionDetails', (name)       => ACCUI._getConnectionDetails(socket, name));
      socket.on('setConnectionDetails', (name, data) => ACCUI._setConnectionDetails(socket, name, data));
      socket.on('addConnection',        (name, data) => ACCUI._addConnection(socket, name, data));
    });
  }

  static clientRequest( request, response ) {
    let content = "";

    const languages = (request.headers['accept-language'] || 'default').split(',');
    languages.push('default');

    let translations = {};
    for ( const lang of languages ) {
      const langCode = (lang.match(/([^;]*)/) || [])[0] || 'default';
      try {
        translations = require('./ressources/ui/locales/' + langCode + '.json');
        break;
      } catch (e) {
        // Locale not available, try the next one
      }
    }

    try {
      if ( request.url.indexOf("/images/") === 0 )
        content = fs.readFileSync( require.resolve('./ressources/ui' + request.url) );
      else
        content = fs.readFileSync( require.resolve('./ressources/ui/index.html') ).toString();
    } catch (e) {
      console.error("Error handling request: " + request.url, e);
    }

    if ( typeof content === "string" ) {
      for ( const key in translations ) {
        const reg = new RegExp("\\$\\{" + key + "\\}", "gm");
        content = content.replace(reg, translations[key]);
      }
    }

    response.end(content);
  }

  // ─── socket.io handlers (reply only to the requesting socket) ──────────

  static _listConnections( socket ) {
    socket.emit('connectionsList', ACCLogManager.listConnections());
  }

  static _getConnectionDetails( socket, name ) {
    socket.emit('connectionDetails', ACCLogManager.getConnection(name));
  }

  static _setConnectionDetails( socket, name, details ) {
    // modifyConnection is async (keytar) — wait for completion before emitting
    ACCLogManager.modifyConnection(name, details)
      .then( () => socket.emit('connectionDetails', ACCLogManager.getConnection(name)) )
      .catch( (e) => console.error('[ACCUI] Error saving connection:', e) );
  }

  static _addConnection( socket, name, details ) {
    ACCLogManager.addConnection(name, details)
      .then( () => {
        socket.emit('connectionDetails', ACCLogManager.getConnection(name));
        socket.emit('connectionsList',   ACCLogManager.listConnections());
      })
      .catch( (e) => console.error('[ACCUI] Error adding connection:', e) );
  }

  static getServerURL() {
    return ACCUI.UIhttpServerURL;
  }
}

exports.ACCUI = ACCUI;
