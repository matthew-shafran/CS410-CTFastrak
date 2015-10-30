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
                console.log(data);
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
    handleLocationError : function(browserHasGeolocation, infoWindow, pos) {
        infoWindow.setPosition(pos);
        infoWindow.setContent(browserHasGeolocation ?
                            'Error: The Geolocation service failed.' :
                            'Error: Your browser doesn\'t support geolocation.');
    },
    createBus : function(bus) {
        var marker = new google.maps.Marker({
            position: {lat: bus.vehicle.position.latitude, lng: bus.vehicle.position.longitude },
            map: this.map,
            icon: {
                url: 'img/largebus.png',
                size: new google.maps.Size(560,182),
                origin: new google.maps.Point(0,0),
                anchor: new google.maps.Point(25,8),
                scaledSize: new google.maps.Size(50,16)
            },
            title: 'Bus #' + bus.id
        });
       
        var infoWindow = new google.maps.InfoWindow({
            content: 'Bus ' + bus.id,
            maxWidth: 200
        });
      
        marker.addListener('click', function() {
            infoWindow.open(this.map, marker);
        });

        this.buses[bus.id] = marker;
    },
    updateBus : function(bus) {
        var position = new google.maps.LatLng(bus.vehicle.position.latitude, bus.vehicle.position.longitude);
        this.buses[bus.id].setPosition(position);
    },
    createTrip : function(trip) {
        // TODO figure out how to display this/what data to keep
        this.trips[trip.id] = trip;
    },
    updateTrip : function(trip) {
        // TODO figure out if updating is different from creating
        this.trips[trip.id] = trip;
    },
    createBusTerminal : function() {

    },
    updateBusTerminal : function() {

    },
    centerMap : function() {
        if (navigator.geolocation) {
            (function(_mapInterface){
                navigator.geolocation.getCurrentPosition(function(position) {
                    var pos = {
                        lat: position.coords.latitude,
                        lng: position.coords.longitude
                    };

                    _mapInterface.infoWindow.setPosition(pos);
                    _mapInterface.infoWindow.setContent('Location found.');
                    _mapInterface.map.setCenter(pos);
                }, 
                function() {
                    _mapInterface.handleLocationError(true, _mapInterface.infoWindow, _mapInterface.map.getCenter());
                });
            })(this);
        } else {
            this.handleLocationError(false, this.infoWindow, this.map.getCenter());
        }
    },
    init: function() {
        this.map = new google.maps.Map(document.getElementById('map'), {
            //TODO rewrite these hard-coded coordinates
            center: {lat: 41.6750, lng: -72.7872},
            zoom: 15
        });

        this.infoWindow = new google.maps.InfoWindow({map: this.map});

        // Try HTML5 geolocation.
        this.centerMap();    
        this.updateMap();
        
        (function(_mapInterface) {
            _mapInterface.updateInterval = setInterval(function() { _mapInterface.updateMap(); }, 30000);
        })(this);
    }
};

// Let Google Maps API know how to initialize.
function initMap() { MapInterface.init(); };
