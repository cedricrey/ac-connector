var soap = require('soap');
    xtkQueryDefWSDL = require.resolve('./wsdl/wsdl_xtkquerydef.xml');

 class  ACCNLObject {
  constructor ( options ){
    options = options || {};
    this.options = options;
    this.accLogin = options.accLogin || {};
    this.endpoint = this.accLogin.endpoint || "";
    this.wsdl = options.wsdl || xtkQueryDefWSDL;
    //We create a Promise that resolve when : 
    //Token are available when logged in, 
    //and the soap writer client is ready for the class
    //or reject when a problem occur
    this.clientPromise = new Promise( (resolve, reject ) => {
        this.resolveClientPromise = resolve;
        this.rejectClientPromise = reject;
    });

    //Just to avoid multiple login request
    if( !this.accLogin.isLoginRequested() )
        this.accLogin.login();
    
    //When the security credentials are availables, client is created
    this.accLogin.getLoginPromise().then( function() {
        this.createClient();
    }.bind(this) )
    .catch( (e) => {
        this.rejectClientPromise( e );
    });
  }
  //Generic client creation. Based on a WDSL defined : by default above, but highly recommended overridden by the extension
  createClient(){
    soap.createClientAsync( this.wsdl, {endpoint : this.endpoint} )
        .then( ( client ) => {
            this.client = client;
            this.client.addHttpHeader('X-Security-Token', this.accLogin.securityToken);
            this.client.addHttpHeader('cookie',  "__sessiontoken=" + this.accLogin.sessionToken);
            this.resolveClientPromise( client );
        })
        .catch( (e) => {
            this.rejectClientPromise( e );
        });
  }
}

exports.ACCNLObject = ACCNLObject;