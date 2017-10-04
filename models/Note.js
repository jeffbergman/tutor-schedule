const mongoose = require('mongoose');
const Schema = mongoose.Schema;
mongoose.Promise = global.Promise;

const noteSchema = new Schema({
	created: {
		type: Date,
		default: Date.now
	},
	author: {
		type: mongoose.Schema.ObjectId,
		ref: 'User',
		required: 'You must supply an author.'
	},
	student: {
		type: mongoose.Schema.ObjectId,
		ref: 'Student',
		required: 'You must supply a student.'
	},
	text: {
		type: String,
		required: 'Your review must have text.'
	}
});

function autopopulate(next) {
	this.populate('author');
	next();
}

noteSchema.pre('find', autopopulate);
noteSchema.pre('findOne', autopopulate);

module.exports = mongoose.model('Note', noteSchema);