"use strict";
var soap = require('soap'),
    ACCNLObject = require('./ACCNLObject').ACCNLObject,
    xtkBuilderWSDL = require.resolve('./wsdl/wsdl_xtkbuilder.xml');

class xtkBuilder extends ACCNLObject {
  constructor ( options ){    
    options = options || {};
    options.wsdl = options.wsdl || xtkBuilderWSDL;
    super( options );
    this.clientPromise.then( function(){
      this.client.addSoapHeader({connection: 'keep-alive'});
    }.bind(this));
  }

  InstallPackage( packg ) {
   var promise = new Promise( (resolve, reject ) => {this.executeQueryResolve = resolve; this.executeQueryReject = reject;});
   var onLoaded = function( err, result, raw, soapHeader) {
          if(err)
            {
                this.executeQueryReject( { url : this.accLogin.endpoint, error : err, result, raw } );
                console.log('xtkSpecFile.GenerateDoc() error on result', err.body);
                //throw  {message : "xtkSpecFile.GenerateDoc() error on result", err};
                return              
            }
            try{
              this.executeQueryResolve( [result,  raw, soapHeader] );
            }
            catch( e ){
              console.log('xtkSpecFile.GenerateDoc() error on JXON', e);
              this.executeQueryReject( { error : e, connector : this.accLogin.server });   
              //throw {message : "xtkSpecFile.GenerateDoc() error on JXON", err};       
            }
      }.bind(this);

    this.clientPromise.then(
    function( packg ){
      //console.log("Got ACCLogin ? ", this.accLogin.sessionToken);
      this.client.InstallPackage({
        sessiontoken : this.accLogin.sessionToken,
        parameters : {$xml : packg} 
      },
        onLoaded,
        {forever : true}
      )}.bind(this, packg)
    );
    return promise;
  }  
}

exports.xtkBuilder = xtkBuilder;