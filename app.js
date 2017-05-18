var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var sassMiddleware = require('node-sass-middleware');
const config = require('config');

var index = require('./routes/index');
var users = require('./routes/users');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(sassMiddleware({
  src: path.join(__dirname, 'public'),
  dest: path.join(__dirname, 'public'),
  indentedSyntax: true, // true = .sass and false = .scss
  sourceMap: true
}));

app.use(express.static(path.join(__dirname, 'public')));

app.use('/api/guest/validate', validateEventKey);
app.use('/api/guest/rsvp', rsvpGuest);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

/**
 * Create cookie if header contains event code
 */
function validateEventKey(req, res, next) {
  if (typeof req.cookies.weddingEventKey === 'undefined') {

    // Set cookie if eventkey is valid
    const eventKey = req.headers.eventkey;
    if (eventKey && eventKey.toLowerCase() === config.get('eventKey')) {
      res.cookie(config.get('cookieName'), config.get('cookieValue'), {
        path: '/api', 
        expires: config.get('weddingDate'),
        httpOnly: false,
        secure: false
      });
      res.send(); // Required to set cookie - send() function will not store cookie
    } else {
      res.status(404).send();
    }
  } else {
    res.status(200).send(); // Cookie exists - send OK response
  }
}

function rsvpGuest(req, res) {

}

module.exports = app;
