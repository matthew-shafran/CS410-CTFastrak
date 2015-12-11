/* CTFastrak project */

/* JSONInterface
 * Has functions for getting JSON data from the CTFastrak JSON API.
 *
 *
 */
var JSONInterface = {
    API : 'http://65.213.12.244/realtimefeed/externalfeed/trapezerealtimefeed.json',
    getData : function(callback) {
        (function(_JSONInterface) {
            $.getJSON(_JSONInterface.API, function(data) { 
                callback(_JSONInterface.format(data)); 
            }); 
        })(this);
    },
    format : function(data) {
        // Format the JSON data to return an array of buses;
        return data.entity;
    },
    init: function() { return this; }
}.init();

/* GTFSInterface
 * Has functions for getting JSON data from the GISData wrapper of the GTFS feed from the CTFastrak GTFS API.
 *
 *
 */
var GTFSInterface = {
    data : { agency : {}, calendar_dates : {}, calendar : {}, routes : {}, shapes : {}, stop_times : {}, stops : {}, trips : {}},
    getData : function(callback) {

        (function(_GTFSInterface) {
            // Queue up all of the GTFS data to be loaded at once before being processed
            queue()
                .defer(d3.csv, "data/csv/agency.txt")
                .defer(d3.csv, "data/csv/calendar_dates.txt")
                .defer(d3.csv, "data/csv/calendar.txt")
                .defer(d3.csv, "data/csv/routes.txt")
                .defer(d3.csv, "data/csv/shapes.txt")
                .defer(d3.csv, "data/csv/stop_times.txt")
                .defer(d3.csv, "data/csv/stops.txt")
                .defer(d3.csv, "data/csv/trips.txt")
                .await(function(error, agency, calendar_dates, calendar, routes, shapes, stop_times, stops, trips) {
                    if (error) { console.log(error); return; }

                    _GTFSInterface.data.calendar_dates = calendar_dates;
                    for (var i = 0; i < agency.length; i++) { _GTFSInterface.data.agency[agency[i].agency_name.substr(agency[i].agency_name.indexOf("- ") + 2)] = agency[i]; }
                    for (var i = 0; i < calendar.length; i++) { _GTFSInterface.data.calendar[calendar[i].service_id] = calendar[i]; }
                    for (var i = 0; i < routes.length; i++) { _GTFSInterface.data.routes[routes[i].route_id] = routes[i]; }
                    for (var i = 0; i < shapes.length; i++) {
                        if (!(_GTFSInterface.data.shapes.hasOwnProperty(shapes[i].shape_id))) {
                            _GTFSInterface.data.shapes[shapes[i].shape_id] = [];
                        } 
                        _GTFSInterface.data.shapes[shapes[i].shape_id].push(shapes[i]);
                    }
                    for (var i = 0; i < stop_times.length; i++) {
                        if (!(_GTFSInterface.data.stop_times.hasOwnProperty(stop_times[i].trip_id))) {
                            _GTFSInterface.data.stop_times[stop_times[i].trip_id] = {}
                        }
                        _GTFSInterface.data.stop_times[stop_times[i].trip_id][stop_times[i].stop_id] = stop_times[i];
                    }
                    for (var i = 0; i < stops.length; i++) { _GTFSInterface.data.stops[stops[i].stop_id] = stops[i]; }
                    for (var i = 0; i < trips.length; i++) { _GTFSInterface.data.trips[trips[i].trip_id] = trips[i]; }

                    for (var trip_id in _GTFSInterface.data.stop_times) {
                        var route_id = _GTFSInterface.data.trips[trip_id].route_id;
                        if (typeof _GTFSInterface.data.routes[route_id].trips === 'undefined') 
                            _GTFSInterface.data.routes[route_id].trips = [];
                        
                        _GTFSInterface.data.routes[route_id].trips.push(trip_id);

                        for (var stop_id in _GTFSInterface.data.stop_times[trip_id]) {
                            if (typeof _GTFSInterface.data.stops[stop_id].routes === 'undefined') 
                                _GTFSInterface.data.stops[stop_id].routes = [];
                            
                            if (_GTFSInterface.data.stops[stop_id].routes.indexOf(route_id) < 0)
                                _GTFSInterface.data.stops[stop_id].routes.push(route_id);
                        }
                    }

                    callback(_GTFSInterface.data);
                });
        })(this);

    },
    init: function() { return this; }
}.init();

/* MapInterface
 * Has functions for manipulating the Google Maps interface object.
 *
 *
 */
