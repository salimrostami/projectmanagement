//jshint esversion:6
require('dotenv').config();
const express = require ("express");
const bodyParser = require ("body-parser");
const ejs = require ("ejs");
const mongoose = require("mongoose");
const session = require('express-session')
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const cpm = require(__dirname + "/cpm.js");
const paramsModule = require(__dirname + "/params.js");

//global params
const params = paramsModule();

//Set up the app
const app = express();
app.set('view engine', 'ejs');
app.use(express.static("public"));
app.use(bodyParser.urlencoded({extended: true}));

//Set up sessions and passport here
app.use(session({
  secret: "Thisisourlittlesecret.",
  resave: false,
  saveUninitialized: false,
  cookie: {}
}));
app.use(passport.initialize());
app.use(passport.session());

//connect to MongoDB by specifying port to MongoDB server & the DB name
main().catch(err => console.log(err));
async function main() {
  await mongoose.connect('mongodb://localhost:27017/pmDB');
}

//Create the schema
const studentSchema = new mongoose.Schema({
  email: String,
  password: String,
});
const activitySchema = new mongoose.Schema({
  index: Number,
  name: String,
  duration: Number
});
const precedenceSchema = new mongoose.Schema({
  from: Number,
  to: Number
});
const projectSchema = new mongoose.Schema({
  index: Number,
  activities: [activitySchema],
  precedences: [precedenceSchema]
});

// Modify the schema to use encryption/hashin strategies
studentSchema.plugin(passportLocalMongoose);

//Create the Model (collection)
const Student = new mongoose.model("Student", studentSchema);

//PassportLocal config - local strategy for authentication
passport.use(Student.createStrategy()); //if missing, isAuthenticated does not work
passport.serializeUser(Student.serializeUser());
passport.deserializeUser(Student.deserializeUser());

// no cache function for the secret pages (no back button after logout)
function nocache(req, res, next) {
  res.header('Cache-Control', 'private, no-cache, no-store, must-revalidate');
  res.header('Expires', '-1');
  res.header('Pragma', 'no-cache');
  next();
}

//Set up GET routes
app.get("/", function(req, res){
  res.render("home");
});

app.get("/login", function(req, res){
  if (req.isAuthenticated()) {
    res.redirect("/content");
  } else {
    res.render("login");
  }
});

app.get("/register", function(req, res){
  if (req.isAuthenticated()) {
    res.redirect("/content");
  } else {
    res.render("register");
  }
});

app.get("/content", nocache, function(req, res){
  if (req.isAuthenticated()) {
    res.render("content", {user: req.user});
  } else {
    res.redirect("/login");
  }
});

app.get("/logout", function(req, res){
  req.logout(function(err){
    if (!err) {
      res.redirect("/");
    }
  });
});

app.get("/cpm", function(req, res){
  if (req.isAuthenticated()) {
    const proj = cpm();
    res.render("cpm", {proj: proj, params: params, user: req.user});
  } else {
    res.redirect("/login");
  }
});

app.get("/rl", function(req, res){
  if (req.isAuthenticated()) {
    const proj = cpm();
    res.render("rl", {proj: proj, params: params, user: req.user});
  } else {
    res.redirect("/login");
  }
});

app.get("/pert", function(req, res){
  if (req.isAuthenticated()) {
    const proj = cpm();
    res.render("pert", {proj: proj, params: params, user: req.user});
  } else {
    res.redirect("/login");
  }
});

app.get("/msp", function(req, res){
  if (req.isAuthenticated()) {
    const proj = cpm();
    res.render("msp", {proj: proj, params: params, user: req.user});
  } else {
    res.redirect("/login");
  }
});

app.get("/user", function(req, res){
  if (req.isAuthenticated()) {
    res.render("user", {user: req.user});
  } else {
    res.redirect("/login");
  }
});

//Set up POST routes
app.post("/register", function(req, res){
  Student.register({username: req.body.username}, req.body.password, function(err, user){
    if (err) {
      console.log(err);
      res.redirect("/register");
    } else {
      passport.authenticate("local")(req, res, function(){
        res.redirect("/content");
      })
    }
  })
});

app.post("/login",
  passport.authenticate("local", { failureRedirect: "/login" }),
  function(req, res) {
    res.redirect("/content");
});

// Set up the app port
app.listen(3000, function() {
  console.log("Server started on port 3000");
});
