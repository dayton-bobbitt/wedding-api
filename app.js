const express = require('express');
const path = require('path');
const favicon = require('serve-favicon');
const logger = require('morgan');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const sassMiddleware = require('node-sass-middleware');
const config = require('config');
const cors = require('cors');
const mysql = require('mysql');

const index = require('./routes/index');
const users = require('./routes/users');

const app = express();
const corsOptions = {
  origin: true,
  credentials: true,
  allowedHeaders: ['eventkey']
}
app.use(cors(corsOptions));

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
app.post('/api/guest/find/rsvp', findRsvp);

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
  if (!authorizedGuest(req.cookies)) {

    // Set cookie if eventkey is valid
    const eventKey = req.headers.eventkey;
    if (eventKey && eventKey.toLowerCase() === config.get('eventKey')) {
      res.cookie(config.get('cookieName'), config.get('cookieValue'), {
        path: '/api', 
        expires: config.get('weddingDate'),
        httpOnly: false,
        secure: false
      });
    } else {
      return res.status(404).send();
    }
  }

  res.json({
    contactEmail: config.get('contactEmail'),
    details: config.get('details')
  });
}

function findRsvp(req, res) {
  if (authorizedGuest(req.cookies)) {
    const body = req.body;
    queryForRsvp(body.lastName, body.address)
    .then((guest) => {
      if (guest) {
        res.status(200).json(guest);
      } else {
        res.status(404).send();
      }
    })
    .catch((err) => res.status(500).send(err));
  } else {
    res.status(401).send();
  }
}

function authorizedGuest(cookies) {
  return cookies[config.get('cookieName')] === config.get('cookieValue');
}

function queryForRsvp(lastName, address) {
  return new Promise((resolve, reject) => {
    const credentials = config.get('connection');
    const con = mysql.createConnection({
      host: credentials.host,
      user: credentials.user,
      password: credentials.password,
      database: credentials.database
    });

    con.connect((err) => {
      if (err) {
        return reject(err);
      }
    });
    
    const queryTemplate = config.get('queryTemplate');
    const inserts = [`%${lastName.trim()}%`, address];
    query = mysql.format(queryTemplate, inserts);

    con.query(query, function (err, results) {
      if (err) {
        return reject(err);
      };
      resolve(results[0]);
    });

    con.end();
  });
}

module.exports = app;
