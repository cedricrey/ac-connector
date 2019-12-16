"use strict";
var soap = require('soap'),
    JXON = require('jxon'),
    ACCNLObject = require('./ACCNLObject').ACCNLObject,
    xtkQueryDefWSDL = require.resolve('./wsdl/wsdl_xtkquerydef.xml');

class xtkQueryDef extends ACCNLObject {
  constructor ( options ){    
    options = options || {};
    options.wsdl = options.wsdl || xtkQueryDefWSDL;
    super( options );
  }
  ExecuteQuery( query ){
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
              jxonVersion = jxonVersion['SOAP-ENV:Envelope']['SOAP-ENV:Body'].ExecuteQueryResponse.pdomOutput;
              //console.log('jxonVersion ? ', jxonVersion);
              this.executeQueryResolve( JXON.jsToXml({result : jxonVersion}) );
            }
          else if( this.options.outputFormat && this.options.outputFormat.toString().toUpperCase() == "RAW")
            this.executeQueryResolve( raw );
          else
            this.executeQueryResolve( result.pdomOutput );
        }
    }.bind( this );

    this.clientPromise.then(
    function( query ){
      this.client.ExecuteQuery({
        sessiontoken : this.accLogin.sessionToken,
        domDoc : {$xml : query} 
      },
        onLoaded
      )}.bind(this, query)
    );
    return promise;
  }

  SelectAll( query ){
    var promise = new Promise( (resolve, reject ) => {this.selectAllResolve = resolve; this.selectAllReject = reject;})
    var onLoaded = function( err, result, raw, soapHeader ){
      if(err){
        return this.selectAllReject( err );
      }
      if(this.options.outputFormat && this.options.outputFormat.toString().toUpperCase() == "RAW"){
        this.selectAllResolve(raw);
      } else if( this.options.outputFormat && this.options.outputFormat.toString().toUpperCase() == "XML"){
        var jxonVersion = JXON.stringToJs(raw);
        jxonVersion = jxonVersion['SOAP-ENV:Envelope']['SOAP-ENV:Body'].ExecuteQueryResponse.pdomOutput;
        console.log('jxonVersion ? ', jxonVersion);
        this.selectAllResolve( JXON.jsToXml({result : jxonVersion}) );
      } else {
        this.selectAllResolve( result.pdomOutput );
      }
    }.bind(this);

    this.clientPromise.then(
    function( query ){
      this.client.SelectAll({
        sessiontoken : this.accLogin.sessionToken,
        entity : {$xml : query},
        duplicate: false
      },
        onLoaded
      )}.bind(this, query)
    );
    return promise;
  }
}

exports.xtkQueryDef = xtkQueryDef;