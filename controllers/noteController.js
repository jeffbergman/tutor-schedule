const mongoose = require('mongoose');
const Note = mongoose.model('Note');

exports.addNote = async (req, res) => {

	req.body.author = req.user._id;
	req.body.student = req.params.id;
	
	const newNote = new Note(req.body);
	await newNote.save();
	req.flash('success', 'Note Saved!');
	res.redirect('back'); 
}