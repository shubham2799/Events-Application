var mongoose =  require("mongoose");
var eventSchema = new mongoose.Schema({
	created: {type: Date, default: Date.now},
	title: String,
	type: String,
	venue: String,
	date: String,
	time: String,
	description: String,
	user: String
});

module.exports = mongoose.model('Event', eventSchema);