var MapInterface = {
    origin : { 
        element : $('#origin-input')
    },
    destination : { 
        element : $('#destination-input')
    },
    buses : {},
    busterminals : {},
    trips: {},
    markers: [],
    routes: [],
    updateMap : function() {
        JSONInterface.getData(function(data) {
            for (var i = 0; i < data.length; i++) {
                // Bus Object
                if (data[i].vehicle !== null) {
                    var bus = data[i];
                    if (MapInterface.buses.hasOwnProperty(bus.id)) {
                        MapInterface.updateBus(bus);
                    } else {
                        MapInterface.createBus(bus);
                    }
                } 
                // Trip/Route Object
                else if (data[i].trip_update !== null) {
                    var trip = data[i];
                    if (MapInterface.trips.hasOwnProperty(trip.id)) {
                        MapInterface.updateTrip(trip);
                    } else {
                        MapInterface.createTrip(trip);
                    }
                }
            }
        });
    },
    createMarker : function(data) {
        var marker = new google.maps.Marker({
            position: data.position,
            map: this.map,
            icon: data.icon,
            title: data.title,
            animation: data.animation,
            draggable: data.draggable
        });
       
        marker.infoWindow = new google.maps.InfoWindow({
            content: data.content, 
            pixelOffset: data.iconOffset,
            maxWidth: 200
        });
        if (!data.noevents) { 
            marker.addListener('mouseover', function() {
                MapInterface.closeMarkers();
                marker.infoWindow.open(MapInterface.map, marker);
            });
            marker.addListener('click', data.callback);
        }

        this.markers.push(marker);
        return marker;
    },
    closeMarkers : function() {
        for (var i = 0; i < this.markers.length; i++) {
            this.markers[i].infoWindow.close();
        }
    },
    toggleMarkers: function(visibility) {
        for (var busId in this.buses) {
            this.buses[busId].marker.setVisible(visibility);
        }
    },
    handleLocationError : function(browserHasGeolocation) {
        alert(browserHasGeolocation ? 'Error: The Geolocation service failed.' : 'Error: Your browser doesn\'t support geolocation.');
    },
    getNearestTerminal : function() {
       var dist = Infinity;
       var nearest_stop_id;
       for (var stop_id in MapInterface.busterminals) {
           var newdist = distance(MapInterface.busterminals[stop_id].marker.position, MapInterface.traveler.position);
           if (newdist < dist) {
               dist = newdist;
               nearest_stop_id = stop_id;
           }
       }
       return MapInterface.busterminals[nearest_stop_id];
    },
    getDirections : function(origin, destination) {
        MapInterface.hideRoutes();
        MapInterface.directions.route({
                origin: origin,
                destination: destination,
                travelMode: google.maps.TravelMode.TRANSIT,
            }, function(response, status) {
                MapInterface.directions_renderer.setDirections(response);
        });
    },
    drawDirections : function(destination) {
        console.log(destination);

        //var nearestTerminal = MapInterface.getNearestTerminal();

        MapInterface.hideRoutes();
        MapInterface.directions.route({
                origin: MapInterface.traveler.position,
                destination: destination.marker.position,
                travelMode: google.maps.TravelMode.TRANSIT,
            }, function(response, status) {
                MapInterface.directions_renderer.setDirections(response);
        });



        // Route walking directions to nearest stop
        /*MapInterface.directions.route({
            origin: MapInterface.traveler.position, 
            destination: nearestTerminal.marker.position,
            travelMode: google.maps.TravelMode.WALKING
        }, function (response, status) {
            MapInterface.directions_renderer_walk.setDirections(response);
            var waypoints = [];
            

            // Route transit directions to destination
            MapInterface.directions.route({
                origin: nearestTerminal.marker.position,
                destination: destination.marker.position,
                travelMode: google.maps.TravelMode.DRIVING,
                //waypoints: waypoints
            }, function(response, status) {
                MapInterface.directions_renderer.setDirections(response);
            });
        });*/
    },
    drawBuses : function() {
        for (var bus_id in MapInterface.buses) {
            MapInterface.buses[bus_id].marker.setVisible(true);
        }
    },
    hideBuses : function() {
        for (var bus_id in MapInterface.buses) {
            MapInterface.buses[bus_id].marker.setVisible(false);
        }
    },
    drawRoutes : function() {
        for (var trip_id in MapInterface.trips) { MapInterface.drawRoute(trip_id); }
        for (var i = 0; i < MapInterface.routes.length; i++) { MapInterface.routes[i].path.setMap(MapInterface.map); }
        for (var key in MapInterface.busterminals) { MapInterface.busterminals[key].marker.setVisible(false); }
    },
    hideRoutes : function() {
        for (i = 0; i < MapInterface.routes.length; i++) {
            MapInterface.routes[i].path.setMap(null);
        }
    },
    drawRoute : function(trip_id) {
        if (typeof GTFSInterface.data.trips[trip_id] !== "undefined") {
            var route_id = GTFSInterface.data.trips[trip_id].route_id;
            var shape_id = GTFSInterface.data.trips[trip_id].shape_id;
            var route = GTFSInterface.data.shapes[shape_id];
            route.color = "#"+GTFSInterface.data.routes[route_id].route_color;
            var stops = MapInterface.trips[trip_id].trip_update.stop_time_update;
            var routeIndex = -1;

            for (i = 0; i < MapInterface.routes.length; i++) {
                if (MapInterface.routes[i].path.trip_id === trip_id) {
                    routeIndex = i;
                } else {
                    MapInterface.routes[i].path.setMap(null);
                    for (j = 0; j < MapInterface.routes[i].stops.length; j++) {
                        MapInterface.routes[i].stops[j].marker.setVisible(false);
                    }
                }
            }
            
            if (routeIndex < 0) {
                // Draw route shape
                var routeCoordinates = [];
                for (var i = 0; i < route.length; i++) {
                    routeCoordinates.push({
                        lat: parseFloat(route[i].shape_pt_lat),
                        lng: parseFloat(route[i].shape_pt_lon)
                    });
                }
                var routePath = new google.maps.Polyline({
                    path: routeCoordinates,
                    geodesic: true,
                    strokeColor: route.color,
                    strokeOpacity: 0.5,
                    strokeWeight: 4
                });
                routePath.route_id = route_id;
                routePath.trip_id = trip_id;
                
                // Draw stops measles
                var routeStops = [];
                for (var i = 0; i < stops.length; i++) {
                    var newicon = MapInterface.busterminals[stops[i].stop_id].marker.icon;
                    newicon.fillColor = route.color;
                    MapInterface.busterminals[stops[i].stop_id].marker.setIcon(newicon);
                    MapInterface.busterminals[stops[i].stop_id].marker.setVisible(true);
                    routeStops.push(MapInterface.busterminals[stops[i].stop_id]);
                }

                MapInterface.routes.push({path:routePath,stops:routeStops});
                routePath.setMap(MapInterface.map);
            } else {
                MapInterface.routes[routeIndex].path.setMap(MapInterface.map);
                for (var i = 0; i < MapInterface.routes[routeIndex].stops.length; i++) {
                    MapInterface.routes[routeIndex].stops[i].marker.icon.fillColor = route.color;
                    MapInterface.routes[routeIndex].stops[i].marker.setVisible(true);
                }
            }
        }
    },
    createBus : function(bus) {
        var busmarker  = {
            position : {
                lat : bus.vehicle.position.latitude,
                lng : bus.vehicle.position.longitude
            },
            icon : {
                url : 'img/largebus.png',
                size: new google.maps.Size(560,182),
                origin: new google.maps.Point(0,0),
                anchor: new google.maps.Point(25,8),
                scaledSize: new google.maps.Size(50,16)
            },
            iconOffset : new google.maps.Size(-255,0),
            title : 'Bus ' + bus.id ,
            content : getBusTooltip(bus),
            
            // Callback function for when clicking on this marker
            callback : function() {
                MapInterface.drawRoute(bus.vehicle.trip.trip_id);

                // update bus terminal text
                var stops = MapInterface.trips[bus.vehicle.trip.trip_id].trip_update.stop_time_update;
                for (var i = 0; i < stops.length; i++) {
                    if((stops[i].arrival != null) && !(typeof stops[i].arrival.time === 'undefined')){
                        var arrivalTime = convertEpochTime(stops[i].arrival.time + (stops[i].arrival.delay * 10));
                        MapInterface.busterminals[stops[i].stop_id].marker.myHtmlContent = "Bus #" + bus.id + " will arrive at stop #" + stops[i].stop_id + " at " + arrivalTime;
                    }
                    MapInterface.busterminals[stops[i].stop_id].marker.infoWindow.setContent(MapInterface.busterminals[stops[i].stop_id].marker.myHtmlContent);
                }
            }
        }
        bus.marker = MapInterface.createMarker(busmarker);
        MapInterface.buses[bus.id] = bus;
    },
    updateBus : function(bus) {
        var position = new google.maps.LatLng(bus.vehicle.position.latitude, bus.vehicle.position.longitude);
        this.buses[bus.id].marker.setPosition(position);
    },
    createTrip : function(trip) {
        // TODO figure out how to display this/what data to keep
        this.trips[trip.id] = trip;
    },
    updateTrip : function(trip) {
        // TODO figure out if updating is different from creating
        this.trips[trip.id] = trip;
    },
    createBusTerminal : function(bus_terminal) {
        var bus_terminal_marker  = {
            position : {
                lat : parseFloat(bus_terminal.stop_lat),
                lng : parseFloat(bus_terminal.stop_lon)
            },
            icon : {
                path: google.maps.SymbolPath.CIRCLE,
                scale: 4,
                fillColor: '#000000',
                fillOpacity: 1.0,
                strokeWeight: 1,
                strokeOpacity: 0.25
            },
            iconOffset : new google.maps.Size(0,0),
            title : bus_terminal.stop_name + " (#" + bus_terminal.stop_id + ")",
            content : bus_terminal.stop_name + " (#" + bus_terminal.stop_id + ")",
            // Sets the destination location
            callback : function() {
                MapInterface.drawDirections(bus_terminal);
            }
        }
        bus_terminal.marker = MapInterface.createMarker(bus_terminal_marker);
        bus_terminal.marker.setVisible(false);

        MapInterface.busterminals[bus_terminal.stop_id] = bus_terminal;
    },
    updateBusTerminal : function() {

    },
    centerMap : function() {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(function(position) {
                var position = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                }

                var traveler_marker  = {
                    position : position,
                    draggable: true,
                    noevents: true,
                    animation: google.maps.Animation.DROP,
                    icon : {
                        url: 'img/traveler.png',
                        size: new google.maps.Size(36,63),
                        origin: new google.maps.Point(0,0),
                        anchor: new google.maps.Point(5,25),
                        scaledSize: new google.maps.Size(10,18)
                    },
                    iconOffset : new google.maps.Size(-13,0),
                    title : 'You are here',
                    content : 'You are here',
                }

                MapInterface.traveler = MapInterface.createMarker(traveler_marker);
                MapInterface.traveler.position = new google.maps.LatLng(position.lat, position.lng);
                MapInterface.map.setCenter(MapInterface.traveler.position);
            }, 
            function() {
                MapInterface.handleLocationError(true);
            });
        } else {
            this.handleLocationError(false);
        }
    },
    init: function() {
        this.map = new google.maps.Map(document.getElementById('map'), {
            //TODO rewrite these hard-coded coordinates
            center: {lat: 41.6750, lng: -72.7872},
            zoom: 15
        });
        this.geocoder = new google.maps.Geocoder;
        this.places = new google.maps.places.PlacesService(this.map);
        this.directions = new google.maps.DirectionsService;
        this.directions_renderer = new google.maps.DirectionsRenderer;
        this.directions_renderer_walk = new google.maps.DirectionsRenderer({suppressMarkers:true});
        this.directions_renderer.setMap(this.map);
        this.directions_renderer_walk.setMap(this.map);

        MapInterface.map.addListener('click', function() { MapInterface.closeMarkers(); });
        MapInterface.updateInterval = setInterval(function() { MapInterface.updateMap(); }, 30000);

        // Load the GTFS static data
        GTFSInterface.getData(function(data) { 
            for (var stop_id in data.stops) {
                MapInterface.createBusTerminal(data.stops[stop_id]);
            }
        });
        // Create controls buttons
        $("#toggle-routes").on("click", function() {
            if (MapInterface.toggleRoutes) MapInterface.hideRoutes();
            else MapInterface.drawRoutes();
            MapInterface.toggleRoutes = !MapInterface.toggleRoutes;
        });

        $("#toggle-buses").on("click",function() {
            if (MapInterface.toggleBuses) MapInterface.drawBuses();
            else MapInterface.hideBuses();
            MapInterface.toggleBuses = !MapInterface.toggleBuses;

        });

        $("#route-button").on("click",function() {
            var origin = $("#origin-input").val();
            var destination = $("#destination-input").val();
            if (origin.length > 0 && destination.length > 0) {
                MapInterface.getDirections(origin, destination);
            } else if (destination.length > 0) {
                MapInterface.getDirections(MapInterface.traveler.position, destination);
            }

        });

        // Try HTML5 geolocation.
        this.centerMap();    
        this.updateMap();
    }
};

