/**
* @author: jagrawal@isw.net.au
* @date: 16/06/2015
**/

console.log('notifier loaded');

var ncConfig = {
  checkingInterval:15000,
  singularLabel:' New Post',
  pluralLabel:' New Posts',
  maxNewPosts: 20,
  streamUpdatedDelay: 1500,
  domQueries:{
    selectedFilter:'[id^="com_ibm_social_as_filter_FilterList"] a.filterSelected, #lconn_homepage_as_sidenav_SideNavigation_0 li.lotusSelected a',
    rssFeedLink:'div[id^="com_ibm_social_as_feed_FeedLink"] a',
    container: '.lotusStream .lotusWidgetBody .streamHeaderWrapper .icStream-search, #activityStream.lotusStream #activityStreamTop.lotusWidgetBody #connectViews'
  },
  cssStr:'.activity-stream-notify-area {text-align:center;color: white;font-weight:bold;font-size:1.2em;background: #EE7C11;border: none;padding: 10px;cursor: pointer;}.activity-stream-notify-area:hover {background: #75ACF3;}',
  loginUrl:'/homepage/login'
};


(function(){

  var originalTitle = document.title,
    xhrHookAdded = false,
    numStories = 0,
    startTimestamp, notifierBtn, checking, checkInterval, xhr, overrideTimestamp;

  var init = function(container){
    originalTitle = document.title;
    startTimestamp = overrideTimestamp || (new Date()).toISOString();
    overrideTimestamp = null;
    addDojoXhrHook();
    mapSelectedFilterEvent();
	
    if(container){
      if(notifierBtn) dojo.destroy(notifierBtn);
      notifierBtn = dojo.create('div',{className:'activity-stream-notify-area lotusHidden', innerHTML:''}, container,'after');
      dojo.connect(notifierBtn,'click',function(){
        var selectedFilter = dojo.query(ncConfig.domQueries.selectedFilter);
        if(selectedFilter && selectedFilter.length===1 && selectedFilter[0]) iswExtensions.fireClickEvent(selectedFilter[0]);
        resetState(container);
      });
    }

    if(!checking){
      checking = true;
      checkInterval = setInterval(check, ncConfig.checkingInterval);
    }
  };

  var filterClickEvent;
  var mapSelectedFilterEvent = function(){
    var selectedFilter = dojo.query(ncConfig.domQueries.selectedFilter);
    if(selectedFilter && selectedFilter.length===1 && selectedFilter[0]){
      if(filterClickEvent) dojo.disconnect(filterClickEvent);
      filterClickEvent = dojo.connect(selectedFilter[0], 'click', dojo.partial(resetState, null));
    }
  };

  var dojoXhrHook = function(xhrType, args){
    if(xhrType==='POST' && args && args.url.indexOf('connections/opensocial/')>-1){
      var callbackProp = args.load ? 'load' : args.handle ? 'handle' : null;
      if(callbackProp){
        var oldCallback = args[callbackProp];
        args[callbackProp] = function(){
          streamUpdated();
          return oldCallback.apply(this,arguments);
        };
      }
    }
  };

  var addDojoXhrHook = function(){
    if(xhrHookAdded) return;
    xhrHookAdded = true;
    var oldXhr = dojo.xhr;
    dojo.xhr = function(){
      dojoXhrHook.apply(this,arguments);
      return oldXhr.apply(this, arguments);
    }
  };

  var resetState = function(container){
    if(originalTitle) document.title = originalTitle;
    numStories = 0;
    init(container);
  };

  var streamUpdated = function(){
    if(numStories==0){
      setTimeout(function(){
        getStartTime(function(timestamp){ //get start time from the first entry to account for server-client time diff
          // console.log('streamUpdated newtimestamp',timestamp);
          if(timestamp) overrideTimestamp = timestamp;
          resetState();
        });
      }, ncConfig.streamUpdatedDelay);
    }
  };

  var getFeedUrl = function(newOnly){
    var url;
    var feedLink = dojo.query(ncConfig.domQueries.rssFeedLink);
    if(feedLink && feedLink.length===1 && feedLink[0].href.indexOf('javascript')===-1) {
      url = feedLink[0].href+'&format=json'+(newOnly? '&updatedSince='+startTimestamp : '');
      url = url.replace(/\&format=atom/,'');
      // console.log('got url',url);
    }
    return url;
  };

  var getStartTime = function(done){
    getEntries(function(data){
      var feedData = dojo.fromJson(data);
      done(feedData.list[0].published);
    },function(){done((new Date()).toISOString());});
  };

  var getNumNewStories = function(done){
    getEntries(function(data){
      var feedData = dojo.fromJson(data);
      // if(feedData.list.length>0) console.log('found new entry with date', feedData.list[0].published);
      done(feedData.list.length);
    },function(){done(0);}, true);
  };

  var getEntries = function(load,error,newOnly){
    if(xhr) xhr.cancel();
    xhr = dojo.xhrGet({
      url: getFeedUrl(newOnly),
      handleAs:'text',
      handle:function(response){
        xhr = null;
        if(response.status===401){
          console.log('Authentication timed out');
          window.location = ncConfig.loginUrl;
        }
      },
      load:load,
      error: function(err){
        if (err.dojoType==='cancel') { return; }
        console.error(err);
        error.apply(this,arguments);
      }
    });
  };

  var check = function(){
    getNumNewStories(function(numNewStories){
      if(numNewStories>0 && notifierBtn){
        numStories = numNewStories;
        dojo.removeClass(notifierBtn,'lotusHidden');
        var numLabel = (numNewStories > ncConfig.maxNewPosts ? ncConfig.maxNewPosts+'+' : numNewStories);
        notifierBtn.innerHTML = numLabel + (numNewStories>1 ? ncConfig.pluralLabel : ncConfig.singularLabel);
        document.title = '('+numLabel+')'+' '+originalTitle;
        if(numNewStories>ncConfig.maxNewPosts) {
          checking = false;
          clearInterval(checkInterval);
        }
      }
    });
  };

  if(iswExtensions) {
	  iswExtensions.addCssStyle(ncConfig.cssStr);
	  iswExtensions.loadWhenReady(init, [
      function(){
        return ibmConfig && ibmConfig.serviceName==='homepage' && window.location.pathname.indexOf('updates')>-1;
      },
      function(){
        var container = dojo.query(ncConfig.domQueries.container);
        if(container.length>0) return container[0];
      }
    ]);
  } else console.error('missing dependency - iswExtensions');

})();
