import axios from 'axios';
import { $ } from './bling';
import moment from 'moment';

const mapOptions = {
  center: { lat: 34.067, lng: -118.39 },
  zoom: 12
};

var markers = [];

export function loadPlaces(mapDiv, places = []) {
  //places a marker at each student's address

  const map = makeMap(mapDiv);

  if (!map) return;

  //reset the markers
  markers = markers.map(marker => marker.setMap(null));
  markers = [];
  map.setOptions(mapOptions);
  
  //there are no students, return
  if (!places.length) return;
  
  const bounds = new google.maps.LatLngBounds();
  const infoWindow = new google.maps.InfoWindow({maxWidth: 200});
  
      
  // for each student, make a marker and extend the map bounds
  markers = places.map(place => {
    
    const [placeLng, placeLat] = place.location.coordinates;
    const position = { lat: placeLat, lng: placeLng };
    bounds.extend(position);
    
    const marker = new google.maps.Marker({ 
      map, 
      position,
      label: place.name.charAt(0)
    });
    
    
    marker.place = place;
    return marker;
  });
      
  // when someone clicks on a marker, show the details of that place
  markers.forEach(marker => marker.addListener('click', function() {
    const student = this.place;
    //kludge that should work if student is in US
    const addr = student.location.address.substr(0, student.location.address.length - 19)
    const lastCommaPos = addr.lastIndexOf(",");
    const street = addr.substr(0, lastCommaPos);
    const city = addr.substr(lastCommaPos + 2);
    const photo = student.photo || '/uploads/generic.png';
    const html = `
      <div class="popup">
        <div>
          <a href="/students/${student.slug}">
            <img class="avatar" src="${photo}" alt="${student.name}" />
          </a>
        </div>
        <div>
          <div>
            <a href="/students/${student.slug}">${student.name}</a>
          </div>
          <div>
            ${street}
          </div>
          <div>
            ${city}
          </div>
        </div>
      </div>
    `;
    infoWindow.setContent(html);
    infoWindow.open(map, this);
  }));
  
      
  // then zoom the map to fit all the markers perfectly
  if (places.length === 1) {
    map.setCenter(bounds.getCenter());
    map.setZoom(14);
  } else {
    map.setCenter(bounds.getCenter());
    map.fitBounds(bounds);
  }
  
}

export function makeMap(mapDiv) {
  if (!mapDiv) return;
  
  const map = new google.maps.Map(mapDiv, mapOptions); 
  
  return map;
}


