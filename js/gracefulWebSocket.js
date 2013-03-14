/**
 * WebSocket with graceful degradation - jQuery plugin
 * @author David Lindkvist
 * @version 0.1
 *
 */

var ws;
window.addEventListener('load', function (e) {
  // in fallback mode: connect returns a dummy object implementing the WebSocket interface
  ws = $.gracefulWebSocket('ws://'+ slidfast.ws.ip(window.onslydeSessionID) + ':8081'); // the ws-protocol will automatically be changed to http
  ws = slidfast.ws.connect(ws);
}, false);

(function ($) {

  $.extend({
    gracefulWebSocket: function (url, options) {
      // Default properties
      this.defaults = {
        keepAlive: false,		// not implemented - should ping server to keep socket open
        autoReconnect: false,	// not implemented - should try to reconnect silently if socket is closed
        fallback: true,			// not implemented - always use HTTP fallback if native browser support is missing
        fallbackSendURL: url === 'ws://107.22.176.73:8081' ? 'http://onslyde.com' : url.replace('ws:', 'http:').replace('wss:', 'https:').replace('8081','8080'),
        fallbackSendMethod: 'POST',
        fallbackPollURL: url === 'ws://107.22.176.73:8081' ? 'http://onslyde.com' : url.replace('ws:', 'http:').replace('wss:', 'https:').replace('8081','8080'),
        fallbackPollMethod: 'GET',
        fallbackOpenDelay: 100,	// number of ms to delay simulated open event
        fallbackPollInterval: 3000,	// number of ms between poll requests
        fallbackPollParams: {}		// optional params to pass with poll requests
      };

      // Override defaults with user properties
      var opts = $.extend({}, this.defaults, options);

      /**
       * Creates a fallback object implementing the WebSocket interface
       */
      function FallbackSocket() {

        // WebSocket interface constants
        const CONNECTING = 0;
        const OPEN = 1;
        const CLOSING = 2;
        const CLOSED = 3;

        var pollInterval;
        var openTimout;
        var posturl = opts.fallbackSendURL + '/go/attendees/vote';

        // create WebSocket object
        var fws = {
          // ready state
          readyState: CONNECTING,
          bufferedAmount: 0,
          send: function (data) {
//                        console.log(data);
            var success = true;
            //replace colon from namespaced websocket data

            vote = data.replace(('vote:'),'');
//                        data += ' sessionID:' + window.onslydeSessionID + ' ';
            data = {"vote": vote, "sessionID": window.onslydeSessionID};
//                        console.log('data',data)
            $.ajax({
              async: false, // send synchronously
              type: opts.fallbackSendMethod,
              url: posturl,
              data: data,
              dataType: 'text',
              contentType : "application/x-www-form-urlencoded; charset=utf-8",
              success: pollSuccess,
              error: function (xhr) {
                success = false;
                $(fws).triggerHandler('error');
              }
            });
            //alert(posturl);
            return success;
          },
          close: function () {
            clearTimeout(openTimout);
            clearInterval(pollInterval);
            this.readyState = CLOSED;
            $(fws).triggerHandler('close');
          },
          onopen: function () {},
          onmessage: function () {},
          onerror: function () {},
          onclose: function () {},
          previousRequest: null,
          currentRequest: null
        };

        function getFallbackParams() {

          // update timestamp of previous and current poll request
          fws.previousRequest = fws.currentRequest;
          fws.currentRequest = new Date().getTime();

          // extend default params with plugin options
          return $.extend(opts.fallbackPollParams, {"previousRequest": fws.previousRequest, "currentRequest": fws.currentRequest, "sessionID": window.onslydeSessionID});
        }

        /**
         * @param {Object} data
         */
        function pollSuccess(data) {

          // trigger onmessage
          var messageEvent = {"data" : data};
          //alert(messageEvent);
          fws.onmessage(messageEvent);
        }
        var counter = 0;
        function poll() {

          $.ajax({
            type: opts.fallbackPollMethod,
            url: opts.fallbackPollURL + '/go/attendees/json',
            dataType: 'text',
            data: getFallbackParams(),
            success: pollSuccess,
            async: false,
            timeout: 30000,
            error: function (xhr) {
              $(fws).triggerHandler('error');
            }
          });
          counter++;
          if(counter === 3600){
            window.clearInterval(pollInterval);
          }
        }
        // simulate open event and start polling
        openTimout = setTimeout(function () {
          fws.readyState = OPEN;
          //fws.currentRequest = new Date().getTime();
          $(fws).triggerHandler('open');
          poll();
          pollInterval = setInterval(poll, opts.fallbackPollInterval);
        }, opts.fallbackOpenDelay);

        // return socket impl
        return fws;
      }

      // create a new websocket or fallback
      var ws = window.WebSocket ? new WebSocket(url + '?session=' + window.onslydeSessionID + '&attendeeIP=' + slidfast.ws.getip()) : new FallbackSocket();
      $(window).unload(function () { ws.close(); ws = null });
      return ws;
    }
  });
})(jQuery);