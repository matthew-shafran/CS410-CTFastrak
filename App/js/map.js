/* CTFastrak project */

/* JSONInterface
 * Has functions for getting JSON data from the CTFastrak JSON API.
 *
 *
 */
var JSONInterface = {
    API : 'http://whateverorigin.org/get?url=' + encodeURIComponent('http://65.213.12.244/realtimefeed/externalfeed/trapezerealtimefeed.json') + '&callback=?',
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
        return data.contents.entity;
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
    API : 'http://gisdata.hartford.gov/datasets/453fb4c1dff74efdbdb46fadfd257e28_0.geojson',
    getBuses : function(callback) {

    },
    getBusTerminals : function(callback) {

    },
    getData : function(callback) {
        (function(_GTFSInterface) {
            $.getJSON(_GTFSInterface.API, function(data) { 
                callback(_GTFSInterface.format(data)); 
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
            marker.addListener('click', function() {
                _mapInterface.closeMarkers();
                marker.infoWindow.open(_mapInterface.map, marker);
            });
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
        }

        bus.marker = this.createMarker(busmarker);
        this.buses[bus.id] = bus;
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
            
            // Load the static bus stop locations
            $.getJSON('data/stops.json', function(data) { 
                for (var stop_id in data) {
                    _mapInterface.createBusTerminal(data[stop_id]);
                }
            }); 
        })(this);

        // Try HTML5 geolocation.
        this.centerMap();    
        this.updateMap();
    }
};

// Let Google Maps API know how to initialize.
function initMap() { MapInterface.init(); };
