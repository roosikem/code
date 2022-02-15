const { Request, Response } = require("express");
const express = require("express");
const cookieParser = require("cookie-parser");
const middleware = require("./auth/middleware");
const customSession = require("./auth/session");
const { setSessionCookie, clearSessionCookie }= require("./auth/cookie");
const { Router } = require("express");
const { serialize } = require("./auth/session");
const { getDomain } = require("./auth/middleware");
const bodyParser = require('body-parser');
const path = require('path');
const passport = require('passport');
const { Issuer, Strategy } = require('openid-client');
const ensureLoggedIn = require("connect-ensure-login").ensureLoggedIn;
const session  = require('express-session');
const {
    serializeAuthState,
    deserializeAuthState,
    setAuthStateCookie,
    getAuthStateCookie,
  }  = require("./auth/state");
  const jwt_decode = require("jwt-decode");
const debugFactory = require("debug");
const debug = debugFactory("myapp:routes");
// To test the SSO we need to use two different hosts
// because of the cookie domain (localhost cookie domain
// doesn't include the port, so both apps would be using the same
// cookie domain and auth).
// So one easy way of doing so is to run one app with localhost
// and the other for 127.0.0.1 (which are totally the same) but
// in terms of cookie domain they are distinct.
// You could do something more fancy like adding custom domains
// to your hosts file and that would work too.
console.log(`
 USING
 HOST: ${process.env.HOST}
 PORT: ${process.env.PORT}
 OAUTH_CLIENT_ID: ${process.env.OAUTH_CLIENT_ID}
 OAUTH_CLIENT_secret: ${process.env.OAUTH_CLIENT_SECRET}
`);

const app = express();
app.use(bodyParser.json());
var client ;


Issuer.discover(process.env.ISSUER).then(issuer =>{
  console.log("OpendId issuer created");
  initializeApp(issuer);

});

function initializeApp(issuer){

  client = new issuer.Client({
    client_id: process.env.OAUTH_CLIENT_ID,
    client_secret: process.env.OAUTH_CLIENT_SECRET,
    redirect_uris: [`${getDomain()}/auth/callback`],
    response_types: [process.env.SCOPE],
    token_endpoint_auth_method:process.env.TOKEN_METHOD
  });
  
  passport.use('oidc', new Strategy({ 
    client
  },
  function(tokenSet, userInfo, cb){
     return cb(null, tokenSet);
  }
  ));
  app.use( "/home*", express.static(path.join(__dirname +'/public')));
  
  app.get('/auth/token', (req, res)=>{
      console.log("sucsees");
      console.log(JSON.stringify(req.user));
      res.status(200).json({"statusCode": 200, "user" : req.user})
   })
  
   app.get('/auth/token/refresh', async (req, res)=>  {
      const client = req.app.authClient;
      const session = req.session;
    
      if(client && session.tokenSet && session.tokenSet.expired()) {
        try {
          const refreshedTokenSet = await client.refresh(session.tokenSet);
          console.log("refreshedTokenSet");
          console.log(refreshedTokenSet);
          session.tokenSet = refreshedTokenSet;
          setSessionCookie(res, serialize(session));
        } catch (err) {
           clearSessionCookie(res);
          res.status(401).json({"statusCode": 401, "user" : "authentication failed"});
        }
      }
       
      try {
         const validate = req.app.authClient?.validateIdToken;
        await validate.call(client, session.tokenSet);
      } catch (err) {
        console.log("bad token signature found in auth cookie");
        res.status(401).json({"statusCode": 401, "user" : "authentication failed"});
      }
    
      req.session = session;
      res.status(200).json({"statusCode": 200, "user" : req.session.tokenSet});
  })
  
  function requireAuth(
    req,
    res,
    next
  ) {
    const session = req.user;
    console.log("session");
    console.log(JSON.stringify(session));
    if (!session) {
       res.redirect("/auth/login");
    }
  
    next();
  }
  
  
  
  app.listen(process.env.PORT, () => {
    console.log(`Express started on port ${process.env.PORT}`);
  });
    
  app.use(cookieParser())
  app.use(session({
      secret:'secret',
      resave:false,
      saveUninitialized:true
  }));
  
  app.use(passport.initialize());
  app.use(passport.session());
  
  
  
  passport.serializeUser((user, next) =>{
  next(null, user);
  });
  
  passport.deserializeUser((obj, next) =>{
  next(null, obj);
  });
  
  app.get("/", ensureLoggedIn("/auth/login"), (req, res) => {
    console.log("/home/angular calling");
    console.log(req.user);
    res.redirect("/home")
  });
  
  app.get("/login", (req, res) => {
    res.redirect("/auth/login")
  });
  
  app.get("/login", function (req, res, next) {
    
    res.redirect("/auth/login");
  });
  
  app.get('/auth/login', passport.authenticate('oidc', {successReturnToOrRedirect:"/", scope:'openid profile'}),  (req, res, next) =>{});
  app.get('/auth/callback', passport.authenticate('oidc', {successRedirect:'/'}), (req, res, next) =>{
    console.log(JSON.stringify(req.body));
  });
  
  app.get('/logout', (req, res) => {
    req.logout();
    let logouturi = "https://smlogin.qtcorpaa.aa.com/login/SMLogout.jsp?originalTarget=https://css-dev.aa.com";
    res.redirect(logouturi);
  })
  
}



