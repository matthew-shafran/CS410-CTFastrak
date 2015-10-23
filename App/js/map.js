/* Map Javascript file */

var map;
function initMap() {
  map = new google.maps.Map(document.getElementById('map'), {
    center: {lat: 41.6750, lng: -72.7872},
    zoom: 8
  });
}