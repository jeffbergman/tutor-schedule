//this is where webpack is bundling from
import '../sass/style.scss';
import moment from 'moment';
import { $, $$ } from './modules/bling';
import autocomplete from './modules/autocomplete';
import schedule from './modules/schedule';
import { makeMapSingle } from './modules/student';

//so the server knows when 'now' is from the user's pov 
document.cookie = "browserUtcOffset=" + moment().utcOffset() + 
	";expires=Mon, 31 Dec 2018 12:00:00 UTC;path=/"; 

//this is going to google maps, which requires lat, lng (in that order)
autocomplete( $('#address'), $('#lat'), $('#lng') );
makeMapSingle( $('#map-single') );
schedule( $('.cal-date') );


	
