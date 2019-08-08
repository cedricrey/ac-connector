"use strict";
var http = require('http'),
fs = require('fs'),
socket = require('socket.io'),
ACCLogManager = require('./ACCLogManager').ACCLogManager,
UIhttpServer;

class ACCUI{
  static start( options ){
    var UIOptions = options || {};
    ACCUI.UIhttpServerPort = UIOptions.port || "2802";
    ACCUI.UIhttpServerURL = "http://localhost:" +  ACCUI.UIhttpServerPort;
    ACCUI.UIhttpServer = http.createServer(ACCUI.clientRequest).listen(ACCUI.UIhttpServerPort);
    console.log(`\n\n================================\n\nInterface Access started, please open : \n\n\x1B[36m${ACCUI.UIhttpServerURL} \x1B[0;40;37m\n\n================================\n\n`);
    ACCUI.UIsocket = socket(ACCUI.UIhttpServer)
                    .on('connection', function(socket){
                      socket.on('listConnections', ACCUI.listConnections)
                      socket.on('getConnectionDetails', ACCUI.getConnectionDetails)
                      socket.on('setConnectionDetails', ACCUI.setConnectionDetails)
                      socket.on('addConnection', ACCUI.addConnection)


                    });
  }

  static clientRequest(request, response){  
    var content = ""; 
    //console.log( request.headers );
    var languages = request.headers['accept-language'].split(',');
    //console.log('languages', languages);
    languages.push('default');
    var translations = [];
    for(var i = 0 ; i < languages.length ; i++ )
    {
          var currentLang = languages[i].toString();
          var langMatch;
          if( langMatch = currentLang.match(/([^;]*)/gm))
            currentLang = langMatch[0];
            //console.log('currentLang ? ', currentLang)
          try{
            translations = require('./ressources/ui/locales/' + currentLang + '.json');
            break;
          }
          catch(e){
          }
          //console.log('translation : ' , translations );
    }
    try{
      if( request.url.indexOf("/images/") == 0 )
         content = fs.readFileSync( require.resolve('./ressources/ui' + request.url ) );
      else
        content = fs.readFileSync( require.resolve('./ressources/ui/index.html') ).toString();
    }
    catch(e){
      console.error("Error for request : " +  request.url)
      console.error( e );
    }
    if(typeof content == "string")
    for(var w in translations)
      {
        var reg = new RegExp("\\$\\{"+w+"\\}","gm");
        //console.log("reg : " + reg);
        content = content.replace(reg,translations[w]);
      }
    response.end(content);    
  }

  static listConnections( mess ){
    ACCUI.UIsocket.emit('connectionsList',   ACCLogManager.listConnections());
  }
  static getConnectionDetails( name ){    
    //console.log('getConnectionDetails',name)
    ACCUI.UIsocket.emit('connectionDetails', ACCLogManager.getConnection(name));
  }
  static setConnectionDetails( name, details ){    
    ACCLogManager.modifyConnection(name, details);
    ACCUI.UIsocket.emit('connectionDetails', ACCLogManager.getConnection(name));
  }
  static addConnection( name, details ){    
    ACCLogManager.addConnection(name, details);
    ACCUI.UIsocket.emit('connectionDetails', ACCLogManager.getConnection(name));
    ACCUI.UIsocket.emit('connectionsList',   ACCLogManager.listConnections());
  }
  static getServerURL(){
    return ACCUI.UIhttpServerURL;
  }
}

exports.ACCUI = ACCUI;