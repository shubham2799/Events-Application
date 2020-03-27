var express = require("express");
var app = express();
var bodyParser = require("body-parser");
var mongoose =  require("mongoose");
var methodOverride = require("method-override");
var passport = require("passport");
var localStrategy = require("passport-local");
var passportLocalMongoose = require("passport-local-mongoose");
var flash = require("connect-flash");
var User = require("./models/user");
var Event = require("./models/event");

var dbURL = process.env.DATABASEURL || 'mongodb://localhost:27017/eventsApp';
mongoose.connect(dbURL, {useNewUrlParser: true});

app.set("view engine","ejs");
app.use(express.static(__dirname + "/public"));
app.use(bodyParser.urlencoded({extended: true}));
app.use(methodOverride("_method"));
app.use(flash());

app.use(require("express-session")({
	secret: "No Secrets to keep",
	resave: false,
	saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

passport.use(new localStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use(function(req,res,next){
	res.locals.currentUser = req.user;
	res.locals.error = req.flash("error");
	res.locals.success = req.flash("success");
	next();
});

app.get("/",function(req,res){
	res.render("landing");
});

app.get("/register",function(req,res){
	res.render("register");
});

app.post("/register",function(req,res){
	var newUser = new User({username: req.body.username});
	User.register(newUser,req.body.password,function(err,user){
		if(err){
			req.flash("error",err.message);
			res.redirect("/register");
		} else {
			passport.authenticate("local")(req,res,function(){
				req.flash("success","Hi " + user.username + ", Welcome to the Events App!");
				res.redirect("/events");
			});
		}
	});
});

app.get("/login",function(req,res){
	res.render("login");
});

app.post("/login",passport.authenticate("local",{
		successRedirect: "/events",
		failureRedirect: "/login",
		failureFlash: true
	}),function(req,res){
});

app.get("/logout",isLoggedIn,function(req,res){
	req.logout();
	req.flash("success","Logged you out!!");
	res.redirect("/")
});

app.get("/events",isLoggedIn,function(req,res){
	User.findById(req.user._id).populate("events").exec(function(err,user){
		if(err){
			req.flash("error","Something went wrong!!");
			res.redirect("/");
		} else {
			res.render("index",{user: user});
		}
	});
});

app.get("/events/new",isLoggedIn,function(req,res){
	res.render("new");
});

app.post("/events",isLoggedIn,function(req,res){
	req.body.event.user=req.user.username;
	Event.create(req.body.event,function(err,event){
		if(err){
			req.flash("error","Something went wrong!!");
			res.redirect("/events");
		} else {
			req.user.events.push(event);
			req.user.save();
			req.flash("success","Event added!!");
			res.redirect("/events/"+event._id);
		}
	});
});

app.get("/events/:id",eventOwnership,function(req,res){
	Event.findById(req.params.id,function(err,event){
		if(err){
			req.flash("error","Event not found!!");
			res.redirect("/events");
		} else {
			res.render("show",{event: event});
		}
	});
});

app.get("/events/:id/edit",eventOwnership,function(req,res){
	Event.findById(req.params.id,function(err,event){
		if(err){
			req.flash("error","Event not found!!");
			res.redirect("/events");
		} else {
			res.render("edit",{event: event});
		}
	});
});

app.put("/events/:id",eventOwnership,function(req,res){
	Event.findByIdAndUpdate(req.params.id,req.body.event,function(err,event){
		if(err){
			req.flash("error","Event not found!!");
			res.redirect("/events");
		} else {
			req.flash("success","Event updated!!");
			res.redirect("/events/"+req.params.id);
		}
	});
});

app.delete("/events/:id",eventOwnership,function(req,res){
	User.findById(req.user._id).populate("events").exec(function(err,user){
		if(err){
			req.flash("error","Something went wrong!!");
			res.redirect("/events");
		} else {
			for (var i = user.events.length - 1; i >= 0; i--) {
				if(user.events[i]._id.equals(req.params.id)){
					user.events.splice(i,1);
					user.save();
					break;
				}
			}
		}
	});
	Event.findByIdAndRemove(req.params.id,function(err){
		if(err) {
			req.flash("error","Event not found!!");
			res.redirect("/events");
		} else {
			req.flash("success","Event deleted!!");
			res.redirect("/events");
		}
	});
});

function isLoggedIn(req,res,next){
	if(req.isAuthenticated()){
		return next();
	}
	req.flash("error","Login to continue!!");
	res.redirect("/login");
}

function eventOwnership(req,res,next){
	if(req.isAuthenticated()){
		Event.findById(req.params.id,function(err,event){
			if(err) {
				req.flash("error","Event not found!!");
				res.redirect("/events");
			} else {
				if(event.user==req.user.username) {
					next();
				} else {
					req.flash("error","Permission Denied!!");
					res.redirect("/events");
				}
			}
		});
	} else {
		req.flash("error","Login to continue!!");
		res.redirect("/login");
	}
}

app.listen(process.env.PORT || 3000, process.env.IP);