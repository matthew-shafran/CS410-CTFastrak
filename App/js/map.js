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
       for (var i = 0; i < MapInterface.routestops.length; i++) {
           var stop_id = MapInterface.routestops[i].stop_id;
           var newdist = distance(MapInterface.busterminals[stop_id].marker.position, MapInterface.traveler.position);
           if (newdist < dist) {
               dist = newdist;
               nearest_stop_id = stop_id;
           }
       }
       return MapInterface.busterminals[nearest_stop_id];
    },
    drawDirections : function(destination) {
        if (MapInterface.route) {
            MapInterface.directions_renderer.setOptions({polylineOptions:{strokeColor:MapInterface.route.strokeColor}});
            MapInterface.route.setMap(null);
        }

        var nearestTerminal = MapInterface.getNearestTerminal();
        
        if (MapInterface.routestops) {

        }


        // Route walking directions to nearest stop
        MapInterface.directions.route({
            origin: MapInterface.traveler.position, 
            destination: nearestTerminal.marker.position,
            travelMode: google.maps.TravelMode.WALKING
        }, function (response, status) {
            MapInterface.directions_renderer_walk.setDirections(response);

            // Route transit directions to destination
            MapInterface.directions.route({
                origin: nearestTerminal.marker.position,
                destination: destination.position,
                travelMode: google.maps.TravelMode.DRIVING
            }, function(response, status) {
                MapInterface.directions_renderer.setDirections(response);
            });
        });
    },
    drawRoutes : function() {
        for (var trip_id in MapInterface.trips) {
            if (trip.trip_update.trip.route_id) {
                
            }
            var trip = MapInterface.trips[trip_id];
            var color = "#"+GTFSInterface.data.routes[trip.trip_update.trip.route_id].route_color;
            var shape_id = GTFSInterface.data.trips[trip_id].shape_id;
            var shape = GTFSInterface.data.shapes[shape_id];
            shape.color = color;

            var stops = trip.trip_update.stop_time_update;

            MapInterface.drawRoute(shape, stops, true);
        }
    },
    drawRoute : function(route, stops, hideMarkers) {

        /*if (MapInterface.route) MapInterface.route.setMap(null);
        if (MapInterface.routestops) {
            for (var i = 0; i < MapInterface.routestops.length; i++) {
                MapInterface.busterminals[MapInterface.routestops[i].stop_id].marker.setVisible(false);
            }
        }*/

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
        MapInterface.routes.push({path:routePath,stops:stops});
        //MapInterface.route = routePath;
        routePath.setMap(MapInterface.map);
        
        // Draw stops measles
        if (!hideMarkers) {
            //MapInterface.routestops = stops;
            for (var i = 0; i < stops.length; i++) {
                var newicon = MapInterface.busterminals[stops[i].stop_id].marker.icon;
                newicon.fillColor = route.color;
                MapInterface.busterminals[stops[i].stop_id].marker.setIcon(newicon);
                MapInterface.busterminals[stops[i].stop_id].marker.setVisible(true);
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
            title : 'Bus ' + bus.id,
            content : 'Bus ' + bus.id,
            
            // Callback function for when clicking on this marker
            callback : function() {
                var color = "#"+GTFSInterface.data.routes[bus.vehicle.trip.route_id].route_color;
                var trip_id = bus.vehicle.trip.trip_id;
                var shape_id = GTFSInterface.data.trips[trip_id].shape_id;
                var shape = GTFSInterface.data.shapes[shape_id];
                shape.color = color;
                var stops = MapInterface.trips[trip_id].trip_update.stop_time_update;
                MapInterface.drawRoute(shape, stops); 
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
                MapInterface.drawDirections(this);
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

function 
