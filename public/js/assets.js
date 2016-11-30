function display_port_stats(table_container_selector, bridge_name) {

  var header_cell_template = '<th> {} </th>';
  var url = "/Bridge/" + bridge_name + "/port-stats"
  if (!bridge_name)
    url = (location.pathname.substr(-1) === "/") ? "../port-stats" : "port-stats";
  $.getJSON(url, {/* no data */}, function(ports_stats) {
    var $container = $(table_container_selector);
    /* table header */

    var port_names = Object.keys(ports_stats);
    var $header_row = $("<tr>");
    $(header_cell_template.replace("{}", "")).appendTo($header_row);
    for (var i = 0; i < port_names.length; i++) {
      $(header_cell_template.replace("{}", port_names[i])).appendTo($header_row);
    }

    $("<thead>").append($header_row).appendTo($container);

    var stat_fields = {};
    for ( var port_name in ports_stats) {
      $.extend(stat_fields, ports_stats[port_name]);
    }

    stat_fields = Object.keys(stat_fields);

    for (i = 0; i < stat_fields.length; i++) {
      var field = stat_fields[i];
      var $row = $("<tr>");
      $stat_name_cell = $("<th>").text(field);
      $row.append($stat_name_cell);
      for (port_name in ports_stats) {
        stats = ports_stats[port_name];
        var $stat_cell = $("<td>").text(stats[field]);
        $row.append($stat_cell);
        $container.append($row);
      }
    }
    init_custom_scroller($("#port_stats").parent(), true);
  });
}

function init_custom_scroller(selector, horizontal) {
  $(selector).scroller('reset').scroller({
    horizontal : horizontal
  });
}

update_custom_scroller = init_custom_scroller;

function draw_switch_view(selector) {

  var position = 0;
  var led = {
    width : 30,
    height : 20
  };

  // clear tips if any
  $(".d3-tip").remove();

  var tip = d3.tip().attr('class', 'd3-tip').offset([ -10, 0 ]).html(
      function(intf) {
        var tip_html = "Interface: <span style='color:red'>" + intf.name + "</span><br>Port: <span style='color:red'>"
            + intf.port + "</span>";


        var statistics = (intf.statistics && intf.statistics[0] == "map") ? intf.statistics[1] : [];
        var is_err = statistics.filter(function(element) {
          return (((element[0].indexOf('err') != -1) || (element[0].indexOf('drop') != -1)) && (element[1] > 0));
        });

        if (is_err.length)
          tip_html += "<br> <span class=\"text-danger\"> Error detected on this interface:<br> see statistics for details </span>"
        return tip_html
      });

  var redirect = function(intf, index) {
    // TODO: change a redirect principle
    window.location.replace('/Interface/' + intf.name);
  };

  $.getJSON('/_switch_view', {/* no data */}, function(bridges) {
    // clear data
    var start_x = 3;
    var start_y = 3;

    for (var bridge_idx = 0; bridge_idx < bridges.length; bridge_idx++) {

      var bridge = bridges[bridge_idx];
      var bridge_selector = ".switch_view#br_" + bridge.name;
      if (!$(bridge_selector).length)
        continue;

      d3.select(bridge_selector).selectAll("svg").remove();

      for (var port_idx = 0; port_idx < bridge.ports.length; port_idx++) {
        var port = bridge.ports[port_idx];
        // add port name to each interface in a group
        for (var intf_idx = 0; intf_idx < port.interfaces.length; intf_idx++) {
          port.interfaces[intf_idx].port = port.name;
        }

        var max_width = $(bridge_selector).prop('clientWidth');
        var num_of_rows = 1;

        var svg_container = d3.select(bridge_selector).append("svg").attr({
          "width" : "100%",
          "height" : "1px" // increased after drawing whole switch_view
        });

        svg_container.call(tip);

        var max_width = $(bridge_selector).prop('clientWidth');
        var row = 0;
        var prev_x = start_x;
        var real_width = start_x;

        var ports = svg_container.selectAll("rect").data(port.interfaces).enter().append("rect").attr({
          "x" : function() {
            var x = start_x;
            if (start_x > (max_width - (led.width + 3))) {
              x = start_x = 3;
              row++;
            } else {
              start_x += (led.width + 3);
            }
            if (x > real_width) {
              real_width = x + led.width + 1;
            }
            return x;
          },
          "y" : function() {
            var x = this.x.animVal.value;
            if (x < prev_x) {
              start_y += row * led.height + 3;
            }
            prev_x = x;
            return start_y;
          }, /* + led.width */
          "width" : led.width,
          "height" : led.height,
          "class" : function(intf) {
            var c = "iface ";
            if (intf.admin_state !== "up") {
              c += "down ";
            } else {
              c += (intf.link_state === "up") ? "up" : "fail";
            };

            var statistics = (intf.statistics && intf.statistics[0] == "map") ? intf.statistics[1] : [];
            var is_err = statistics.filter(function(element) {
              return (((element[0].indexOf('err') != -1) || (element[0].indexOf('drop') != -1)) && (element[1] > 0));
            });

            if (is_err.length) {
              c += " error";
            }

            return c;
          },
        }).on({
          "mouseover" : tip.show,
          "mouseout" : tip.hide,
          "click" : redirect
        });

        start_x = 3;
        var real_hight = start_y + led.height;
        if (real_width == start_x) {
          real_width = start_x + led.width + 1;
        }

        svg_container.attr({
          'height' : real_hight + 3 + "px",
          'width' : real_width + 3 + "px"
        });

        svg_container.append("rect").attr({
          "x" : start_x - 2,
          "y" : 1,
          "width" : real_width,
          "height" : 1 + real_hight,
          "style" : "fill:none; stroke:black;"
        });
        start_y = 3;
      }
    }
  });
}

