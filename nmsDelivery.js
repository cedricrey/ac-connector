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
    var promise = new Promise( (resolve, reject ) => {this.getMirrorURLResolve = resolve; this.getMirrorURLReject = reject;})
    var onLoaded = function( err, result, raw, soapHeader ){
      if( err )
      {
        this.getMirrorURLReject( err );
      }
      else
        {
          if( this.options.outputFormat && this.options.outputFormat.toString().toUpperCase() == "XML")
            {
              var jxonVersion = JXON.stringToJs(raw);
              jxonVersion = jxonVersion['SOAP-ENV:Envelope']['SOAP-ENV:Body'].GetMirrorURLResponse.pdomOutput;
              console.log('jxonVersion ? ', jxonVersion);
              this.getMirrorURLResolve( JXON.jsToXml({result : jxonVersion}) );
            }
          else
            this.getMirrorURLResolve( result.pdomOutput );
        }
    }.bind( this );

    this.clientPromise.then(
    function( query ){
      this.client.GetMirrorURL({
        sessiontoken : this.accLogin.sessionToken,
        lDeliveryId : deliveryId,
        strMessage : message
      },
        onLoaded
      )}.bind(this, query)
    );
    return promise;
  }

  BuildPreviewFromId( /* Number */ deliveryId, /* JXON or XML as String */ params ){
    if( typeof params == "object" )
      params = JSON.stringify( params );

    var promise = new Promise( (resolve, reject ) => {this.buildPreviewFromIdResolve = resolve; this.buildPreviewFromIdReject = reject;})
    var onLoaded = function( err, result, raw, soapHeader ){
      if( err )
      {
        this.buildPreviewFromIdReject( err );
      }
      else
      {
        this.buildPreviewFromIdResolve( [ result.pdomPreview.preview , result.pdomQueryResult.queryResult ]);
      }
    }.bind( this );

    this.clientPromise.then(
    function(){
      this.client.BuildPreviewFromId({
        sessiontoken : this.accLogin.sessionToken,
        lDeliveryId : deliveryId,
        domParams : {$xml :params}
      },
        onLoaded
      )}.bind(this)
    );
    return promise;
  }

  
}

exports.nmsDelivery = nmsDelivery;