function distance(coords1, coords2) {
  		var p = 0.017453292519943295;    // Math.PI / 180
  		var a = 0.5 - Math.cos((coords2.lat() - coords1.lat()) * p)/2 + 
          Math.cos(coords1.lat() * p) * Math.cos(coords2.lat() * p) * 
          (1 - Math.cos((coords2.lng() - coords1.lng()) * p))/2;
  		return 12742 * Math.asin(Math.sqrt(a)); // 2 * R; R = 6371 km
}

function getBusStopRouteTooltip(stop){

}

function getBusTooltip(bus){
	var trip = bus.vehicle.trip.trip_id;
	var stopTimes = GTFSInterface.data.stop_times[trip];
	var nextStop = getNextStop(stopTimes);
	

	if (typeof nextStop == 'undefined')
		return "Bus #" + bus.id + " has completed its' route and is now out of service."; 
	else
		return "Bus #" + bus.id + " will arrive at Stop #" + nextStop.stop_id + " at " + nextStop.arrival_time;

}

function getNextStop(stopTimes){
	var nextStop;
	var timeToStop = 10000000;
	var tempTimeToStop;
	
	
	if(stopTimes){
		for(var time in stopTimes){
			tempTimeToStop = getTimeDifference(stopTimes[time].arrival_time);
			if(tempTimeToStop < timeToStop && tempTimeToStop >= 0){
				nextStop = stopTimes[time];
				timeToStop = tempTimeToStop;
			}
		}
		return nextStop;
}
else
	return "No next stop";

}

