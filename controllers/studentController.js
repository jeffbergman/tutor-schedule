const mongoose = require('mongoose');
const Student = mongoose.model('Student');
const User = mongoose.model('User');
const moment = require('moment');
const orderBy = require('lodash/orderBy');
const cloudinary = require('cloudinary');

//uploads photo
const multer = require('multer');

//resize photo
const jimp = require('jimp');

//add unique id to photo
const uuid = require('uuid');

const multerOptions = {
	//uploads photo into memory, we'll only store it once it's resized
	storage: multer.memoryStorage(),
	fileFilter: function ( req, file, next) {
		const isPhoto = file.mimetype.startsWith('image/');
		if (isPhoto) {
			next(null, true);
		} else {
			next({ message: "That filetype isn't allowed!" }, false);
		}
	}
}

exports.homePage = (req, res) => {
	res.render('index');
};

exports.upload = multer(multerOptions).single('photo'); 

exports.resize = async (req, res, next) => {
	//uploads the images to cloudinary and resizes them as part of the upload process
	//puts the url on the req.body to be saved in mongodb

	if (!req.file) {
		next();
		return;
	}

	const bufferStr = req.file.buffer.toString('base64');

	const cResp = await cloudinary.v2.uploader.upload(`data:${req.file.mimetype};base64,${bufferStr}`, 
			{ width: 300, height: 300, crop: 'limit', quality: 'auto' });

	req.body.photo = cResp.url;

	next();
}

function getStudentsNextLesson(students, req) {
	//find the student's next lesson, adjust the time to browser local time
	//and add that property to the student object

	//get the difference between the browser's utc offset and the server's.
	const timeAdjustment = calcTimeAdjustment(req);
	
	const updStudents = students.map(student => {
			
			//find the next lesson 
			const nextLesson = student.lessons.find(lesson => {
				return lesson > moment();
			});

			//adjust the time
			const nextLessonAdjusted = nextLesson ? moment(nextLesson).subtract(timeAdjustment, 'm') : '';
			student.nextLessonLocal = nextLessonAdjusted;
			return student;
	});

	return updStudents;
}


exports.getStudents = async (req, res) => {
	const page = req.params.page || 1;
	const limit = 6; 
	const skip = (page * limit) - limit;

	const studentsPromise = Student
		.find()
		.skip(skip)
		.limit(limit)
		.sort({ name: 'asc' });

	const countPromise = Student.count();

	let [students, count] = await Promise.all([studentsPromise, countPromise]);
	
	//adds a nextLessonLocal property to each student object
	students = getStudentsNextLesson(students, req);
	const pages = Math.ceil(count / limit);

	if (!students.length && skip) {
		req.flash('info', `You asked for page ${page}, but that doesn't exist. So I put you on page ${pages}.`);
		res.redirect(`/students/page/${pages}`);
		return;
	} 
	 
	res.render('students', { title: 'Students', students, page, pages, count });
}

exports.getStudentBySlug = async (req, res, next) => {
	
	//const student = await Student.findOne({ slug: req.params.slug }).populate('author notes');
	const student = await Student.findOne({ slug: req.params.slug }).populate('notes');

	if (!student) {
		return next();
	}

	//student.notes = massages.notesMassage(student.notes);
	student.notes = orderBy(student.notes, ['created'], ['desc']);

	res.render('student', { title: `${student.name}`, student: student });
}

function calcTimeAdjustment(req) {
	//the now.sh server has it's time set to utc, which creates an issue...
	//when we save a local time of 4pm, it converts it to 4pm utc
	//when that time comes back, it's interpreted by browser javascript in LA as 9AM
	//
	//this calculates the difference between those offsets
	//
	//here's a kludgey fix... the very first time someone visits this site, the cookies 
	//are not set, so the times are off by 7 hours (in LA), 
	//therefore we'll assume LA and default to -420. It'll happen only once 

	const browserUtcOffset = req.cookies.browserUtcOffset ? 
														parseInt(req.cookies.browserUtcOffset) : -420;

	const timeAdjustment = moment().utcOffset() - browserUtcOffset;

	return timeAdjustment;
}

function adjustSaveLessonTime(lessons, timeAdjustment) {
	//this may be a kludgey fix, but I couldn't make anything else work
	//(given that we're not just passing back JSON, but also using serverside templates)
	//it adds the time difference between the browsers utc offset and the server's utc offset
	//to the lesson time before saving it. This should work whether it's running on localhost
	//or on now.sh, or whatever.

	return lessons.map(lesson => moment(lesson).add(timeAdjustment, 'm'));
}

exports.addStudent = async (req, res) => {
	
	const tutors = await User.find().sort({ name: 'asc' });
	res.render('editStudent', { title: 'Add Student', tutors });
}

