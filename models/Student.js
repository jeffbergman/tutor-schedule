const mongoose = require('mongoose');

//this is the built in ES6 promise
mongoose.Promise = global.Promise;

//allows us to make url friendly slug names
const slug = require('slugs');

const validator = require('validator');

const studentSchema = new mongoose.Schema({
	//property names have to match field names of posted forms
	name: {
		type: String,
		trim: true,
		required: 'Please enter a name!'
	},
	slug: String,
	created: {
		type: Date,
		default: Date.now

	},
	location: {
		type: {
			type: String,
			default: 'Point'
		},
		//note that Mongo requires long, lat (in that order)
		coordinates: [{
			type: Number,
			required: 'You must supply coordinates!'
		}],
		address: {
			type: String,
			required: 'You must supply an address!'
		}
	},
	phone: {
		type: String,
		trim: true,
		validate: {
	    validator: function(v) {
	      return /^(1|1 |1-|1.)?(\d{3}|\(\d{3}\))[-. ]?\d{3}[-. ]?\d{4}$/.test(v);
	    },
	    message: 'Invalid phone number!'
	  },
		required: 'Please enter a mobile phone number.'
	},
	email: {
		type: String,
		unique: true,
		lowercase: true,
		trim: true,
		validate: [validator.isEmail, 'Invalid Email Address'],
		required: 'Please enter an email address'
	},
	photo: String,
	tutor: {
		type: mongoose.Schema.ObjectId,
		ref: 'User'
	},
	createdBy: {
		type: mongoose.Schema.ObjectId,
		ref: 'User'
	},
	lessons: [Date],
	currTest: String
},
{ //really only necessary for debugging, because the virtuals are there
	//without this, you couldn't see them in student, only when you say student.reviews
	toJSON: { virtuals: true },
	toObject: { virtuals: true }
}
);

//creates a combined index of these 2 fields
studentSchema.index({
	name: 1
});

studentSchema.index({
	location: '2dsphere'
});

studentSchema.pre('save', async function(next) {
	if (!this.isModified('name')) {
		return next();
	}
	this.slug = slug(this.name);

	// make sure slugs are unique
	const slugRegEx = new RegExp(`^(${this.slug})((-[0-9]*$)?)$`, 'i');

	//this.constructor resolves to Student once it runs
  const studentsWithSlug = await this.constructor.find({ slug: slugRegEx });
  if(studentsWithSlug.length) {
    this.slug = `${this.slug}-${studentsWithSlug.length + 1}`; 
  }
  next(); 
});




//this comes from Mongoose, so we can't use it in an aggregate function, 
//which is in Mongodb
//It's like a sql join to get the reviews associated with the student
//means we don't have to keep an array of review id's in the schema
//the first argument, 'reviews', is our choice, it's what we want to call 
//the field name or property name
studentSchema.virtual('notes', {
	ref: 'Note',
	localField: '_id',
	foreignField: 'student'
})



function autopopulate(next) {
	this.populate('reviews');
	this.populate('tutor');
	next();
}

studentSchema.pre('find', autopopulate);
studentSchema.pre('findOne', autopopulate);


module.exports = mongoose.model('Student', studentSchema);