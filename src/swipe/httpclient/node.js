
pkg.define('swipe_httpclient_node', ['node:sys', 'promise', 'node:http', 'node:url'], function (sys, promise, http, url) {

    var ns = {};

    // Response

    var Response = function (nodeResponse) {
        this._nodeResponse = nodeResponse;
        this.body = '';
    };

    Response.prototype.isSuccess = function () {
        var status = parseInt(this._nodeResponse.statusCode);
        return status >= 200 && status < 400;
    };

    Response.prototype.statusCode = function () {
        return this._nodeResponse.statusCode;
    };

    Response.prototype.publiclyCacheable = function () {
        var headers      = this._nodeResponse.headers;
    
        if ('expires' in headers) {
            this._expires = new Date(headers.expires);
        }

        // TODO

        return true;
    };

    Response.prototype.cacheUntil = function () {
        return this._expires;
    };

    // Client

    var Client = ns.Client = function (instrument) {
        this.readyConnections = {};
        this.proxyExceptions  = {};
        if (instrument) {
            this.instrumentation = [];
        }
    };

    Client.prototype.setHttpProxy = function (host, port) {
        if (arguments.length < 2) port = 80;
        this.proxyHost = host;
        this.proxyPort = port;
    };

    Client.prototype.addProxyException = function (host) {
        this.proxyExceptions[host] = true;
    };

    Client.prototype.setCache = function (cache) {
        this.cache = cache;
        return this;
    };

    Client.prototype._proxied = function (uri) {
        return this.proxyHost && ! this.proxyExceptions[uri.hostname];
    };

    Client.prototype._getEndpoint = function (uri, proxied) {
        var host, port;
        if (proxied) {
            host = this.proxyHost;
            port = this.proxyPort;
        }
        else {
            host = uri.hostname;
            port = uri.port || (uri.protocol == 'https:' ? 443 : 80);
        }
        return [host + ':' + port, host, port];
    };

    Client.prototype._getConnection = function (endpoint) {
        if (this.readyConnections[endpoint[0]] && this.readyConnections[endpoint[0]].length) {
            return this.readyConnections[endpoint[0]].shift();
        }
        return http.createClient(endpoint[2], endpoint[1]);
    };

    Client.prototype.post = function (location, data) {
        var uri             = url.parse(location),
            proxied         = this._proxied(uri),
            endpoint        = this._getEndpoint(uri, proxied),
            connection      = this._getConnection(endpoint),
            finished        = new promise.Promise(),
            client          = this,
            instrumentation,
            response;

        if (this.instrumentation) {
            this.instrumentation.push(instrumentation = {
                method  : 'POST',
                uri     : location,
                started : new Date()
            });
        }

        var request = connection.request( 
            'POST',
            proxied ?
                location :
                uri.pathname + (uri.search || ''),
            { host: uri.host }
        );

        request.write(data);

        request.addListener('response', function (nodeResponse) {
            var response = new Response(nodeResponse);

            if (instrumentation) {
                instrumentation.responseStarted = new Date();
            }

            nodeResponse.setEncoding("utf8");
            nodeResponse.addListener("data", function (chunk) {
                response.body += chunk;
            });
            nodeResponse.addListener('end', function () {
                if (instrumentation) {
                    instrumentation.finished = new Date();
                }

                finished.resolve(response);

                // TODO should we reject instead of resolving when the response isn't successful?
                // doesn't produce very good error messages by default right now
                // finished.reject(response);

                if (! (endpoint[0] in client.readyConnections)) {
                    client.readyConnections[endpoint[0]] = [];
                }
                client.readyConnections[endpoint[0]].push(connection);
            });
        });
        request.end();
        return finished;
    };

    Client.prototype.get = function (location) {
        var uri             = url.parse(location),
            proxied         = this._proxied(uri),
            endpoint        = this._getEndpoint(uri, proxied),
            connection      = this._getConnection(endpoint),
            finished        = new promise.Promise(),
            client          = this,
            instrumentation,
            response;

        if (this.cache && (response = this.cache.get(location))) {
            finished.resolve(response);
            return finished;
        }

        if (this.instrumentation) {
            this.instrumentation.push(instrumentation = {
                method  : 'GET',
                uri     : location,
                started : new Date()
            });
        }

        var request = connection.request( 
            'GET',
            proxied ?
                location :
                uri.pathname + (uri.search || ''),
            { host: uri.host }
        );

        request.addListener('response', function (nodeResponse) {
            var response = new Response(nodeResponse);

            if (instrumentation) {
                instrumentation.responseStarted = new Date();
            }

            nodeResponse.setEncoding("utf8");
            nodeResponse.addListener("data", function (chunk) {
                response.body += chunk;
            });
            nodeResponse.addListener('end', function () {
                if (instrumentation) {
                    instrumentation.finished = new Date();
                }

                if (client.cache && response.publiclyCacheable()) {
                    client.cache.set(location, response, response.cacheUntil());
                }

                finished.resolve(response);

                // TODO should we reject instead of resolving when the response isn't successful?
                // doesn't produce very good error messages by default right now
                // finished.reject(response);

                if (! (endpoint[0] in client.readyConnections)) {
                    client.readyConnections[endpoint[0]] = [];
                }
                client.readyConnections[endpoint[0]].push(connection);
            });
        });
        request.end();
        return finished;
    };
    
    return ns;

});




