var soap = require('soap'),
    JXON = require('jxon'),
    ACCNLObject = require('./ACCNLObject').ACCNLObject;
    nmsDeliveryWSDL = require.resolve('./wsdl/wsdl_nmsDelivery.xml');

class nmsDelivery extends ACCNLObject {
  constructor ( options ){    
    options = options || {};
    options.wsdl = options.wsdl || nmsDeliveryWSDL;
    super( options );
  }
  GetMirrorURL( deliveryId, message ){
    var promise = new Promise( (resolve, reject ) => {this.executeQueryResolve = resolve; this.executeQueryReject = reject;})
    var onLoaded = function( err, result, raw, soapHeader ){
      if( err )
      {
        this.executeQueryReject( err );
      }
      else
        {
          if( this.options.outputFormat && this.options.outputFormat.toString().toUpperCase() == "XML")
            {
              var jxonVersion = JXON.stringToJs(raw);
              jxonVersion = jxonVersion['SOAP-ENV:Envelope']['SOAP-ENV:Body'].GetMirrorURLResponse.pdomOutput;
              console.log('jxonVersion ? ', jxonVersion);
              this.executeQueryResolve( JXON.jsToXml({result : jxonVersion}) );
            }
          else
            this.executeQueryResolve( result.pdomOutput );
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
}

exports.nmsDelivery = nmsDelivery;