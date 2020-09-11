"use strict";
var soap = require('soap'),
    ACCNLObject = require('./ACCNLObject').ACCNLObject,
    xtkSessionWSDL = require.resolve('./wsdl/wsdl_xtksession.xml');

class xtkSession extends ACCNLObject {
  constructor ( options ){
    options = options || {};
    options.wsdl = options.wsdl || xtkSessionWSDL;
    super( options );
  }

  Write( contentToSend ) {
   var currentWriteResolve, currentWriteReject;
   var promise = new Promise( (resolve, reject ) => {currentWriteResolve = resolve; currentWriteReject = reject;});
   var onLoaded = ( err, result, raw, soapHeader) => {
          if(err)
            {
              currentWriteReject( err );
            }
          currentWriteResolve( result );
      }

    this.clientPromise.then(
      ( ) => {
        this.client.Write({
          sessiontoken : this.accLogin.sessionToken,
          domDoc : {$xml : contentToSend}
        },
          onLoaded
        )}
    );
    return promise;
  }

  GetEntityIfMoreRecent (/*String*/ pk, /*String*/ md5, /*Boolean*/ mustExist) {
    var currentGetEntityResolve, currentGetEntityReject;
    var promise = new Promise( (resolve, reject ) => {currentGetEntityResolve = resolve; currentGetEntityReject = reject;});
    var onLoaded = (err, result, raw, soapHeader) => {
      if(err){
        currentGetEntityReject(err);
      }
      currentGetEntityResolve(result.pdomDoc);
    };

    this.clientPromise.then( ( ) => {
      this.client.GetEntityIfMoreRecent({
        sessiontoken : this.accLogin.sessionToken,
        pk : pk,
        md5 : md5,
        mustExist : mustExist,
      },
        onLoaded
      )}
    );
    return promise;
  }

}
exports.xtkSession = xtkSession;
