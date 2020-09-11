"use strict";
var soap = require('soap'),
    ACCNLObject = require('./ACCNLObject').ACCNLObject,
    JXON = require('jxon'),
    xtkSpecFileWSDL = require.resolve('./wsdl/wsdl_xtkspecFile.xml');

class xtkSpecFile extends ACCNLObject {
  constructor ( options ){
    options = options || {};
    options.wsdl = options.wsdl || xtkSpecFileWSDL;
    super( options );
    this.clientPromise.then( function(){
      this.client.addSoapHeader({connection: 'keep-alive'});
    }.bind(this));
  }

  GenerateDoc( spec ) {
   var currentGenerateDocResolve, currentGenerateDocReject;
   var promise = new Promise( (resolve, reject ) => {currentGenerateDocResolve = resolve; currentGenerateDocReject = reject;});
   var onLoaded = ( err, result, raw, soapHeader) => {
          if(err)
            {
              if( err.response &&  err.response.statusCode && err.response.statusCode == 200 )
                {
                  try{
                    var jxonVersion = JXON.stringToJs(raw);
                    jxonVersion = jxonVersion['SOAP-ENV:Envelope']['SOAP-ENV:Body'].GenerateDocResponse.pdomPackage;
                    currentGenerateDocResolve( [result, jxonVersion, raw, soapHeader] );
                  }
                  catch( e ){
                    console.log('xtkSpecFile.GenerateDoc() error on JXON', e);
                    currentGenerateDocReject( { error : e, connector : this.accLogin.server, response : err.response.body });
                    //throw  e;
                    return
                  }
                }
              else
              {
                currentGenerateDocReject( { url : this.accLogin.endpoint, error : err, result, raw } );
                console.log('xtkSpecFile.GenerateDoc() error on result', err.body);
                //throw  {message : "xtkSpecFile.GenerateDoc() error on result", err};
                return
              }

            }
            try{
              var jxonVersion = JXON.stringToJs(raw);
              jxonVersion = jxonVersion['SOAP-ENV:Envelope']['SOAP-ENV:Body'].GenerateDocResponse.pdomPackage;
              currentGenerateDocResolve( [result, jxonVersion, raw, soapHeader] );
            }
            catch( e ){
              console.log('xtkSpecFile.GenerateDoc() error on JXON', e);
              currentGenerateDocReject( { error : e, connector : this.accLogin.server });
              //throw {message : "xtkSpecFile.GenerateDoc() error on JXON", err};
            }
      };

    this.clientPromise.then(
    ( ) => {
      //console.log("Got ACCLogin ? ", this.accLogin.sessionToken);
      this.client.GenerateDoc({
        sessiontoken : this.accLogin.sessionToken,
        domDoc : {$xml : spec}
      },
        onLoaded,
        {forever : true}
      )}
    );
    return promise;
  }
}

exports.xtkSpecFile = xtkSpecFile;
