Navigation.on("loading", function() {
  $('#loading-indicator').show();
  var left_pos = ($(window).width() - $('#loading-indicator').width()) / 2;
  $('#loading-indicator').css("left", left_pos);

  /* hide left panel on mobile phones */
  $("#wrapper").removeClass("sidebar-shown");
  $(".navbar-collapse").toggleClass("in", $("#wrapper").hasClass("sidebar-shown"));
});

Navigation.on("loaded", function() {
  $('#loading-indicator').hide();
});
