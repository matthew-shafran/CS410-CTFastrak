var map;
function initMap() {
  map = new google.maps.Map(document.getElementById('map'), {
    center: {lat: 41.6750, lng: -72.7872},
    zoom: 15
  });
  
  var infoWindow = new google.maps.InfoWindow({map: map});
  var bus_stops = {};
  var buses = {};

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

  // CORS issue workaround for CTFastrak's shitty API
  function updateMap() {
      $.getJSON('http://whateverorigin.org/get?url=' + encodeURIComponent('http://65.213.12.244/realtimefeed/vehicle/vehiclepositions.json') + '&callback=?', function(data){
        console.log("This is from the JSON feed via whateverorigin api", data.contents);
        for (var i = 0; i < data.contents.entity.length; i++) {
            var bus = data.contents.entity[i];
            var bus_label = bus.id, latitude = bus.vehicle.position.latitude, longitude = bus.vehicle.position.longitude;
            if (buses.hasOwnProperty(bus_label)) {
                var position = new google.maps.LatLng(latitude, longitude);
                buses[bus_label].setPosition(position);

            } else {
                buses[bus_label] = createBus(latitude, longitude, bus_label);
            }
        }
        
      });
  }
  updateMap();

  var updateInterval = setInterval(updateMap, 30000);
  
  /*$.ajax({
      type: "GET",
      url: "http://65.213.12.244/realtimefeed/vehicle/vehiclepositions.json",
      success: function (response) {
        console.log(response);
      },
      error: function(err) {
        console.log("Error:", err);
      }
  
  });*/
  $.ajax({
  	type: "GET",
  	url: "http://gisdata.hartford.gov/datasets/453fb4c1dff74efdbdb46fadfd257e28_0.geojson",
  	success: function(dataset){
  		console.log("This is from the GTFS feed via hartford.gov api", dataset);
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
	var marker = new google.maps.Marker({
    	position: {lat: latitude, lng: longitude },
    	map: map,
    	title: 'Bus #' + busNumber
  	});
  	var contentString = 'Bus ' + busNumber;
   
   	var infoWindow = new google.maps.InfoWindow({
    	content: contentString,
    	maxWidth: 200
  	});
  
  	marker.addListener('click', function() {
  		infoWindow.open(map,marker);
  	});
    return marker;
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
    return marker;
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