function getTimeDifference(time){
	var d = new Date();
	var datetext = d.toTimeString();
	datetext = datetext.split(' ')[0];

	var timeSplit = datetext.split(':'); 
	var stopTimeSplit = time.split(':');

	var secondsCurrent = (timeSplit[0] * 60 * 60) + (timeSplit[1] * 60) + timeSplit[2]; 
	var secondsStop = (stopTimeSplit[0] * 60 * 60) + (stopTimeSplit[1] * 60) + stopTimeSplit[2];
	
	return secondsStop - secondsCurrent;
}

function convertEpochTime(time){
	var date = new Date(time * 1000);
	var d1 = date.toString().split(" ");
	var d2 = d1[4];
	return d2;
}

function routingAlgorithm(origin_stop_id, destination_stop_id) {
    var origin_routes = getRoutes(origin_stop_id), 
        destination_routes = getRoutes(destination_stop_id),
        path = matchRoutes(origin_routes, destination_routes);

    console.log("Start routing", origin_routes, destination_routes);
    while (!path && origin_routes.length > 0) { 
        var append_routes = getIntersectingRoutes(origin_routes.shift()); 
        console.log("No match yet:", origin_routes, "+", append_routes);
        origin_routes.concat(append_routes); 
        path = matchRoutes(origin_routes, destination_routes);
    }

    console.log("Routing done:", origin_routes, destination_routes);

    
}

