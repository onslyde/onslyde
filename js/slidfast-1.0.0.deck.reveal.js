/*!
 * Slidfast v0.0.1
 * www.slidfast.com
 *
 * Copyright (c) Wesley Hales
 * Available under the ASL v2.0 license (see LICENSE)
 */

//Known issues:
//1. When page "flip" is activated after accelerating a touch event,
// a double acceleration glitch occurs when flipping to the back page

// 2. Since page flip does not work on Android 2.2 - 4.0, the "front"
// and "back" concept should not be used.

//optimize for minification and performance
(function (window, document, undefined) {
  "use strict";
  window.slidfast = (function () {

    var options,

      slidfast = function (startupOptions) {
        options = startupOptions;
        return new slidfast.core.init();
      },

      defaultPageID = null,

      focusPage = null,

      touchEnabled = false,

      singlePageModel = false,

      optimizeNetwork = false,

      geo = {on:true, track:false},

      orientationNav = false,

      workers = {script:null, threads:null, mycallback:null, obj:null},

      cacheImages = false,

      isReady = false,

      flipped = false,

      hashNS = "",

      onslyde = {deck:false, sessionID:0};


    slidfast.core = slidfast.prototype = {
      constructor:slidfast,

      start:function () {

        try {
          if (options) {
            //setup all the options being passed in in the init
            defaultPageID = options.defaultPageID;
            onslyde = options.onslyde !== null ? options.onslyde : null;
            hashNS = options.hahsNS !== null ? options.hashNS : "#sf-";
            touchEnabled = options.touchEnabled;
            singlePageModel = options.singlePageModel;
            optimizeNetwork = options.optimizeNetwork;
            orientationNav = options.orientationNav;
            cacheImages = options.cacheImages;
            geo = options.geo !== null ? options.geo : null;
            workers = options.workers !== null ? options.workers : null;
          }
        } catch (e) {
          //alert('Problem with init. Check your options: ' + e);
        }

        //depends on proper DOM structure with defaultPageID
        if (touchEnabled) {
          slidfast.ui.Touch(getElement(defaultPageID));
        }

        if (optimizeNetwork) {
          slidfast.network.init();
        } else {
          //if network optimization isn't turned on, still allow use of AJAX fetch and cache
          if (singlePageModel) {
            slidfast.core.fetchAndCache(true);
          }
        }

        if (orientationNav) {
          slidfast.orientation.init();
        }

        //standalone without DOM structure
        if (geo && geo.on) {
          slidfast.location.init(geo);
        }

        if (workers && workers.script !== null) {
          slidfast.worker.init(workers);
        }

        slidfast.core.hideURLBar();
        //hash change
        slidfast.core.locationChange();

        if (cacheImages) {
          slidfast.core.cacheExternalImage();
        }

        if(onslyde && onslyde.sessionID){
          window.onslydeSessionID = onslyde.sessionID;
        }

        if(onslyde && onslyde.deck){
          slidfast.slides.init(onslyde.sessionID);
        }


      },

      hideURLBar:function () {
        //hide the url bar on mobile devices
        setTimeout(scrollTo, 0, 0, 1);
      },

      init:function () {

        window.addEventListener('load', function (e) {
          isReady = true;
          slidfast.core.start();
        }, false);

        window.addEventListener('hashchange', function (e) {
          slidfast.core.locationChange();
        }, false);

        if(options.onslyde.deck){
          //slide specific todo fix later
          document.addEventListener('keydown', function(e) {
            slidfast.slides.handleKeys(e);
          }, false);
        }

        return slidfast.core;

      },

      locationChange:function (id) {
        var targetId = location.hash;
        if (id) {
          location.hash = hashNS + id;
        } else if (targetId) {
          try {
            //todo implement for backbutton
            //slidfast.ui.slideTo(targetId.replace(hashNS, ''));
          } catch (e) {
            //console.log(e);
          }
        }
      },

      ajax:function (url, callback, async) {
        var req = init();
        req.onreadystatechange = processRequest;

        function init() {
          if (window.XMLHttpRequest) {
            return new XMLHttpRequest();
          } else if (window.ActiveXObject) {
            return new window.ActiveXObject("Microsoft.XMLHTTP");
          }
        }

        function processRequest() {
          if (req.readyState === 4) {
            if (req.status === 200) {
              if (slidfast.html5e.supports_local_storage()) {
                try {
                  localStorage[url] = req.responseText;
                } catch (e) {
                  if (e.name === 'QUOTA_EXCEEDED_ERR') {
                    //write this markup to a server-side
                    //cache or extension of localStorage
                    alert('Quota exceeded!');
                  }
                }
              }
              if (callback) {
                callback(req.responseText, url);
              }
            } else {
              // There is an error of some kind, use our cached copy (if available).
              if (!!localStorage[url]) {
                // We have some data cached, return that to the callback.
                callback(localStorage[url], url);
                return;
              }
            }
          }
        }

        this.doGet = function () {
//          req.open("GET", url + "?timestamp=" + new Date().getTime(), async);
          req.open("GET", url, async);
          req.send(null);

        };

        this.doPost = function (body) {
          req.open("POST", url, async);
          req.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
          req.send(body);
        };
      },

      insertPages:function (text, originalLink) {

        var frame = getFrame();
        frame.write(text);

        //now we have a DOM to work with
        var incomingPages = frame.getElementsByClassName('page');

        var i;
        var pageCount = incomingPages.length;
        //helper for onlcick below
        var onclickHelper = function (e) {
          return function (f) {
            slidfast.ui.slideTo(e);
          };
        };
        for (i = 0; i < pageCount; i += 1) {
          //the new page will always be at index 0 because
          //the last one just got popped off the stack with appendChild (below)
          //todo - handle better
          var newPage = incomingPages[0];
          //stage the new pages to the left by default
          //(todo check for predefined stage class)
          newPage.className = 'page stage-left';

          //find out where to insert
          var location = newPage.parentNode.id === 'back' ? 'back' : 'front';

          try {
            //mobile safari will not allow nodes to be transferred from one DOM to another so
            //we must use adoptNode()
            document.getElementById(location).appendChild(document.adoptNode(newPage));
          } catch (e) {
            //todo graceful degradation?
          }
          //this is where prefetching multiple "mobile" pages embedded in a single html page gets tricky.
          //we may have N embedded pages, so how do we know which node/page this should link/slide to?
          //for now we'll assume the first *-page in the "front" node is where this links to.
          if (originalLink.onclick === null) {
            //todo set the href for ajax bookmark (override back button)
            originalLink.setAttribute('href', '#');
            //set the original link for transition
            originalLink.onclick = onclickHelper(newPage.id);
          }
        }
      },

      cacheExternalImage:function () {
        var images = document.getElementsByTagName('img');

        for (var i = 0; i < images.length; i += 1) {
          if (images[i].hasAttribute("data-image")) {
            cacheImage(images[i]);
          }
        }
        function cacheImage(img) {
          var imageURL = img.getAttribute("data-url");
          //check for image already in storage
          if (!localStorage[imageURL]) {
            //disable this attribute to see DOM security exception
            img.crossOrigin = '';

            img.src = imageURL;
            img.onload = function () {
              if (img.complete) {
                //onload complete, draw into canvas element
                load(img);
              }
            };
          } else {
            //we have already downloaded it, so use custom cache
            img.src = localStorage[imageURL];
          }

          function load(img) {
            //create canvase element with correct width and height
            var canvas = document.createElement("canvas");
            canvas.width = img.width;
            canvas.height = img.height;

            // Copy the image contents to the canvas
            var ctx = canvas.getContext("2d");
            ctx.drawImage(img, 0, 0);
            img.src = ctx.canvas.toDataURL("image/png");
            //store into localstorage
            localStorage[imageURL] = img.src;
          }
        }
      },

      fetchAndCache:function (async) {
        var links = slidfast.core.getUnconvertedLinks(document, 'fetch');

        var i;
        var insertPage = function () {
          var text = arguments[0];
          var url = arguments[1];
          //insert the new mobile page into the DOM
          slidfast.core.insertPages(text, url);
        };
        for (i = 0; i < links.length; i += 1) {
          var ai = new slidfast.core.ajax(links[i], insertPage, async);
          ai.doGet();
        }

      },

      getUnconvertedLinks:function (node, classname) {
        //iterate through all nodes in this DOM to find all mobile pages we care about
        var links = [];
        var pages = node.getElementsByClassName('page');
        var i;
        for (i = 0; i < pages.length; i += 1) {
          //find all links
          var pageLinks = pages[i].getElementsByTagName('a');

          var j;
          for (j = 0; j < pageLinks.length; j += 1) {
            var link = pageLinks[j];

            if (link.hasAttribute('href') &&
              //'#' in the href tells us that this page is already loaded in the dom - and
              // that it links to a mobile transition/page
              !(/[\#]/g).test(link.href)) { //alert((classname === undefined && link.className === '') + '---' + classname + '---- ' + link.className);
              //check for an explicit class name setting to filter this link
              if (classname !== undefined) {
                if (link.className.indexOf(classname) >= 0) {
                  links.push(link);
                }
              } else if (classname === undefined && link.className === '') {
                //return unfiltered list
                links.push(link);
              }
            }
          }
        }
        return links;
      }

    };

    slidfast.core.init.prototype = slidfast.core;

    slidfast.ui = slidfast.prototype = {

      slideTo:function (id, callback) {
        if (!focusPage) {
          focusPage = getElement(defaultPageID);
        }

        //1.)the page we are bringing into focus dictates how
        // the current page will exit. So let's see what classes
        // our incoming page is using. We know it will have stage[right|left|etc...]
        if (typeof id === 'string') {
          try {
            id = getElement(id);
          } catch (e) {
            console.log('You can\'t slideTo that element, because it doesn\'t exist');
          }
        }

        var classes;
        //todo use classList here
        //this causes error with no classname--> console.log(id.className.indexOf(' '));
        try {
          classes = id.className.split(' ');
        } catch (e) {
          console.log('problem with classname on .page: ' + id.id);
        }

        //2.)decide if the incoming page is assigned to right or left
        // (-1 if no match)
        var stageType = classes.indexOf('stage-left');

        //3a.)Flip if needed
        var front = getElement('front');
        if (front) {
          var frontNodes = front.getElementsByTagName('*');
          for (var i = 0; i < frontNodes.length; i += 1) {
            if (id.id === frontNodes[i].id && flipped) {
              slidfast.ui.flip();
            }
          }
        }

        //3b.) decide how this focused page should exit.
        if (stageType > 0) {
          focusPage.className = 'page transition stage-right';
        } else {
          focusPage.className = 'page transition stage-left';
        }

        //4. refresh/set the variable
        focusPage = id;

        //5. Bring in the new page.
        focusPage.className = 'page transition stage-center';

        //6. make this transition bookmarkable
        slidfast.core.locationChange(focusPage.id);

        if (touchEnabled) {
          slidfast.ui.Touch(focusPage);
        }

        if (callback) {
          //time of transition - todo convert css to javascript here
          //we're creating a way to have a callback at the end of the transition/page slide
          setTimeout(callback, 500);
        }


      },


      flip:function () {
        //get a handle on the flippable region
        var front = document.getElementById('front');
        var back = document.getElementById('back');

        //just a simple way to see what the state is
        var classes = front.className.split(' ');
        var flippedClass = classes.indexOf('flipped');

        if (flippedClass >= 0) {
          //already flipped, so return to original
          front.className = 'normal';
          back.className = 'flipped';
          flipped = false;
        } else {
          //do the flip
          front.className = 'flipped';
          back.className = 'normal';
          flipped = true;
        }
      },

      Touch:function (page) {
        //todo - tie to markup for now
        var track = getElement("page-container");
        var currentPos = page.style.left;

        var originalTouch = 0;

        var slideDirection = null;
        var cancel = false;
        var swipeThreshold = 201;

        var swipeTime;
        var timer;
        var maxPos;

        function pageMove(event) {
          //get position after transform
          var curTransform = new window.WebKitCSSMatrix(window.getComputedStyle(page).webkitTransform);
          var pagePosition = curTransform.m41;

          //make sure finger is not released
          if (event.type !== 'touchend') {
            //holder for current x position
            var currentTouch = event.touches[0].clientX;

            if (event.type === 'touchstart') {
              //reset measurement to 0 each time a new touch begins
              originalTouch = event.touches[0].clientX;
              timer = timerStart();
            }

            //get the difference between where we are now vs. where we started on first touch
            currentPos = currentTouch - originalTouch;

            //figure out if we are cancelling the swipe event
            //simple gauge for finding the highest positive or negative number
            if (pagePosition < 0) {
              if (maxPos < pagePosition) {
                cancel = true;
              } else {
                maxPos = pagePosition;
              }
            } else {
              if (maxPos > pagePosition) {
                cancel = true;
              } else {
                maxPos = pagePosition;
              }
            }

          } else {
            //touch event comes to an end
            swipeTime = timerEnd(timer, 'numbers2');
            currentPos = 0;

            //how far do we go before a page flip occurs
            var pageFlipThreshold = 75;

            if (!cancel) {
              //find out which direction we're going on x axis
              if (pagePosition >= 0) {
                //moving current page to the right
                //so means we're flipping backwards
                if ((pagePosition > pageFlipThreshold) || (swipeTime < swipeThreshold)) {
                  //user wants to go backward
                  slideDirection = 'right';
                } else {
                  slideDirection = null;
                }
              } else {
                //current page is sliding to the left
                if ((swipeTime < swipeThreshold) || (pagePosition < pageFlipThreshold)) {
                  //user wants to go forward
                  slideDirection = 'left';
                } else {
                  slideDirection = null;
                }

              }
            }
            maxPos = 0;
            cancel = false;
          }

          positionPage();
        }

        function positionPage(end) {
          page.style.webkitTransform = 'translate3d(' + currentPos + 'px, 0, 0)';
          if (end) {
            page.style.WebkitTransition = 'all .4s ease-out';
            //page.style.WebkitTransition = 'all .4s cubic-bezier(0,.58,.58,1)'
          } else {
            page.style.WebkitTransition = 'all .2s ease-out';
          }
          page.style.WebkitUserSelect = 'none';
        }

        track.ontouchstart = function (event) {
          //alert(event.touches[0].clientX);
          pageMove(event);
        };
        track.ontouchmove = function (event) {
          event.preventDefault();
          pageMove(event);
        };
        track.ontouchend = function (event) {
          pageMove(event);
          //todo - this is a basic example, needs same code as orientationNav
          if (slideDirection === 'left') {
            slidfast.ui.slideTo('products-page');
          } else if (slideDirection === 'right') {
            slidfast.ui.slideTo('home-page');
          }
        };

        positionPage(true);

      }

    };

    var disabledLinks;
    slidfast.network = slidfast.prototype = {

      init:function () {
        window.addEventListener('load', function (e) {
          if (navigator.onLine) {
            //new page load
            slidfast.network.processOnline();
          } else {
            //the app is probably already cached and (maybe) bookmarked...
            slidfast.network.processOffline();
          }
        }, false);

        window.addEventListener("offline", function (e) {
          //we just lost our connection and entered offline mode, disable eternal link
          slidfast.network.processOffline(e.type);
        }, false);

        window.addEventListener("online", function (e) {
          //just came back online, enable links
          slidfast.network.processOnline(e.type);
        }, false);

        slidfast.network.setup();
      },

      setup:function (event) {
        // create a custom object if navigator.connection isn't available
        var connection = navigator.connection || {'type':'0'};
        if (connection.type === 2 || connection.type === 1) {
          //wifi/ethernet
          //Coffee Wifi latency: ~75ms-200ms
          //Home Wifi latency: ~25-35ms
          //Coffee Wifi DL speed: ~550kbps-650kbps
          //Home Wifi DL speed: ~1000kbps-2000kbps
          slidfast.core.fetchAndCache(true);
        } else if (connection.type === 3) {
          //edge
          //ATT Edge latency: ~400-600ms
          //ATT Edge DL speed: ~2-10kbps
          slidfast.core.fetchAndCache(false);
        } else if (connection.type === 2) {
          //3g
          //ATT 3G latency: ~400ms
          //Verizon 3G latency: ~150-250ms
          //ATT 3G DL speed: ~60-100kbps
          //Verizon 3G DL speed: ~20-70kbps
          slidfast.core.fetchAndCache(false);
        } else {
          //unknown
          slidfast.core.fetchAndCache(true);
        }
      },

      processOnline:function (event) {

        slidfast.network.setup();
        checkAppCache();

        //reset our once disabled offline links
        if (event) {
          for (var i = 0; i < disabledLinks.length; i += 1) {
            disabledLinks[i].onclick = null;
          }
        }

        function checkAppCache() {
          //check for a new appCache
          window.applicationCache.addEventListener('updateready', function (e) {
            //alert('checking appcache' + window.applicationCache.status);
            if (window.applicationCache.status === window.applicationCache.UPDATEREADY) {
              // Browser downloaded a new app cache.
              // Swap it in and reload the page to get the new hotness.
              window.applicationCache.swapCache();
              if (confirm('A new version of this site is available. Load it?')) {
                window.location.reload();
              }
            }
          }, false);
        }
      },

      processOffline:function (event) {
        slidfast.network.setup();
        //disable external links until we come back - setting the bounds of app
        disabledLinks = slidfast.core.getUnconvertedLinks(document);
        var i;
        //helper for onlcick below
        var onclickHelper = function (e) {
          return function (f) {
            alert('This app is currently offline and cannot access the hotness!');
            return false;
          };
        };

        for (i = 0; i < disabledLinks.length; i += 1) {

          if (disabledLinks[i].onclick === null) {
            //alert user we're not online
            disabledLinks[i].onclick = onclickHelper(disabledLinks[i].href);
          }
        }
      }


    };

    var geolocationID, currentPosition, interval, callback;
    slidfast.location = slidfast.prototype = {

      init:function (geo) {
        if (slidfast.html5e.supports_geolocation()) {
          if (geo.track) {
            slidfast.location.track();
            interval = geo.interval ? geo.interval : 10000;
            callback = geo.callback;
          } else {
            if (currentPosition === undefined) {
              navigator.geolocation.getCurrentPosition(function (position) {
                currentPosition = position;
              }, slidfast.location.error);
            }
          }

        } else {
          console.log('Geolocation not supported on this device.');
        }
      },

      track:function () {
        //workaround for iOS5 "watchPosition" bug https://bugs.webkit.org/show_bug.cgi?id=43956
        var count = 0;
        geolocationID = window.setInterval(
          function () {
            count++;
            if (count > 3) {  //when count reaches a number, reset interval
              window.clearInterval(geolocationID);
              slidfast.location.track();
            } else {
              navigator.geolocation.getCurrentPosition(slidfast.location.setPosition, slidfast.location.error, { enableHighAccuracy:true, timeout:10000 });
            }
          },
          interval); //end setInterval;
      },

      setPosition:function (position) {
        currentPosition = position;
        console.log('position ' + position.coords.latitude + ' ' + position.coords.longitude);
        callback('position ' + position.coords.latitude + ' ' + position.coords.longitude);
      },

      currentPosition:function () {
        return currentPosition;
      },

      error:function (error) {
        switch (error.code) {
          case error.TIMEOUT:
            console.log('Timeout');
            break;
          case error.POSITION_UNAVAILABLE:
            console.log('Position unavailable');
            break;
          case error.PERMISSION_DENIED:
            console.log('Permission denied');
            break;
          case error.UNKNOWN_ERROR:
            console.log('Unknown error');
            break;
        }
      }

    };

    slidfast.orientation = slidfast.prototype = {

      init:function () {
        if (slidfast.html5e.supports_orientation) {
          if (!focusPage) {
            focusPage = getElement(defaultPageID);
          }
          slidfast.orientation.nav();
        }
      },

      nav:function () {

        window.addEventListener("deviceorientation", function (event) {
          //alpha: rotation around z-axis
          var rotateDegrees = event.alpha;
          //gamma: left to right
          var leftToRight = event.gamma;
          //beta: front back motion
          var frontToBack = event.beta;

          handleOrientationEvent(frontToBack, leftToRight, rotateDegrees);
        }, false);


        var handleOrientationEvent = function (frontToBack, leftToRight, rotateDegrees) {
          //on each movement, we're controlling how the current focusPage moves
          var curTransform = new window.WebKitCSSMatrix(window.getComputedStyle(focusPage).webkitTransform);
          focusPage.innerHTML = leftToRight;
          focusPage.style.webkitTransform = 'translate3d(' + leftToRight * 5 + 'px, 0, 0)';
          focusPage.style.WebkitTransition = 'all .5s ease-out';
          detecttilt(leftToRight);
        };

        var keepgoing = true, pagehistory = [];

        var pagestate = function (pages, className) {
          var that = {};
          that.count = 0;
          that.pages = pages;
          that.pageCount = pages.length;
          that.className = className;
          return that;
        };

        var allpages = listToArray(document.querySelectorAll('.page'));

        var leftPageState = new pagestate(allpages, 'page stage-left');
        var rightPageState = new pagestate(allpages.slice(), 'page stage-right');

        function detecttilt(leftToRight) {
          if (keepgoing) {
            if (leftToRight > 30) {
              donav(leftPageState, rightPageState);
            } else if (leftToRight < -30) {
              donav(rightPageState, leftPageState);
            }
          }
        }

        function donav(ps, ops) {
          var page;
          if (ps.count <= (ps.pageCount + 1)) {
            //reset
            if (ps.count === 0) {
              if (pagehistory.length > 0) {
                ps.pages = pagehistory;
                pagehistory = [];
              }
              ps.count++;
            } else {
              page = ps.pages.pop();
              if (page !== undefined) {
                page.className = ps.className;
                pagehistory.push(page);
                ps.count++;
                console.log(ps.count);
                slideQueue(page);
              } else {
                ops.count = 0;
              }
            }
          }
        }

        function slideQueue(page) {
          keepgoing = false;
          //simple way to put a block on the calling code. Since the orientation is a constant change
          slidfast.ui.slideTo(page, function () {
            keepgoing = true;
          });
        }

      },

      motion:function () {

        if (slidfast.html5e.supports_motion) {
          window.addEventListener('devicemotion', deviceMotionHandler, false);
        }

        function deviceMotionHandler(eventData) {
          // Grab the acceleration including gravity from the results
          var acceleration = eventData.accelerationIncludingGravity;

          // Display the raw acceleration data
          var rawAcceleration = "[x " + Math.round(acceleration.x) + ", y " +
            Math.round(acceleration.y) + ", z " + Math.round(acceleration.z) + "]";

          // Z is the acceleration in the Z axis, and if the device is facing up or down
          var facingUp = -1;
          if (acceleration.z > 0) {
            facingUp = +1;
          }

          // Convert the value from acceleration to degrees acceleration.x|y is the
          // acceleration according to gravity, we'll assume we're on Earth and divide
          // by 9.81 (earth gravity) to get a percentage value, and then multiply that
          // by 90 to convert to degrees.
          var tiltLR = Math.round(((acceleration.x) / 9.81) * -90);
          var tiltFB = Math.round(((acceleration.y + 9.81) / 9.81) * 90 * facingUp);


          // Apply the 2D rotation and 3D rotation to the image
          var rotation = "rotate(" + tiltLR + "deg) rotate3d(1,0,0, " + (tiltFB) + "deg)";
          focusPage.style.webkitTransform = rotation;
        }
      }
    };
    var sharedobj = {};
    slidfast.worker = slidfast.prototype = {
      //
      init:function (workers) {

        var mycallback = workers.mycallback;

        //threading concept from www.smartjava.org/examples/webworkers2/
        function Pool(size) {
          var _this = this;

          // set some defaults
          this.taskQueue = [];
          this.workerQueue = [];
          this.poolSize = size;

          this.addWorkerTask = function (workerTask) {
            if (_this.workerQueue.length > 0) {
              // get the worker from the front of the queue
              var workerThread = _this.workerQueue.shift();
              //get an index for tracking
              slidfast.worker.obj().index = _this.workerQueue.length;
              workerThread.run(workerTask);
            } else {
              // no free workers,
              _this.taskQueue.push(workerTask);
            }
          };

          this.init = function () {
            // create 'size' number of worker threads
            for (var i = 0; i < size; i++) {
              _this.workerQueue.push(new WorkerThread(_this));
            }
          };

          this.freeWorkerThread = function (workerThread) {
            if (_this.taskQueue.length > 0) {
              // don't put back in queue, but execute next task
              var workerTask = _this.taskQueue.shift();
              workerThread.run(workerTask);
            } else {
              _this.taskQueue.push(workerThread);
            }
          };
        }

        // runner work tasks in the pool
        function WorkerThread(parentPool) {

          var _this = this;

          this.parentPool = parentPool;
          this.workerTask = {};

          this.run = function (workerTask) {
            this.workerTask = workerTask;
            // create a new web worker
            if (this.workerTask.script !== null) {
              var worker = new Worker(workerTask.script);
              worker.addEventListener('message', function (event) {
                //getting errors after 3rd thread with...
                //_this.workerTask.callback(event);
                mycallback(event);
                _this.parentPool.freeWorkerThread(_this);
              }, false);
              worker.postMessage(slidfast.worker.obj());
            }
          };

        }

        function WorkerTask(script, callback, msg) {
          this.script = script;
          this.callback = callback;
          console.log(msg);
          this.obj = msg;
        }

        var pool = new Pool(workers.threads);
        pool.init();
        var workerTask = new WorkerTask(workers.script, mycallback, slidfast.worker.obj());

        //todo, break these out into public API/usage
        //basic chunking of data per thread/task
        pool.addWorkerTask(workerTask);
        slidfast.worker.obj().foo = 10;
        pool.addWorkerTask(workerTask);
        slidfast.worker.obj().foo = 20;
        pool.addWorkerTask(workerTask);
        slidfast.worker.obj().foo = 30;
        pool.addWorkerTask(workerTask);
      },

      obj:function () {
        return sharedobj;
      }

    };

    var ip = null,ws;
    var username;
    var isopen = false;
    //var _onopen,_onmessage,_onclose,_onerror;
    slidfast.ws = slidfast.prototype = {

      ip : function(sessionID) {
        var ai = new slidfast.core.ajax('/go/presenters/ip?session=' + window.onslydeSessionID,function(text,url){
          ip = text;
        },false);

        //there are 2 dev environments (1) running just HTML locally (2) running ws server and HTML locally
        //ip for prod needs to be hard coded as well as case (1) from above
        if(ip === null && location.protocol !== "file:"){
          ai.doGet();
        }else{
          ip = '107.22.176.73';
        }

        return ip;
      },

      getip : function(){

        var createRandom = function(){
          return Math.floor(Math.random() * (max - min + 1)) + min;
        }
        var aip;
        var min = 255;
        var max = 999;
        if(!localStorage['onslyde.attendeeIP']){
           aip = createRandom() + '.' + createRandom() + '.' + createRandom() + '.' + createRandom();
          localStorage['onslyde.attendeeIP'] = aip;
        }else{
          aip = localStorage['onslyde.attendeeIP'];
        }
        return aip;
      },

      connect : function(websocket,initString,sessionID) {

        username = 'anonymous';
        //here we check to see if we're passing in our mock websocket object from polling clients (using gracefulWebSocket.js)
        console.log('connecting now', websocket);
        if(!websocket){
          if(!ip){
            ip = this.ip(window.onslydeSessionID);
          }
          var location = 'ws://' + ip + ':8081/?session=' + window.onslydeSessionID + '&attendeeIP=' + this.getip();
          ws = new WebSocket(location);
        }else{
          ws = websocket;
        }
        ws.onopen = function() {
          isopen = true;
          //basic auth until we get something better
//          console.log('sent onopen' + username);
          slidfast.ws._send('user:'+username);

          if(initString){
            slidfast.ws._send(initString);
          }
        };
        ws.onmessage = this._onmessage;
        ws.onclose = this._onclose;
//              ws.onerror = this._onerror;

        return ws;
      },

      _onmessage : function(m) {
        if (m.data) {
//          console.log(m.data);
          //check to see if this message is a CDI event
          //alert('onmessage' + m.data);
          if(m.data.indexOf('sessionID":"' + onslyde.sessionID) > 0){
            try{
              //avoid use of eval...

              var event = (m.data);
              event = (new Function("return " + event))();
              event.onslydeEvent.fire();
            }catch(e){
              console.log(e);
            }
          }else{

          }
        }
      },

      _onclose : function(m) {
        slidfast.ws._send('::disconnect::');
        ws = null;
      },

      _onerror : function(e) {
        console.log(e);
      },

      _send:function (message) {
        //console.log('sent ');
        ws.send(message);

      }
    };

    var activeGroup, activeSlide, activeOption, csessionID;
    var pastOptions = [], activeOptions = [];
    var futureSlides = [], pastSlides = [];
    var futureGroups = [], pastGroups = [];
    var guids = [],wscount,pollcount;
    var groupSlideIndex = 0;
    var currentVotes = {};
    var totalVotes = 0;
    slidfast.slides = slidfast.prototype = {

      init : function(sessionID) {
        csessionID = sessionID;

        futureGroups = toArray(this.groups());
        for (var i = 0; i < futureGroups.length; i++) {
          futureGroups[i].style.display = 'none';
          var thisGroupSlides = this.groupSlides(futureGroups[i]);
          for (var j = 0; j < thisGroupSlides.length; j++) {
            //todo use classlist
//                  thisGroupSlides[j].className = 'slide stage-right';
          }
        }

        activeGroup = futureGroups.shift();
        activeGroup.style.display = '';

        futureSlides = toArray(this.groupSlides(activeGroup));

        activeSlide = futureSlides.shift();

        window.addEventListener('clientVote', function(e) {
          slidfast.slides.optionVote(e.vote,activeSlide);
        }, false);

        window.addEventListener('updateCount', function(e) {
          slidfast.slides.updateDeck(e.wsCount,e.pollCount);
        }, false);

        this.checkOptions();
        this.updateRemotes();
//            slidfast.ui.slideTo(activeSlide);

        this.connect('::connect::');
      },

      connect : function(initString) {
        //ws connect
//        console.log('connect',initString);
        if(!ws){
          slidfast.ws.connect(null,initString,csessionID);
        }else{
          slidfast.ws._send(initString,csessionID);
        }
      },

      updateDeck : function(wsc,pc) {
        wscount = wsc;
        pollcount = pc;
        document.getElementById('wscount').innerHTML = wscount;
        document.getElementById('pollcount').innerHTML = pollcount;
        document.getElementById('sessionID').innerHTML = csessionID;
      },

      wsCount : function() {
        return wscount;
      },

      pollCount : function() {
        return pollcount;
      },

      checkOptions : function() {
//        console.log('checkOptions',groupSlideIndex,activeSlide)
        //console.log('groupSlideIndex: ',activeGroup.querySelectorAll('section')[0].querySelectorAll('.chartimage').length);
        if (groupSlideIndex === 0 && activeSlide !== 'undefined'){
          //fix this with activeslide not returning master on reverse....
          //if (activeSlide.getAttribute("data-option")  === 'master') {
          if(activeGroup.querySelectorAll('section')[0].getAttribute("data-option")  === 'master') {
            //init activeOptions
            var groupOptions = this.groupOptions(activeGroup);

            if(groupOptions.length > 0){

              if(activeSlide.querySelectorAll('.placeholder').length === 0 && activeGroup.querySelectorAll('section')[0].querySelectorAll('.chartimage').length === 0) {
                barChart.clear();
                $('div').remove('.placeholder');
                for (var i = 0; i < groupOptions.length; i++) {
                  barChart.addVoteOption(groupOptions[i]);
                }
                //console.log('activeSlide.querySelectorAll.placeholder.length', activeSlide.querySelectorAll('.placeholder').length);

                var barChartDiv = document.createElement("div");
                barChartDiv.className = 'placeholder';
                //give a unique id;
                barChartDiv.id = guid();
                activeSlide.appendChild(barChartDiv);
                barChart.draw();
                //catch all for enabling any past chart images
                var oldchartimages = document.querySelectorAll('.chartimage');
                for ( var o = 0; o < oldchartimages.length; o++ ) {
                  oldchartimages[o].style.display = '';
                }

              }


            }

          }
        }
      },

      clearRoute : function(){
        activeSlide.removeAttribute("data-route");
      },

      nextSlide : function() {
//        console.log('nextSlide' + futureSlides.length + ' ' + groupSlideIndex);
        if (futureSlides.length > 0) {

          if(activeSlide.getAttribute("data-option") === 'master' &&
            activeSlide.getAttribute("data-route") === null && totalVotes > 0) {
            //console.log('decideroute');
            this.decideRoute();
          }

          pastSlides.push(activeSlide);
          activeSlide = futureSlides.shift();
//               slidfast.ui.slideTo(activeSlide);
          groupSlideIndex++;

          this.sendMarkup();

        } else {
          //move to next group
//               this.nextGroup();
        }
      },

      prevSlide : function() {
        //console.log('prevSlide' + pastSlides.length + ' ' + groupSlideIndex);
        if (pastSlides.length > 0 && groupSlideIndex > 0) {
          futureSlides.unshift(activeSlide);
          activeSlide = pastSlides.pop();
//               slidfast.ui.slideTo(activeSlide);
          groupSlideIndex--;
        } else {
//               this.prevGroup();
        }
      },

      nextGroup : function() {

        //generate an image of the chart to save state
        var baseCanvas = activeGroup.querySelectorAll('section')[0].querySelectorAll('.base')[0];

        if(baseCanvas){
          //var placeHolder = activeGroup.querySelectorAll('section')[0].querySelectorAll('.placeholder')[0];
          //console.log('baseCanvas ', placeHolder.querySelectorAll('.chartimage').length);
          //fix this bullshit please, something is wrong with activeGRoup/Slide when backtracking
          if(activeGroup.querySelectorAll('section')[0].querySelectorAll('.chartimage').length === 0){
            var baseImage = new Image();
            baseImage.src = baseCanvas.toDataURL();
            //baseImage.id = placeHolder.id;
            baseImage.className = 'chartimage';
            baseImage.style.display = 'none';
            activeGroup.querySelectorAll('section')[0].appendChild(baseImage);
          }
        }

        if (futureGroups.length > 0) {
          activeOption = null;

          groupSlideIndex = 0;
          pastGroups.push(activeGroup);
          activeGroup.style.display = 'none';
          activeGroup = futureGroups.shift();
          activeGroup.style.display = '';

          futureSlides = toArray(this.groupSlides(activeGroup));
          //console.log('next group:futureSlides', futureSlides);

          activeSlide = futureSlides.shift();

          this.checkOptions();
          this.updateRemotes();

          //reset votes
          currentVotes = {};
          totalVotes = 0;

          this.sendMarkup()

        } else {
          //eop
        }
      },

      sendMarkup : function() {
        // see if there's anything on the new slide to send to remotes EXPERIMENTAL
        if(activeSlide !== 'undefined'){
          for(var i = 0; i < activeSlide.querySelectorAll('.send').length;i++) {
            //send to remotes
            var remoteMarkup = JSON.stringify({remoteMarkup : encodeURIComponent(activeSlide.querySelectorAll('.send')[i].outerHTML)});
            this.connect(remoteMarkup);
          }
        }
      },

      prevGroup : function() {
        //console.log('prevGroup ' + pastGroups.length);
        if (pastGroups.length > 0) {
          futureGroups.unshift(activeGroup);
          activeGroup.style.display = 'none';
          activeGroup = pastGroups.pop();
          activeGroup.style.display = '';
          //
          //pastSlides = toArray(this.groupSlides(activeGroup));
          //pastSlides.reverse();
          //console.log('pastOptions ' + pastOptions.length);
          if(pastOptions.length > 0){
            //option has been selected for the current group
            if(activeOption){
              activeOption = pastOptions[pastOptions.length - 2];
            }else{
              //option has not been chose yet in active group, so pop from history
              activeOption = pastOptions.pop();
            }

            this.setOption(activeOption);
            pastSlides = futureSlides;
          }else{
            pastSlides = toArray(this.groupSlides(activeGroup));
            //pastSlides.reverse();
          }
          futureSlides = [];
          //this was for the old slide deck... allows to go back in history on chosen option
          //groupSlideIndex = pastSlides.length;
          //set to 0 for reveal
          groupSlideIndex = 0;

          activeSlide = pastSlides.pop();
          var groupOptions = this.groupOptions(activeGroup);
          this.checkOptions();
          this.updateRemotes();
          //console.log('---groupOptions ' + groupOptions);
          //console.log('activeSlide ' + activeSlide);

//               slidfast.ui.slideTo(activeSlide);

          //reset votes
          currentVotes = {};
          totalVotes = 0;

        } else {
          //beginning of presentation
        }
      },

      groups : function() {
        //return all groups in the DOM
        return document.querySelectorAll(".slide-group");
      },

      groupSlides : function(group) {
        //return all slides for a group
        //return group.querySelectorAll(".slide");
        return group.querySelectorAll('section');
      },

      groupOptions : function(group) {
        //there are 2 options per group, based on active slide... return them
        activeOptions = [];
        var u = {}, option;
        var slides = toArray(this.groupSlides(group));
        //console.log(slides.length);
        for (var i = 0; i < slides.length; i++) {
          //or .dataset['option']
          option = slides[i].getAttribute("data-option");
          if (option && option != 'master') {
            if (option in u)
              continue;
            activeOptions.push(option);
            u[option] = 1;
          }
        }
        //console.log('activeOptions ' + activeOptions);

        return activeOptions;
      },

      setOption : function(option) {
        futureSlides = [];
        //try to keep a history of options chosen
        if (pastOptions.length > 0) {
          if (pastOptions.indexOf(option) != 1) {
            pastOptions.push(option);
          }
        } else {
          //push first option on stack
          pastOptions.push(option);
        }

        //only show slides for selected option
        var slides = toArray(this.groupSlides(activeGroup));
        for (var i = 0; i < slides.length; i++) {
          //include only chose option slides and master  ('master' + activeOption) is the only case we want to include master
          //todo - fix double arrow tap when going backwards on master
          if (slides[i].getAttribute("data-option") == option || (slides[i].getAttribute("data-option") == 'master' && activeOption != null)) {
            ////console.log(slides[i]);
            futureSlides.push(slides[i]);
          }else{
            //for reveal
            if (slides[i].getAttribute("data-option") != 'master'){
//                       console.log(slides[i]);
//                       slides[i].style.display = "none";
              slides[i].parentNode.removeChild(slides[i]);
            }
          }
        }

        //safe to set now
        activeOption = option;
        activeOptions = [];
      },

      updateRemotes : function() {
        var activeOptionsString = 'activeOptions:' + activeOptions;
        //console.log('===========' + activeOptions.length);
        if(activeOptions.length >= 1){
          if(!ws){
            //console.log('no conn');
            slidfast.ws.connect(null,activeOptionsString);
          }else{
            //console.log('conn');
            slidfast.ws._send(activeOptionsString);
          }
        }

      },

      optionVote : function(vote, activeSlide) {
        //given vote for a default slide
        var index;
        //if(vote in activeOptions){
        index = activeOptions.indexOf(vote);
        if(vote in currentVotes){
          currentVotes[vote] += 1;
          ////console.log(currentVotes);
        }else{
          currentVotes[vote] = 1;

        }
        //}
        ////console.log(vote + ' ' + currentVotes[vote]);

        for (var i = 0; i < activeOptions.length; i++) {
          if(currentVotes.hasOwnProperty(activeOptions[i]))
            totalVotes += currentVotes[activeOptions[i]];
        }

        barChart.vote(vote);
        barChart.redraw();
      },

      decideRoute : function(){
        //now we need a decision

        var values = [];
        var sortedObj = [];
        for(var opt in currentVotes){
          if (currentVotes.hasOwnProperty(opt)) {
            values.push(currentVotes[opt])
          }
        }
        values.sort(function(a,b){return b-a});

        //todo - check for tie condition

        var winner;
        for(var optb in currentVotes){
          if (currentVotes.hasOwnProperty(optb)) {
            //based on the sorted values, we'll choose the first one
            //javascript hashes can't be sorted, so this is a rebuild
            if(values[0] == currentVotes[optb]){
              winner = optb;
            }
          }
        }
        activeSlide.setAttribute('data-route',winner);
        //clear votes for next slideGroup
        totalVotes = 0;
//            console.log('winner' + winner);
        this.setOption(winner);
      },

      handleKeys : function(event) {
        switch (event.keyCode) {
          case 39: // right arrow
          case 13: // Enter
          case 32: // space
          case 34: // PgDn
            slidfast.slides.nextGroup();
            event.preventDefault();
            break;

          case 37: // left arrow
          case 33: // PgUp
            slidfast.slides.prevGroup();
            event.preventDefault();
            break;

          case 40: // down arrow
            slidfast.slides.nextSlide();
            event.preventDefault();
            break;

          case 38: // up arrow
            slidfast.slides.prevSlide();
            event.preventDefault();
            break;

          case 78: // N
            //document.body.classList.toggle('with-notes');
            break;

          case 27: // ESC
            //document.body.classList.remove('with-notes');
            break;
        }
      }

    };

    slidfast.html5e = slidfast.prototype = {
      /*jshint sub:true */
      supports_local_storage:function () {
        try {
          return 'localStorage' in window && window['localStorage'] !== null;
        } catch (e) {
          return false;
        }
      },

      supports_app_cache:function () {
        try {
          return 'applicationCache' in window && window['applicationCache'] !== null;
        } catch (e) {
          return false;
        }
      },
      //geolocation cannot be accessed with dot notation in iOS5... will prevent page caching
      supports_geolocation:function () {
        try {
          return 'geolocation' in navigator && navigator['geolocation'] !== null;
        } catch (e) {
          return false;
        }
      },

      supports_websocket:function () {
        try {
          return 'WebSocket' in window && window['WebSocket'] !== null;
        } catch (e) {
          return false;
        }
      },

      supports_orientation:function () {
        try {
          return 'DeviceOrientationEvent' in window && window['DeviceOrientationEvent'] !== null;
        } catch (e) {
          return false;
        }
      },

      supports_motion:function () {
        try {
          return 'DeviceMotionEvent' in window && window['DeviceMotionEvent'] !== null;
        } catch (e) {
          return false;
        }
      }

    };

    var getElement = function (id) {
      if (document.querySelector) {
        return document.querySelector('#' + id);
      } else {
        return document.getElementById(id);
      }
    };

    var guid = function()
    {
      var S4 = function ()
      {
        return Math.floor(
          Math.random() * 0x10000 /* 65536 */
        ).toString(16);
      };

      return (
        S4() + S4() + "-" +
          S4() + "-" +
          S4() + "-" +
          S4() + "-" +
          S4() + S4() + S4()
        );
    };

    var timerStart = function () {
      return (new Date()).getTime();
    };

    var timerEnd = function (start, id) {
      return ((new Date()).getTime() - start);
    };

    var log = function (statement) {
      var log = getElement('log');
      var currentText = log.innerHTML;
      log.innerHTML = (new Date()).toTimeString() + ': ' + statement + '<br/>' + currentText;
    };

    var listToArray = function (obj) {
      var array = [];
      [].forEach.call(obj, function (v, i) {
        array[i] = obj[i];
      });
      return array;
    };

    var toArray = function(obj) {
      var array = [];
      // iterate backwards ensuring that length is an UInt32
      for (var i = obj.length >>> 0; i--;) {
        array[i] = obj[i];
      }
      return array;
    };

    var getFrame = function () {
      var frame = document.getElementById("temp-frame");

      if (!frame) {
        // create frame
        frame = document.createElement("iframe");
        frame.setAttribute("id", "temp-frame");
        frame.setAttribute("name", "temp-frame");
        frame.setAttribute("seamless", "");
        frame.setAttribute("sandbox", "allow-same-origin");
        frame.style.display = 'none';
        document.documentElement.appendChild(frame);
      }
      // load a page
      return frame.contentDocument;
    };


    return slidfast;

  })();
})(window, document);


