var soap = require('soap'),
    path = require('path'),
    fs = require('fs'),
    ACCLogin = require( './ACCLogin').ACCLogin;


function ACCLogManager( options ){
  options = options || {};
  //console.log("Welcome on ACC LogManager", ACCLogManager.Connections )
}

ACCLogManager.configPath = getUserHome() + path.sep + '.ac-connector';
ACCLogManager.configFile = ACCLogManager.configPath + path.sep + 'ACConnections.json';

ACCLogManager.saveConnections = function(){
  //process.env.ACConnections = JSON.stringify(ACCLogManager.Connections);
  //console.log('PROCESS : ',  process.env.ACConnections);
  if (!fs.existsSync( ACCLogManager.configPath )) {
    fs.mkdirSync( ACCLogManager.configPath )
  }
  fs.writeFileSync( ACCLogManager.configFile , JSON.stringify({ connections :  ACCLogManager.Connections  }, null, '\t') );
}

ACCLogManager.addConnection = function( name, object ){
  ACCLogManager.Connections[ name ] = object;
  ACCLogManager.saveConnections();
};
ACCLogManager.modifyConnection = function( name, object ){
  for(var k in object)
    if( k != 'name')
      ACCLogManager.Connections[ name ][k] = object[k];
  //ACCLogManager.Connections[ name ] = object;
  ACCLogManager.saveConnections();
};
ACCLogManager.getConnection = function( name, secure ){
  if( ACCLogManager.Connections[ name ] )
    {
      //Copy object
      var connection = JSON.parse( JSON.stringify( ACCLogManager.Connections[ name ] ) );
      //Add the name
      connection.name = name;
      //If secure param, removing password
      if( secure )
        delete connection.password;
      return connection;
    }
  return null;
};
ACCLogManager.listConnections = function(  ){
  var list = [];
  for(var name in ACCLogManager.Connections)
    list.push( name );
  return list;
};
ACCLogManager.getLogin = function( name ){
  var accLogin = new ACCLogin( ACCLogManager.getConnection( name ) );
  accLogin.login();
  return accLogin;
}

try
{
  ACCLogManager.Connections =  require( ACCLogManager.configFile ).connections || {};
}
catch( e )
{
  console.log("It seems that ACConnections is not properly defined.",  process.env.ACConnections, e);
  ACCLogManager.Connections = { };
  ACCLogManager.saveConnections();
}

function getUserHome() {
  return process.env[(process.platform == 'win32') ? 'USERPROFILE' : 'HOME'];
}


exports.ACCLogManager = ACCLogManager;