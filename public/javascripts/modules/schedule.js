import { $, $$ } from './bling';
import axios from 'axios';
import dompurify from 'dompurify';
import moment from 'moment';
import { loadPlaces } from './map';

var googleMap;
var selectedTutor = '';
var selectedDate = null;
var scheduleTable;
var fpCal = null;
var dateArrayForCal;

//main function of this module, instantiates the fp Calendar
function schedule(input) {

	if (!input) return;

	//the flatpickr calendar is on the schedule page and the add/edit student page
	const page = input.getAttribute("data-page");
	
	//set up the flatpickr
	fpCal = flatpickr(input, {
    enableTime: (page === 'edit') ? true : false,
    mode: "multiple",
    inline: true,

    onChange: function(selectedDates, dateStr, instance) {
    	
    	//on add/edit page we let the calendar do it's own thing
    	//on the schedule page we force it to act like it's read only
    	if (page !== 'schedule') return;
    	
			//reload the dates here, otherwise clicking on a selected date deselects it
			selectedDate = instance.latestSelectedDateObj;
  		instance.setDate(dateArrayForCal, false);

  		//this keeps it on the month the date was selected from
  		instance.jumpToDate(selectedDate);

  		getData(selectedTutor, selectedDate, false)
    }
  });

  
	//puts the dates in the calendar
	const lessons = input.getAttribute("data-lessons");
	dateArrayForCal = getLessonsArray(lessons);

	if (dateArrayForCal) {
		fpCal.setDate(dateArrayForCal, false);
	}

	//when the calendar is on the schedule page
	if (page === 'schedule') {

		$('.page-heading').textContent = `${moment().format("dddd, MMMM Do, YYYY")}`;
	  
	  //show the students on the map
	  const mapDiv = $('#map');
		
		const students = mapDiv.getAttribute("data-students");
		
		//do this even if there are no students because it creates the map
		const studentArray = students ? JSON.parse(students) : [];
		loadPlaces(mapDiv, studentArray);
		
		//we'll show that day's schedule here
		scheduleTable = $('.sched__table');
		
		//present only if user is an admin
		//add listener and get new data when the tutor changes
		const selectTutor = $('.sched__tutor-select');	
		
		if (selectTutor) {
			selectedTutor = selectTutor.value;

			selectTutor.on('change', (e) => {
				selectedTutor = selectTutor.value;
				getData(selectedTutor, selectedDate, true)
				
			});
		}
	}
	
};


function getLessonsArray(lessons) {
	let arr = [];

	if (!lessons) return null;

	if (typeof lessons === "string") {
		arr = lessons.split(',');
	} else {
		arr = lessons;
	}
	
	const dateArray = arr.map(item => {
		var d = Date.parse(item);
		return d;
	});

	return dateArray;
};

function scheduleResultsHTML(students) {
	var table = '<table class="table"><tbody>';
	

	const rows = students.map(student => {
		const photo = student.photo || '/uploads/generic.png';
  	return `<tr>
  						<td>${moment(student.lesson).format("h:mm a")}</td>
  						<td>
  							<a href="/students/${student.slug}"><img class="avatar" src="${photo}"></a>
							</td>
  						<td>
  							<a href="/students/${student.slug}">${student.name}</a>
  						</td>
  						<td>${student.test}</td>
  					</tr>`;
    
  }).join('');

  table = table + rows + '</tbody></table>';
  return table;
}

function getData(tutor, date, getDates = false) {
	//getDates true when called from selectTutor onChange
	//because that tutor's dates will have to be loaded in the calendar
	
	if (!date) {
		date = fpCal.now;
	}
	
	const qryDate = moment(date).format("YYYYMMDD");
	
	axios
	  .get(`/api/schedule?tutor=${tutor}&date=${qryDate}&getDates=${getDates}`)
	  
	  .then(res => {

	  	if (getDates) {
	  		dateArrayForCal = getLessonsArray(res.data.lessonDates);
	  		fpCal.setDate(dateArrayForCal, false);
				fpCal.jumpToDate(date);
	  	}
	  	
	  	$('.page-heading').textContent = `${moment(date).format("dddd, MMMM Do, YYYY")}`;
	    
	  	const scheduleInfo = res.data.students.length ?
	  		scheduleResultsHTML(res.data.students) :
	  		`<p class="sched__no-results">No students scheduled</p>`;

	    scheduleTable.innerHTML = dompurify.sanitize(scheduleInfo);

	    //creates map with student locations, or resets map
	    loadPlaces($('#map'), res.data.students);
	    
	  })
	  .catch(err => {
	    console.error(err);
		});	
}


export default schedule;