console.log("core loaded");
var iswExtensions = {
  loadWhenReady: function(initFn, conditionalFns, ignoreHashChange){

    if(typeof initFn !=='function' || !Array.isArray(conditionalFns)) {
      return console.error('Invalid Params', arguments);
    }

    var MAX_ATTEMPTS = 30;

    var numAttemptsForDojo = 0;
    var mapLoadEvent = function(){
      if(typeof dojo=="object"){
        if(!ignoreHashChange) dojo.addOnLoad(mapHashChangeEvent);
        dojo.addOnLoad(fnCallOnLoad);
      }
      else if(numAttemptsForDojo++ <= MAX_ATTEMPTS)
      setTimeout(mapLoadEvent, 1000);
    };



    var currentHref = window.location.href;
    var mapHashChangeEvent = function(){
      //map method to onHashChange event
      if (('onhashchange' in window) && (!dojo.isIE || dojo.isIE > 7)){
        var hashFunc = window.onhashchange;
        window.onhashchange = function() {
          if(typeof hashFunc==='function')
          hashFunc();
          fnCallOnLoad();
        };
      } else {	//if the event is not available then create a callback function to check if the url has changed
        setInterval(function() {
          var newHref = window.location.href;
          if (currentHref !== newHref) {
            currentHref = newHref;
            fnCallOnLoad();
          }
        }, 1000);
      }
    };

    var numAttempts = {};

    var fnCallOnLoad = function(){
      try{
        var val;
        for(var i=0; i<conditionalFns.length; i++) {
          var fn = conditionalFns[i];
          val = fn();
          if(!val) {
            numAttempts[i] = numAttempts[i] ? numAttempts[i]+1 : 1;
            if(numAttempts[i] <=MAX_ATTEMPTS) setTimeout(fnCallOnLoad, 1000);
            return;
          }
        }
        initFn(val);
      } catch(e) {
        console.error('fnCallOnLoad: ', e);
      }
    };

    mapLoadEvent();
  },
  fireClickEvent: function(el){
    if(document.createEvent) {
      var event = document.createEvent('MouseEvents');
      event.initEvent( 'click', true, false );
      el.dispatchEvent( event );

    } else if(document.createEventObject && el.fireEvent) {
      var event = document.createEventObject();
      el.fireEvent( 'onclick', event );
    }
  },
  addCssStyle:function(styleStr){
	var head = document.head || document.getElementsByTagName('head')[0];
	if(styleStr && head) dojo.create('style', {innerHTML:styleStr}, head);
  }
};
