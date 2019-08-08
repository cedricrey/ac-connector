# ac-connector
Adobe Campaign Classic Connector for NodeJS

This module provides some classes and multi environments management for Adobe Campaign (ex Neolane) in node JS

##Install
```
npm install ac-connector
```

##Connections Manager
First when install, you have to add connection(s) to your plateform localy.
In this purpose, launch the command
```
ACCManager
```

This will open a manager page that allows to configure severals connections

Those connections are stored in the local user directory (under the ".ac-connector/" folder)

Interface let you define basics and mandatory fields, like server url, user name, password. But you can add your own fields in order to use them in your project.

The field "name" (Name) is the one to identify a connection (must be unique) and use the connection in your project.

##Using the library
Load the library and the class needed
```
var ACC = require('ac-connector');
var ACCLogManager = ACC.ACCLogManager;
var xtkQueryDef = ACC.xtkQueryDef;
```

Then you have to get your connection using ACCLogManager class
```
var login = ACCLogManager.getLogin( 'myconnection' );
```

When you get your 'ACCLogin' object, you can instanciate standard class, passing an object with your login with 'accLogin' name. Every method return a Promise.

```
var queryDef = new xtkQueryDef({ 'accLogin' : login });
var request = queryDef.ExecuteQuery( 
  '<query operation="select" schema="nms:recipient"><select><node expr="@id"/></select><where><condition expr="@email=\'myemail@domain.com\'/></where></query>'
 );
 request.then( (result) => {console.log('result : ', result);})
        .catch( (e) => {console.log('Error ! ', e );});
```

This API is in development