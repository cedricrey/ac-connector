"use strict";
var soap = require('soap'),
    xtkSessionWSDL = require.resolve('./wsdl/wsdl_xtksession.xml');

function ACCLogin( options ){
  options = options || {};
  this.server = options.server || "";
  this.user = options.user || "";
  this.password = options.password || "";
  this.endpoint = this.server + "/nl/jsp/soaprouter.jsp";
  //Just to avoid multiple login request
  this.loginRequested = false;
  this.loginPromise = new Promise( (resolve, reject ) => {
    this.resolveLoginPromise = resolve;
    this.rejectLoginPromise = reject;
  });
  //SSL BYPASS... TRYED TO LOAD LOCALS .PEM BUT UNABLE TO SUCCESS...
  var request = require('request');
  var specialRequest = request.defaults({strictSSL:false});
  this.writePromise = soap.createClientAsync( xtkSessionWSDL, {endpoint : this.endpoint, request : specialRequest} );
}

ACCLogin.prototype.login = function(){  
  //Just to avoid multiple login request
  this.loginRequested = true;
  if( ! this.writePromise )
    {
      //SSL BYPASS... TRYED TO LOAD LOCALS .PEM BUT UNABLE TO SUCCESS...
      var request = require('request');
      var specialRequest = request.defaults({strictSSL:false});
      this.writePromise = soap.createClientAsync( xtkSessionWSDL, {endpoint : this.endpoint, request : specialRequest} );      
    }
  this.writePromise.then(
     function(client){
      this.soapWriterClient = client;
      this.soapWriterClient.Logon({sessiontoken : "",
         strLogin :  this.user ,
         strPassword : this.password ,
         elemParameters : ""}, 
         this.onTokenLoaded.bind(this));
      }.bind( this )
    );
  return this.loginPromise;
};
ACCLogin.prototype.onTokenLoaded = function( err, result, raw, soapHeader){
    
    if(err)
      {
      console.log("Error..." + err );
      this.rejectLoginPromise( err );
      return
      }
    try{
      this.securityToken = result.pstrSecurityToken.$value;
    }
    catch ( e )
    {
      this.securityToken = "";
    }
    this.sessionToken = result.pstrSessionToken.$value;
    this.resolveLoginPromise( this.getTokens() );
};
ACCLogin.prototype.getTokens = function(){
  return {
    securityToken : this.securityToken,
    sessionToken : this.sessionToken,
    endpoint : this.endpoint    
  };
}
ACCLogin.prototype.getLoginPromise = function(){
  return this.loginPromise;
}
//Just to avoid multiple login request
ACCLogin.prototype.isLoginRequested = function(){
  return this.loginRequested;
}
exports.ACCLogin = ACCLogin;