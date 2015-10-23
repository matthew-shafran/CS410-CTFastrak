// Note: This example requires that you consent to location sharing when
// prompted by your browser. If you see the error "The Geolocation service
// failed.", it means you probably did not give permission for the browser to
// locate you.

function initMap() {
  var map = new google.maps.Map(document.getElementById('map'), {
    center: {lat: 41.6750, lng: -72.7872},
    zoom: 15
  });
  
  var infoWindow = new google.maps.InfoWindow({map: map});

  // Try HTML5 geolocation.
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(function(position) {
      var pos = {
        lat: position.coords.latitude,
        lng: position.coords.longitude
      };

      infoWindow.setPosition(pos);
      infoWindow.setContent('Location found.');
      map.setCenter(pos);
    }, function() {
      handleLocationError(true, infoWindow, map.getCenter());
    });
  } else {
    // Browser doesn't support Geolocation
    handleLocationError(false, infoWindow, map.getCenter());
  }
  
	//Create a marker
   var marker = new google.maps.Marker({
    position: {lat: 41.70, lng: -72.75 },
    map: map,
    title: 'Hello World!'
  });
  
   var contentString = 'This is a test tooltip';
   
   var infowindow = new google.maps.InfoWindow({
    content: contentString,
    maxWidth: 200
  });
  
  //var json = 
  $.getJSON('http://65.213.12.244/realtimefeed/externalfeed/trapezerealtimefeed.json', function(dataset){
  	console.log(dataset);
  });
  
  
}

function handleLocationError(browserHasGeolocation, infoWindow, pos) {
  infoWindow.setPosition(pos);
  infoWindow.setContent(browserHasGeolocation ?
                        'Error: The Geolocation service failed.' :
                        'Error: Your browser doesn\'t support geolocation.');
}