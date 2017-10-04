//this is going to google maps, which requires lat, lng (in that order)
function autocomplete(input, latInput, lngInput) {
	if (!input) return;

	var defaultBounds = new google.maps.LatLngBounds(
	  new google.maps.LatLng(33.9, -118.9),
	  new google.maps.LatLng(34.3, -118.1));

	var options = {
	  bounds: defaultBounds
	};

	const dropdown = new google.maps.places.Autocomplete(input, options);

	dropdown.addListener('place_changed', () => {
		const place = dropdown.getPlace();

		latInput.value = place.geometry.location.lat();
		lngInput.value = place.geometry.location.lng();
	});

	input.on('keydown', (e) => {
		if (e.keycode === 13) {
			e.preventDefault();
		}
	});

}

export default autocomplete;