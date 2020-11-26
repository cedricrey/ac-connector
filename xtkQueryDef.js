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
    var currentExecuteQueryResolve, currentExecuteQueryReject;
    var promise = new Promise( (resolve, reject ) => { currentExecuteQueryResolve = resolve; currentExecuteQueryReject = reject;})
    var onLoaded = ( err, result, raw, soapHeader ) => {
      if( err )
      {
        currentExecuteQueryReject( err );
      }
      else
        {
          if( this.options.outputFormat && this.options.outputFormat.toString().toUpperCase() == "XML")
            {
              var jxonVersion = JXON.stringToJs(raw);
              jxonVersion = jxonVersion['SOAP-ENV:Envelope']['SOAP-ENV:Body'].ExecuteQueryResponse.pdomOutput;
              //console.log('jxonVersion ? ', jxonVersion);
              currentExecuteQueryResolve( JXON.jsToXml({result : jxonVersion}) );
            }
          else if( this.options.outputFormat && this.options.outputFormat.toString().toUpperCase() == "RAW")
            currentExecuteQueryResolve( raw );
          else
            currentExecuteQueryResolve( result.pdomOutput );
        }
    };

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
    var currentSelectAllResolve, currentSelectAllReject;
    var promise = new Promise( (resolve, reject ) => {currentSelectAllResolve = resolve; currentSelectAllReject = reject;})
    var onLoaded = ( err, result, raw, soapHeader ) => {
      if(err){
        return currentSelectAllReject( err );
      }
      if(this.options.outputFormat && this.options.outputFormat.toString().toUpperCase() == "RAW"){
        currentSelectAllResolve(raw);
      } else if( this.options.outputFormat && this.options.outputFormat.toString().toUpperCase() == "XML"){
        var jxonVersion = JXON.stringToJs(raw);
        jxonVersion = jxonVersion['SOAP-ENV:Envelope']['SOAP-ENV:Body'].ExecuteQueryResponse.pdomOutput;
        console.log('jxonVersion ? ', jxonVersion);
        currentSelectAllResolve( JXON.jsToXml({result : jxonVersion}) );
      } else {
        //console.log('selectAll ? ', result);
        currentSelectAllResolve( result.entity.queryDef );
      }
    };

    this.clientPromise.then(
    (  ) => {
      this.client.SelectAll({
        sessiontoken : this.accLogin.sessionToken,
        entity : {$xml : query},
        duplicate: false
      },
        onLoaded
      )}
    );
    return promise;
  }
}

exports.xtkQueryDef = xtkQueryDef;
