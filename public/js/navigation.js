(function (global, $, undefined) {

  function Navigation(options) {
    // Singleton
    if (arguments.callee.instance)
      return arguments.callee.instance;
    this.init(options);
    arguments.callee.instance = this;

    //event emmiter
    EventEmitter.call(this);
  }

  Navigation.prototype.__proto__ = EventEmitter.prototype;

  Navigation.prototype.init = function(options) {
    var self = this;

    var defaults = this.options || {
  		container: "body",
      landing_page: "/",
      params : {xhr: true}
  	};

    options = options || {};
  	this.options = $.extend(defaults, options);

    this.lastpage = this.options.landing_page;
    //history.pushState(this.options.landing_page, null, this.options.landing_page);
    this.event_handlers = {};

    this.$container = $(this.options.container);

    $(window).off("popstate").on("popstate", function(e) {
      var url = e.originalEvent.state || global.location.pathname;
      self.go(url, null, true);
    });
    $(window).on("load", function() {
      self.emit("loaded", global.location.pathname);
    });
  };

  Navigation.getInstance = function(options) {
    var instance = new Navigation(options);
    return instance;
  };

  Navigation.prototype.go = function(url, params, no_history) {
    var self = this;
    if (url === self.lastpage) {
      return;
    }

    if (!url) {

      url = self.options.landing_page;
      no_history = true;
    }
    if (url.substr(0,1) !== "/"){
      url = '/' + url.replace('#','');	//strip the #page part of the hash and leave only the page number
    }

    self.emit("loading");

    params = $.extend(this.options.params, params);


    $.get(url, params, function(data) {
      self.$container.html(data);
      self.lastpage = url;
      self.emit("loaded", url);
    }).error(function(xhr, status, e) {
      if (xhr.status == 404) {
        var data = xhr.responseText;
        self.$container.html(data);
      };
      self.emit("loaded",xhr);
    });

    //push page change to history
    if (! no_history) {
      history.pushState(url, null, url);
    }
  };


  $.fn.navigation = function(options) {
    var chain = this;
    var defaults = {url : "href"};
    options = $.extend(defaults, options);
    this.each( function() {
      if ($(this).data("navigation")) return;

      $(this).data("navigation", true);
      $(this).on("click.navig", function(e) {
        var $this = $(this);
        e.preventDefault();
        var addr = $this.attr("data-addr");
        var url;
        if (options.url instanceof Function) {
          url = options.url($this);
        } else {
          url = $this.attr(options.url);
        }

        global.Navigation.go(url, {addr : addr});
        return true;
      });
    });
    return chain;
  };

  global.Navigation = Navigation.getInstance({});
}(this, $, undefined));
