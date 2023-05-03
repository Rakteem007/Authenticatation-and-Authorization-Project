//jshint esversion:6
require('dotenv').config();
const express =require('express');
const bodyParser = require('body-parser');
const ejs = require('ejs');
const mongoose=require('mongoose');
// const encrypt = require('mongoose-encryption');
// const md5=require('md5');
//salting password --> level 4
// const bcrypt = require('bcrypt');
// const saltRounds = 10;
const session = require('express-session');
const passport = require('passport');
const passportLocalMongoose = require('passport-local-mongoose');
var GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require('mongoose-findorcreate');

const app=express();

app.use(express.static('public'));
app.set('view engine','ejs');
app.use(bodyParser.urlencoded({ extended : true}));

app.use(session({
    secret : "Anime is not cartoon.",
    resave : false,
    saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect("mongodb://localhost:27017/usersDB");

const userSchema =new mongoose.Schema({
    email : String,
    password : String,
    googleId : String,
    secret : String
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

//encryption of password --> level 2 encryption authorization.
// const secret = process.env.SECRET_KEY;
// userSchema.plugin(encrypt, {secret : secret , encryptedFields : ["password"]});

const User=new mongoose.model('User',userSchema);

passport.use(User.createStrategy());

//only for the mongoose-local-passport
// passport.serializeUser(User.serializeUser());
// passport.deserializeUser(User.deserializeUser());

//for the all strategies and authetications
passport.serializeUser(function(user, cb) {
  process.nextTick(function() {
    return cb(null, {
      id: user.id,
      username: user.username,
      picture: user.picture
    });
  });
});

passport.deserializeUser(function(user, cb) {
  process.nextTick(function() {
    return cb(null, user);
  });
});

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets",
    userProfileURL : "https://www.googleapis.com/oauth2/v3/userinfo"
  },
  function(accessToken, refreshToken, profile, cb) {

    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));

app.get('/' , (req,res)=>{
    res.render('home');
});

app.get('/auth/google',
  passport.authenticate('google', { scope: ['profile'] }));

app.get('/auth/google/secrets', 
  passport.authenticate('google', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect('/secrets');
  });

app.get('/login',(req,res)=>{
    res.render('login');
});

app.get('/register' , (req,res)=>{
    res.render('register');
});

//to check wheather the user is authenticated or not using all the middle-ware 
app.get('/secrets',async (req,res)=>{

    //check wheather the user is authemticated or not.
//    if(req.isAuthenticated()){
//     res.render('secrets');
//    }else{
//      res.redirect('/login');
//    }

 try {
    const foundUsers = await User.find({"secret" : {$ne : null}});

    res.render('secrets', {usersWithSecrets : foundUsers});
    
 } catch (error) {
    console.log(error);
 }
});

app.get('/submit',(req,res)=>{

    if(req.isAuthenticated()){
    res.render('submit');
   }else{
     res.redirect('/login');
   }
});

app.post('/submit',async (req,res)=>{

    const secretSubmit=req.body.secret;

    try {
        
         const userItem = await User.findById(req.user.id);
         userItem.secret=secretSubmit;
         userItem.save();
         res.redirect('/secrets');

    } catch (error) {
        console.log(error);
    }

   

})

app.post('/register',(req,res)=>{

    // bcrypt.hash(req.body.password, saltRounds, function(err, hash) {
    // // Store hash in your password DB.

    // const newUser=new User({
    //     email : req.body.username,
    //     password : hash
    // });

    // newUser.save();

    // try {

    //     res.render('secrets');

    // } catch (error) {
    //     console.log(error);
    // }
// });

    User.register({username : req.body.username}, req.body.password,(err,user)=>{

        if(err){
            console.log(err);
            res.redirect('/register');
        }else{
            passport.authenticate('local')(req,res, ()=>{
                res.redirect('/secrets');
            });
        }
    });

});

app.post('/login',(req,res)=>{

    // const username=req.body.username;
    // const password= req.body.password;

    // const foundUser = await User.findOne({email : username});

    // try {

    //     if(foundUser){
            //  if(password === foundUser.password){
            //     res.render('secrets');
            //  }else{
            //     console.log("Invlid password");
            //  }
            // Load hash from your password DB.
// bcrypt.compare(password, foundUser.password, function(err, result) {
//      if(!err && result === true){
//         res.render('secrets');
//      }else{
//         console.log("Invalid password");
//      }
// });
//         }else{
//             console.log("Account not found");
//         }
        
//     } catch (error) {
//         console.log(error);
        
//     }

     const user = new User({
        username : req.body.username,
        password : req.body.password
     });

     req.login(user, (err)=>{

        if(err){
            console.log(err);
        }else{
            passport.authenticate('local')(req,res,()=>{
                res.redirect('/secrets');
            });
        }
     });
});

//logout of the session
app.get('/logout',(req,res)=>{
    req.logOut((err)=>{
        if(err){
            console.log(err);
        }else{
            res.redirect('/');
        }
    });
});

app.listen(3000,()=>{
    console.log("Server is running at 3000");
});