function getStopsArray(routes) {
    for (var i = 0; i < GTFSInterface.data.routes[7935].trips.length; i++) {
        var stops = GTFSInterface.data.stop_times[GTFSInterface.data.routes[7935].trips[i]];
        if (stops.hasOwnProperty("12453") && stops.hasOwnProperty("12443")) console.log(stops, GTFSInterface.data.routes[7935].trips[i]);
    }
}

function getIntersectingRoutes(route) {
    var routearray = [];
    var trip_ids = GTFSInterface.data.routes[route.route_id].trips;
    for (i = 0; i < trip_ids.length; i++) {
        for (var stop_id in GTFSInterface.data.stop_times[trip_ids[i]]) {
            var route_ids = GTFSInterface.data.stops[stop_id].routes;
            for (var j = 0; j < route_ids.length; j++) {
                routearray.push({route_id : route_ids[j], path: [route.route_id].concat(route.path) });
            }
        }
    }
    console.log("Intersections for", route, "are", routearray);
    return routearray;
}

function getRoutes(stop_id) {
    var routearray = [];
    var routes = GTFSInterface.data.stops[stop_id].routes
    for (var i = 0; i < routes.length ; i++) {
        routearray.push({route_id: routes[i], path: []});
    }
    console.log("Routes for", stop_id, "are", routearray);
    return routearray;
}

function matchRoutes(origin_routes, destination_routes) {
    for (var i = 0; i < origin_routes.length; i++) {
        for (var j = 0; j < destination_routes.length; j++) {
            if (origin_routes[i].route_id === destination_routes[j].route_id) {
                console.log("Match!:", origin_routes[i], destination_routes[j]);
                return origin_routes;
            }
        }
    }
}

