"use strict";
var soap = require('soap'),
    JXON = require('jxon'),
    ACCNLObject = require('./ACCNLObject').ACCNLObject,
    nmsDeliveryWSDL = require.resolve('./wsdl/wsdl_nmsDelivery.xml');

class nmsDelivery extends ACCNLObject {
  constructor ( options ){
    options = options || {};
    options.wsdl = options.wsdl || nmsDeliveryWSDL;
    super( options );
  }
  GetMirrorURL( deliveryId, message ){
    var currentGetMirrorURLResolve, currentGetMirrorURLReject
    var promise = new Promise( (resolve, reject ) => {currentGetMirrorURLResolve = resolve; currentGetMirrorURLReject = reject;})
    var onLoaded = ( err, result, raw, soapHeader ) => {
      if( err )
      {
        currentGetMirrorURLReject( err );
      }
      else
        {
          if( this.options.outputFormat && this.options.outputFormat.toString().toUpperCase() == "XML")
            {
              var jxonVersion = JXON.stringToJs(raw);
              jxonVersion = jxonVersion['SOAP-ENV:Envelope']['SOAP-ENV:Body'].GetMirrorURLResponse.pdomOutput;
              console.log('jxonVersion ? ', jxonVersion);
              currentGetMirrorURLResolve( JXON.jsToXml({result : jxonVersion}) );
            }
          else
            currentGetMirrorURLResolve( result.pdomOutput );
        }
    };

    this.clientPromise.then(
    ( ) => {
      this.client.GetMirrorURL({
        sessiontoken : this.accLogin.sessionToken,
        lDeliveryId : deliveryId,
        strMessage : message
      },
        onLoaded
      )}
    );
    return promise;
  }

  BuildPreviewFromId( /* Number */ deliveryId, /* JXON or XML as String */ params ){
    if( typeof params == "object" )
      params = JSON.stringify( params );

    var currentBuildPreviewFromIdResolve, currentBuildPreviewFromIdReject;
    var promise = new Promise( (resolve, reject ) => {currentBuildPreviewFromIdResolve = resolve; currentBuildPreviewFromIdReject = reject;})
    var onLoaded = ( err, result, raw, soapHeader ) => {
      if( err )
      {
        currentBuildPreviewFromIdReject( err );
      }
      else
      {
        currentBuildPreviewFromIdResolve( [ result.pdomPreview.preview , result.pdomQueryResult.queryResult ]);
      }
    };

    this.clientPromise.then(
     () => {
      this.client.BuildPreviewFromId({
        sessiontoken : this.accLogin.sessionToken,
        lDeliveryId : deliveryId,
        domParams : {$xml :params}
      },
        onLoaded
      )}
    );
    return promise;
  }


}

exports.nmsDelivery = nmsDelivery;
