/* CTFastrak project */

/* JSONInterface
 * Has functions for getting JSON data from the CTFastrak JSON API.
 *
 *
 */
var JSONInterface = {
    API : 'http://65.213.12.244/realtimefeed/externalfeed/trapezerealtimefeed.json',
    getBuses : function(callback) {

    },
    getBusTerminals : function(callback) {

    },
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
    init: function() {
        this.foo = '';
        return this;
    }
}.init();

/* GTFSInterface
 * Has functions for getting JSON data from the GISData wrapper of the GTFS feed from the CTFastrak GTFS API.
 *
 *
 */
var GTFSInterface = {
    data : {},
    getData : function(callback) {
        (function(_GTFSInterface) {
            d3.csv("data/csv/agency.txt", function(data) { 
                _GTFSInterface.data.agency = {}
                for (var i = 0; i < data.length; i++) {
                    _GTFSInterface.data.agency[data[i].agency_name.substr(data[i].agency_name.indexOf("- ") + 2)] = data[i];
                }
            });
            d3.csv("data/csv/calendar_dates.txt", function(data) { 
                _GTFSInterface.data.calendar_dates = data;
            
            });
            d3.csv("data/csv/calendar.txt", function(data) { 
                _GTFSInterface.data.calendar = {}
                for (var i = 0; i < data.length; i++) {
                    _GTFSInterface.data.calendar[data[i].service_id] = data[i];
                }
            });
            d3.csv("data/csv/routes.txt", function(data) { 
                _GTFSInterface.data.routes = {}
                for (var i = 0; i < data.length; i++) {
                    _GTFSInterface.data.routes[data[i].route_id] = data[i];
                }
            });
            d3.csv("data/csv/shapes.txt", function(data) { 
                _GTFSInterface.data.shapes = {}
                for (var i = 0; i < data.length; i++) {
                    if (!(_GTFSInterface.data.shapes.hasOwnProperty(data[i].shape_id))) {
                        _GTFSInterface.data.shapes[data[i].shape_id] = [];
                    } 
                    _GTFSInterface.data.shapes[data[i].shape_id].push(data[i]);
                }
            });
            d3.csv("data/csv/stop_times.txt", function(data) { 
                _GTFSInterface.data.stop_times = {}
                for (var i = 0; i < data.length; i++) {
                    if (!(_GTFSInterface.data.stop_times.hasOwnProperty(data[i].trip_id))) {
                        _GTFSInterface.data.stop_times[data[i].trip_id] = {}
                    }
                    _GTFSInterface.data.stop_times[data[i].trip_id][data[i].stop_id] = data[i];
                }
            });
            d3.csv("data/csv/stops.txt", function(data) { 
                _GTFSInterface.data.stops = {}
                for (var i = 0; i < data.length; i++) {
                    _GTFSInterface.data.stops[data[i].stop_id] = data[i];
                }
            });
            d3.csv("data/csv/trips.txt", function(data) { 
                _GTFSInterface.data.trips = {}
                for (var i = 0; i < data.length; i++) {
                    _GTFSInterface.data.trips[data[i].trip_id] = data[i];
                }
            });
        })(this);
    },
    format : function(data) {
        // Format the GTFS data to return an array of buses
        var buses = [];
        for (var i = 0; i < data.features.length; i++) {
            var bus = data.features[i];
            buses.push({
                position : {
                    latitude : bus.properties.latitude,
                    longitude : bus.properties.longitude,
                },
                timestamp : bus.properties.timestamp ,
                trip : {
                    route_id : bus.properties.route_id,
                    start_date : bus.properties.state_date,
                    trip_id : bus.properties.trip_id
                },
                vehicle : {
                    id : bus.properties.id,
                    label : bus.properties.label
                }
            });
        }
        return buses;
    },
    init: function() {
        this.foo = '';
        return this;
    }

}.init();

/* MapInterface
 * Has functions for manipulating the Google Maps interface object.
 *
 *
 */
