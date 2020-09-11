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
   var currentInstallPackageResolve, currentInstallPackageReject;
   var promise = new Promise( (resolve, reject ) => {currentInstallPackageResolve = resolve; currentInstallPackageReject = reject;});
   var onLoaded = ( err, result, raw, soapHeader) => {
          if(err)
            {
                currentInstallPackageReject( { url : this.accLogin.endpoint, error : err, result, raw } );
                console.log('xtkSpecFile.GenerateDoc() error on result', err.body);
                //throw  {message : "xtkSpecFile.GenerateDoc() error on result", err};
                return
            }
            try{
              currentInstallPackageResolve( [result,  raw, soapHeader] );
            }
            catch( e ){
              console.log('xtkSpecFile.GenerateDoc() error on JXON', e);
              currentInstallPackageReject( { error : e, connector : this.accLogin.server });
              //throw {message : "xtkSpecFile.GenerateDoc() error on JXON", err};
            }
      };

    this.clientPromise.then(
    () => {
      //console.log("Got ACCLogin ? ", this.accLogin.sessionToken);
      this.client.InstallPackage({
        sessiontoken : this.accLogin.sessionToken,
        parameters : {$xml : packg}
      },
        onLoaded,
        {forever : true}
      )}
    );
    return promise;
  };


    BuildOutputNavTree (/*XML String*/ navtreeSource, /*Boolean*/ save) {
      var currentBuildOutputNavTreeResolve, currentBuildOutputNavTreeReject;
      var promise = new Promise( (resolve, reject ) => {currentBuildOutputNavTreeResolve = resolve; currentBuildOutputNavTreeReject = reject;});
      var onLoaded = (err, result, raw, soapHeader) => {
        if(err){
          currentBuildOutputNavTreeReject(err);
        }
        currentBuildOutputNavTreeResolve( result.pdomNavtree.navtree );
      };

      this.clientPromise.then(() => {
        this.client.BuildOutputNavTree({
          sessiontoken : this.accLogin.sessionToken,
          navtreeSource : {$xml : navtreeSource},
          save : save
        },
          onLoaded
        )}
      );
      return promise;
    }
}

exports.xtkBuilder = xtkBuilder;
