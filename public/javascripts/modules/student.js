import { loadPlaces } from './map';

export function makeMapSingle(mapDiv) {
	if (!mapDiv) return;

	const students = mapDiv.getAttribute("data-students");
	if (students) {
		let studentArray = [];
		studentArray.push(JSON.parse(students));
		loadPlaces(mapDiv, studentArray);
	}
	
}