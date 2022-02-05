require('dotenv').config();

const express = require('express');

const bodyParser = require('body-parser');

const path = require('path');

const axios = require('axios');

const logger = require('morgan');

const cookieParser = require('cookie-parser');

const cookieSession = require('cookie-session');

const nocache = require('nocache');

const FormData = require('form-data');

const multer = require('multer');

const router =express.Router();

const upload = multer();

const passport = require('passport');
const session  = require('express-session');
var OneLoginStrategy = require('passport-openidconnect').Strategy
const envProp = process.env;
//const localStorage = require("localStorage");

const Oidc = require("oidc-client");

const loadedConfig = require("./app_config.json");
const config = require("./ping_config_dev.json");
//const openIdclient = require("openid-client");
//const {Issuer, Strategy} = require("openid-client");
const { token } = require('morgan');
const { request } = require('http');

cmeMain();

async function cmeMain(){
    try{

        // Initializing Ping Fed OIDC modules 
        // Place holder to add authentication process
        console.log("*******************************************************************************************");

        const app = express(); // Instantiated the express app

        const port = process.env.PORT || 4200;

        const server = app.listen(port, () => {
            console.log(`CME application is running on port ${server.address().port}`);
            console.log("*******************************************************************************************");
        });
        app.use(cookieParser())
        app.use(session({
            secret:'secret',
            resave:false,
            saveUninitialized:true
        }));
        

        passport.use( new OneLoginStrategy({
            issuer:'https://idptest.aa.com',
            authorizationURL: ' https://idptest.aa.com/as/authorization.oauth2',
            tokenURL:'https://idptest.aa.com/as/token.oauth2',
            clientID:'cms_poc',
            clientSecret:'9KjxKd7MefZBUMxb1xPGYvewbgKKvxVDFnVJlN9ttth2oWx6tIHDGbf5hphZqUj8',
            callbackURL:'http://localhost:4200/auth/callback'
        },
         function(req, issuer, sub, accessToken, refreshToken, id, profile, cb){
             return cb(null, profile);
         }
        ));

        app.get('/', checkAuthentication);
        app.use(express.static(path.join(__dirname, 'public')));

        app.use(passport.initialize());
        app.use(passport.session());

        passport.serializeUser((user, next) =>{
            next(null, user);
        });

        passport.deserializeUser((obj, next) =>{
            next(null, obj);
        });
       
        function checkAuthentication(request, res, next){
            return next();
        }

        const auth = () => {
            return async (req, res, next) =>{
                passport.authenticate('openidconnect', {scope:'openid profile'})(req, res, next);
            }
        }
        app.get('/auth/callback', passport.authenticate('openidconnect', {successRedirect:'/#/authenticate'}), (req, res, next) =>{
              console.log(JSON.stringify(req.body));
        });
        app.get('/login', passport.authenticate('openidconnect', {successReturnToOrRedirect:"/", scope:'openid profile'}),  (req, res, next) =>{});
      

        app.get('/logout', (req, res) => {
            req.logout();
            let logouturi = "https://smlogin.qtcorpaa.aa.com/login/SMLogout.jsp?originalTarget=https://css-dev.aa.com";
            res.redirect(logouturi);
        })

         app.get('/tokenreq', (req, res)=>{
            console.log("sucsees");
            console.log(JSON.stringify(req.user));
            res.status(200).json({"statusCode": 200, "user" : req.user})
         })


    }catch(e){
        console.log(null, e);
    }
}
