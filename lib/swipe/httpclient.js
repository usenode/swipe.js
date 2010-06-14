
if (this.document) {
    pkg.define('swipe_httpclient', ['swipe_uri', 'promise'], function (uri, promise) {

        var ns = {};

        // borrowed from glow
    	function xmlHTTPRequest() {
    		//try IE first. IE7's xmlhttprequest and XMLHTTP6 are broken. Avoid avoid avoid!
    		if (window.ActiveXObject) {
    			return (xmlHTTPRequest = function() { return new ActiveXObject("Microsoft.XMLHTTP"); })();
    		} else {
    			return (xmlHTTPRequest = function() { return new XMLHttpRequest(); })();
    		}
    	}

        var Response = function (connection) {
            this._connection = connection;
            this.body = '';
        };

        Response.prototype.isSuccess = function () {
            var status = this.statusCode();
            return status >= 200 && status < 400;
        };

        Response.prototype.statusCode = function () {
            // from Glow - IE returns 1223 for 204 no content apparently
            return (this._connection.status == 1223) ? 204 : this._connection.status;
        };

        Response.prototype.content = function () {
            return this._connection.responseText;
        };

        var Client = ns.Client = function (instrument) {
            this.readyConnections = {};
            if (instrument) {
                this.instrumentation = [];
            }
        };

        Client.prototype._getConnection = function (hostKey) {
            if (this.readyConnections[hostKey] && this.readyConnections[hostKey].length) {
                return this.readyConnections[hostKey].shift();
            }
            return xmlHTTPRequest();
        };

        Client.prototype.get = function (location) {
            var url             = new uri.URI(location),
                hostKey         = url.scheme() + '://' + url.authority(),
                connection      = this._getConnection(hostKey),
                finished        = new promise.Promise(),
                client          = this,
                instrumentation,
                response;
            
            if (this.instrumentation) {
                this.instrumentation.push(instrumentation = {
                    method  : 'GET',
                    uri     : location,
                    started : new Date()
                });
            }

            connection.open('GET', location, true);

            connection.onreadystatechange = function() {
                if (connection.readyState == 4) {
                    if (instrumentation) {
                        instrumentation.finished = new Date();
                    }

                    response = new Response(connection);
                    finished.resolve(response);

                    // TODO should we reject instead of resolving when the response isn't successful?
                    // doesn't produce very good error messages by default right now
                    // finished.reject(response);

                    // TODO hostKey doesn't make sense for most xhr because of same origin (this is currently "null://null")

                    if (! (hostKey in client.readyConnections)) {
                        client.readyConnections[hostKey] = [];
                    }
                    client.readyConnections[hostKey].push(connection);

    				// prevent parent scopes leaking (cross-page) in IE
    				connection.onreadystatechange = new Function();
    			}
                /*
                if (instrumentation) {
                    instrumentation.responseStarted = new Date();
                }
                */
    		};
    		connection.send(null);

            return finished;
        };
        
        return ns;
    });
}
else {
    pkg.load('swipe_httpclient_node', function (client) {
        pkg.define('swipe_httpclient', function () {
            return client;
        });
    });
}




