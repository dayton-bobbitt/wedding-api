const express = require('express');
const path = require('path');
const favicon = require('serve-favicon');
const logger = require('morgan');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const sassMiddleware = require('node-sass-middleware');
const config = require('config');

const index = require('./routes/index');
const users = require('./routes/users');

const app = express();

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
  const err = new Error('Not Found');
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
  if (typeof req.cookies[config.get('cookieName')] === 'undefined') {

    // Set cookie if eventkey is valid
    const eventKey = req.headers.eventkey;
    if (eventKey && eventKey.toLowerCase() === config.get('eventKey')) {
      res.cookie(config.get('cookieName'), config.get('cookieValue'), {
        path: '/api', 
        expires: config.get('weddingDate'),
        httpOnly: false,
        secure: false
      });
      res.send();
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