var MapInterface = {
    buses : {},
    busterminals : {},
    trips: {},
    markers: [],
    updateMap : function() {
        (function(_mapInterface) {
            JSONInterface.getData(function(data) {
                for (var i = 0; i < data.length; i++) {
                    // Bus Object
                    if (data[i].vehicle !== null) {
                        var bus = data[i];
                        if (_mapInterface.buses.hasOwnProperty(bus.id)) {
                            _mapInterface.updateBus(bus);
                        } else {
                            _mapInterface.createBus(bus);
                        }
                    } 
                    // Trip/Route Object
                    else if (data[i].trip_update !== null) {
                        var trip = data[i];
                        if (_mapInterface.trips.hasOwnProperty(trip.id)) {
                            _mapInterface.updateTrip(trip);
                        } else {
                            _mapInterface.createTrip(trip);
                        }
                    }
                }
            });
        })(this);
    },
    createMarker : function(data) {
        var marker = new google.maps.Marker({
            position: data.position,
            map: this.map,
            icon: data.icon,
            title: data.title 
        });
       
        marker.infoWindow = new google.maps.InfoWindow({
            content: data.content, 
            pixelOffset: data.iconOffset,
            maxWidth: 200
        });
      
        (function(_mapInterface) {
            marker.addListener('mouseover', function() {
                _mapInterface.closeMarkers();
                marker.infoWindow.open(_mapInterface.map, marker);
            });
            marker.addListener('click', data.callback);
        })(this);

        this.markers.push(marker);
        return marker;
    },
    closeMarkers : function() {
        for (var i = 0; i < this.markers.length; i++) {
            this.markers[i].infoWindow.close();
        }
    },
    handleLocationError : function(browserHasGeolocation) {
        alert(browserHasGeolocation ? 'Error: The Geolocation service failed.' : 'Error: Your browser doesn\'t support geolocation.');
    },
    drawRoute : function(route) {
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
            strokeColor: '#FF0000',
            strokeOpacity: 1.0,
            strokeWeight: 2
        });
        routePath.setMap(MapInterface.map);
    },
    createBus : function(bus) {
        (function(_mapInterface) {
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
                callback : function() { 
                    var color = "#"+GTFSInterface.data.routes[bus.vehicle.trip.route_id].route_color;
                    var trip_id = bus.vehicle.trip.trip_id;
                    var shape_id = GTFSInterface.data.trips[trip_id].shape_id;
                    var route = GTFSInterface.data.shapes[shape_id];
                        console.log(trip_id, shape_id, _mapInterface);
                    _mapInterface.drawRoute(route); 
                }
            }

            bus.marker = _mapInterface.createMarker(busmarker);
            _mapInterface.buses[bus.id] = bus;
        })(this);
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
                url : 'img/measle_blue.png',
                size: new google.maps.Size(7,7),
                origin: new google.maps.Point(0,0),
                anchor: new google.maps.Point(3,3),
            },
            iconOffset : new google.maps.Size(0,0),
            title : bus_terminal.stop_name + " (#" + bus_terminal.stop_id + ")",
            content : bus_terminal.stop_name + " (#" + bus_terminal.stop_id + ")"
        }

        bus_terminal.marker = this.createMarker(bus_terminal_marker);
        this.busterminals[bus_terminal.stop_id] = bus_terminal;
    },
    updateBusTerminal : function() {

    },
    centerMap : function() {
        if (navigator.geolocation) {
            (function(_mapInterface){
                navigator.geolocation.getCurrentPosition(function(position) {
                    var position = {
                        lat: position.coords.latitude,
                        lng: position.coords.longitude
                    }

                    var traveler_marker  = {
                        position : position,
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

                    _mapInterface.createMarker(traveler_marker);

                    _mapInterface.map.setCenter(position);
                }, 
                function() {
                    _mapInterface.handleLocationError(true);
                });
            })(this);
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

        (function(_mapInterface) {
            _mapInterface.map.addListener('click', function() { _mapInterface.closeMarkers(); });
            _mapInterface.updateInterval = setInterval(function() { _mapInterface.updateMap(); }, 30000);
            
            // Load the GTFS static data
            GTFSInterface.getData(function() { });
            
            
            // Load the static bus stop locations
            $.getJSON('data/stops.json', function(data) { 
                for (var stop_id in data) {
                    //_mapInterface.createBusTerminal(data[stop_id]);
                }
            }); 
        })(this);

        // Try HTML5 geolocation.
        this.centerMap();    
        this.updateMap();
    }
};


function testShapes() {
    d3.csv("googleha_transit/shapes.txt", function(data) { 
        var sequenceNum = 0;
        var shapeCoordinates = [];
        for (var i = 0; i < data.length; i++) {
            if (i != 0 && data[i].shape_id !== data[i-1].shape_id) {
                console.log("new sequence", shapeCoordinates);
                var shapePath = new google.maps.Polyline({
                    path: shapeCoordinates,
                    geodesic: true,
                    strokeColor: '#FF0000',
                    strokeOpacity: 1.0,
                    strokeWeight: 2
                });
                shapePath.setMap(MapInterface.map);
                shapeCoordinates = []; 
                break;
            }
            shapeCoordinates.push({
                lat: parseFloat(data[i].shape_pt_lat),
                lng: parseFloat(data[i].shape_pt_lon)
            });
            sequenceNum = data[i].shape_pt_sequence;
        }
    });
}