function retrieve_updates() {
  var $alerts = $('.dropdown-alerts');
  var $updates = $('#num-of-updates');

  $.getJSON('/updates', function(updates) {
    $('li', $alerts).remove();

    var len = updates.length < 10 ? updates.length : 10;

    for (var int = 0; int < len; int++) {
      var update = updates[int];
      var key = Object.keys(update);
      var uuid = Object.keys(update[key]);
      var msg;
      var subkey;
      var action;
      var icon;

      if ((uuid instanceof Array) && (uuid.length > 1)) {
        msg = 'Multiple changes';
        action = 'changes';
        icon = 'fa-warning';
      } else {
        if (update[key][uuid].old) {
          // removed
          msg = update[key][uuid]['old'];
          action = 'removed';
          icon = 'fa-warning';
        } else {
          // added
          msg = update[key][uuid]['new'];
          action = 'created';
          icon = 'fa-comment';
        }
        // TODO: foreach key in subkeys should be here
        subkey = Object.keys(msg)[0];
        msg = msg[subkey];
      }

      $alerts.append($('<li/>').append($('<a/>', {
        href : "#"
      }).append($('<div/>').append($('<i/>', {
        class : 'fa ' + icon + ' fa-fw'
      })).append(key + ': "' + msg + '"').append($('<span/>', {
        'class' : 'pull-right text-muted small'
      }).append(action)))).append($('<li/>', {
        class : 'divider'
      })));
    }

    $alerts.append($('<li/>').append($('<a/>', {
      href : "/alerts",
      class : 'text-center'
    }).append($('<strong/>').text('See All Alerts').append($('<i/>', {
      class : 'fa fa-angle-right fa-fw'
    })))));

    // <li><a href="#" class="text-center"><strong>See All Alerts</strong><i class="fa fa-angle-right"></i></a></li>
    $updates.text(updates.length || '');
  });
}

function select_menu_item(selector) {
  $item = $(selector);
  if (!$item.length) {
    return;
  }

  $(".nav.collapse.in").removeClass("in");
  $item.addClass("active");
  $parents = $item.parents(".nav.collapse");
  $parents.addClass("in");
}

function submit_raw_json() {
  var data = $("#raw_content > textarea").val();
  var bridge = window.location.pathname.substring(1);
  var index = bridge.indexOf('/');
  if (index != -1) {
    bridge = bridge.substring(0, bridge.lastIndexOf('/'));
  }

  $.post('/' + bridge + '/raw_json', {
    request : data
  }, function(data) {
    console.log(data);
    $("#raw_reply").val(data);
  });
}
