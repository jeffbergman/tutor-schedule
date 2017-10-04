const mongoose = require('mongoose');
const Schema = mongoose.Schema;
mongoose.Promise = global.Promise;
const md5 = require('md5');
const validator = require('validator');
const mongodbErrorHandler = require('mongoose-mongodb-errors');
const passportLocalMongoose = require('passport-local-mongoose');

const userSchema = new Schema({
	email: {
		type: String,
		unique: true,
		lowercase: true,
		trim: true,
		validate: [validator.isEmail, 'Invalid Email Address'],
		required: 'Please enter an email address'
	},
	name: {
		type: String,
		trim: true,
		required: 'Please enter a name'
	},
	admin: {
		type: Boolean,
		default: false
	},
	resetPasswordToken: String,
	resetPasswordExpires: Date
});



userSchema.index({
	name: 1
});

userSchema.plugin(passportLocalMongoose, { usernameField: 'email' });
userSchema.plugin(mongodbErrorHandler);

module.exports = mongoose.model('User', userSchema);