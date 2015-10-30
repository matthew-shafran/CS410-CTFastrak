var map;
function initMap() {
  map = new google.maps.Map(document.getElementById('map'), {
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
  
  
  //Testing create functions
  createBus(41.6, -72.7872, 1);
  createBusStop(41.7, -72.7872, 2);
  
  $.ajax({
  	type: "GET",
  	url: "http://gisdata.hartford.gov/datasets/453fb4c1dff74efdbdb46fadfd257e28_0.geojson",
  	success: function(dataset){
  		console.log(dataset);
  		for(var i = 0; i < dataset.features.length; i++){
  			var latitude = dataset.features[i].properties.latitude;
  			var longitude = dataset.features[i].properties.longitude;
  			var id = dataset.features[i].properties.id;
  			createBus(latitude, longitude, id);
  		}
 		 },
 	error:function(){
 		console.log("ERROR");
 	}
 });  
  
}

//If the browser doesn't support GeoLocation, output an error.
function handleLocationError(browserHasGeolocation, infoWindow, pos) {
	infoWindow.setPosition(pos);
  	infoWindow.setContent(browserHasGeolocation ?
                        'Error: The Geolocation service failed.' :
                        'Error: Your browser doesn\'t support geolocation.');
}

//Creates a bus marker and its' tooltip.
function createBus(latitude, longitude, busNumber){
	var image = 'img/bus.png';

		
	var marker = new google.maps.Marker({
    	position: {lat: latitude, lng: longitude },
    	map: map,
    	title: 'Bus #' + busNumber,
    	icon: image
    	
  	});
  	var contentString = '<table><tr><td><b>Bus #:</b></td><td>' + busNumber + '</td></tr>'
  						+ '<tr><td><b>Latitude:</b></td><td>' + latitude + '</td></tr>'
  						+ '<tr><td><b>Longitude:</b></td><td>' + longitude + '</td></tr></table>';
   
   	var infoWindow = new google.maps.InfoWindow({
    	content: contentString,
    	maxWidth: 200
  	});
  
  	marker.addListener('click', function() {
  		infoWindow.open(map,marker);
  	});
}

//Creates a bus stop marker and its' tooltip.
function createBusStop(latitude, longitude, busStopNumber){
	var marker = new google.maps.Marker({
    	position: {lat: latitude, lng: longitude },
    	map: map,
    	title: 'Bus Stop #' + busStopNumber
  	});
  	
  	var contentString = 'This is a test bus stop tooltip';
   
   	var infoWindow = new google.maps.InfoWindow({
    	content: contentString,
    	maxWidth: 200
  	});
  
  	marker.addListener('click', function() {
  		infoWindow.open(map,marker);
  	});
}

//Not done yet
function centerMap(){
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
}