exports.createStudent = async (req, res) => {
	
	req.body.createdBy = req.user._id;
	const passedLessons = req.body.lessons ? req.body.lessons.split("; ") : [];
	
	//get the difference between the browser's utc offset and the server's.
	const timeAdjustment = calcTimeAdjustment(req);

	//adds that difference to each lesson date
	const adjustedLessons = adjustSaveLessonTime(passedLessons, timeAdjustment);
	req.body.lessons = adjustedLessons;

	const student = new Student(req.body);
	await student.save();

	req.flash('success', `Successfully created ${student.name}. <a href="/students/${student.slug}">View Page</a>`);
	res.redirect(`/students/${student._id}/edit`)
}

exports.editStudent = async (req, res) => {
	// selects the student and renders the edit student page 
	
	const student = await Student.findOne({ _id: req.params.id });
	
	const tutors = await User.find().sort({ name: 'asc' });

	res.render('editStudent', { title: `Edit ${student.name}`, student, tutors });
}



exports.updateStudent = async (req, res) => {
	
	const passedLessons = req.body.lessons ? req.body.lessons.split("; ") : [];
	
	//get the difference between the browser's utc offset and the server's.
	const timeAdjustment = calcTimeAdjustment(req);
	const adjustedLessons = adjustSaveLessonTime(passedLessons, timeAdjustment);
	req.body.lessons = adjustedLessons;
	req.body.location.type = 'Point';

	//this method takes, query, data, and options
	const student = await Student.findOneAndUpdate({ _id: req.params.id }, req.body, {
		new: true,  //returns the updated student
		runValidators: true //runs the required validators we set up in the schema
	}).exec();
	req.flash('success', `Successfully updated ${student.name}. <a href="/students/${student.slug}">View Page</a> `);
	res.redirect(`/students/${student._id}/edit`)
}

/* schedule helpers */

async function getTutorLessonDates(tutorID) {

	const dates = await Student.aggregate([
		{ $match: { tutor: tutorID } },
		{ $unwind: '$lessons' },
		{ $project: 
			{
				name: "$name",
				lesson: "$lessons" //,
			}
		},
		{ $sort: { lesson: 1 } }
	]);

	const lessonDates = dates.map(item => item.lesson);

	return lessonDates;
}

async function getTutorStudentsByDay(tutorID, dayOfYear, timeAdjustment) {
	/* 	Lesson local subtracts the time difference between the server and the browser
			so that it displays properly when formatted at the server and served 
			through the pug template.

			dayOfYear is conditionally adjusted because, for example, 
			when the user saves a 7pm lesson Pacific time, it's stored as 2AM the next day UTC
			but we want to match it as today.
	*/
	
	const students = await Student.aggregate([
		{ $match: { tutor: tutorID } },
		{ $unwind: '$lessons' },
		{ $project: 
			{
				name: "$name",
				test: "$currTest",
				lesson: "$lessons",
				lessonLocal: { $subtract: [ "$lessons", timeAdjustment * 60 * 1000 ] }, 
				dayOfYear: {
					$cond: { 
						if: { $lte: [ { $hour: '$lessons'}, timeAdjustment / 60 ] }, 
						then: { $subtract: [ { $dayOfYear: "$lessons" }, 1 ] }, 
						else: { $dayOfYear: "$lessons" } 
					}
				},
				location: "$location",
				slug: '$slug',
				photo: '$photo'
			}
		},
		{ $match: { dayOfYear: dayOfYear } },
		{ $sort: { lesson: 1 } }
	]);

	return students;
}

/* schedule helpers end */



exports.getScheduleAPI = async (req, res) => {
	//ajax call, query has tutor and date, 
	//optional getDates to send new lesson dates,
	//which are needed if the tutor has changed

	//only for logged in users
	if (!req.user) {
		return next();
	}

	//const uid = req.query.tutor;
	const uid = req.query.tutor ? mongoose.Types.ObjectId(req.query.tutor) : req.user._id;
	const dayOfYear = moment(req.query.date).dayOfYear();
	const timeAdjustment = calcTimeAdjustment(req);
	
	const students = await getTutorStudentsByDay(uid, dayOfYear, timeAdjustment);

	let lessonDates = [];

	if (req.query.getDates === 'true') {
		lessonDates = await getTutorLessonDates(uid);
	} 

	res.json({
	    lessonDates,
	    students
	});

}

exports.getSchedule = async (req, res) => {
	//schedule page coming back from server 
	//starts with user's lesson dates and students for today

	var today;

	//only for logged in users
	if (!req.user) {
		return next();
	}

	//admin user can see schedule for all tutors
	let tutors = null;
	if (req.user.admin) {
		tutors = await User.find().sort({ name: 'asc' });
	}
	
	const uid = req.user._id;
	const lessonDates = await getTutorLessonDates(uid);
	
	const timeAdjustment = calcTimeAdjustment(req);
	
	//when we pass today, we want to pass the browser's today, not the server's
	if (moment().hour() < timeAdjustment / 60) {
		const adjMoment = moment().subtract(timeAdjustment, 'm')
		today = adjMoment.dayOfYear();
	} else {
		today = moment().dayOfYear();
	}
	
	const students = await getTutorStudentsByDay(uid, today, timeAdjustment);
	
	res.render('schedule', { title: 'Schedule', students, lessonDates, tutors });
		
}



