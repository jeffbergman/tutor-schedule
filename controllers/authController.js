const passport = require('passport');
const crypto = require('crypto');
const mongoose = require('mongoose');
const User = mongoose.model('User');
const promisify = require('es6-promisify');
const mail = require('../handlers/mail');

/* Note about passport

	passport puts the logout(), isAuthenticated(), and other methods on req
	and also handles the session for authentication so we don't have to
*/

exports.login = passport.authenticate('local', {
  failureRedirect: '/login',
  failureFlash: 'Failed Login!',
  successRedirect: '/',
  successFlash: 'You are now logged in!'
});

exports.logout = (req, res) => {
	req.logout();
	req.flash('success', 'You are now logged out');
	res.redirect('/');
}

exports.isLoggedIn = (req, res, next) => {
	if (req.isAuthenticated()) {
		return next();
	}
	req.flash('error', 'Ruh-roh! You must be logged in to do that!');
	res.redirect('/login');
}

exports.forgot = async (req, res) => {
	// see if a user exists with that email
	const user = await User.findOne({ email: req.body.email });
	if (!user) {
		req.flash('error', 'No user exists with that email');
		return res.redirect('/login');
	}

	// set reset token and expiration on their account
	user.resetPasswordToken = crypto.randomBytes(20).toString('hex');
	user.resetPasswordExpires = Date.now() + 3600000;
	await user.save();

	// send them an email
	const resetURL = `http://${req.headers.host}/account/reset/${user.resetPasswordToken}`;
	await mail.send({
		user,
		subject: 'Password Reset',
		resetURL,
		filename: 'password-reset'
	});

	req.flash('success', `You have been emailed a password reset link.`);

	// redirect to login
	res.redirect('/login');
};

exports.reset = async (req, res) => {
	const user = await User.findOne({
		resetPasswordToken: req.params.token,
		resetPasswordExpires: { $gt: Date.now() }
	});

	if (!user) {
		req.flash('error', 'Password reset is invalid or has expired');
		res.redirect('/login');
	}

	res.render('reset', { title: 'Reset Your Password'});
}

exports.confirmedPasswords = (req, res, next) => {
	if (req.body.password !== req.body['password-confirmed']) {
		return next();
	}
	req.flash('error', 'Passwords do not match');
	res.redirect('back');
}

exports.update = async (req, res) => {
	const user = await User.findOne({
		resetPasswordToken: req.params.token,
		resetPasswordExpires: { $gt: Date.now() }
	});	

	if (!user) {
		req.flash('error', 'Password reset is invalid or has expired');
		res.redirect('/login');
	}

	const setPassword = promisify(user.setPassword, user);
	await setPassword('req.body.password');
	user.resetPasswordToken = undefined;
	user.resetPasswordExpires = undefined;
	const updatedUser = await user.save();
	await req.login(updatedUser);
	req.flash('success', 'Your password has been reset. You are now logged in.');
	res.redirect('/');

}