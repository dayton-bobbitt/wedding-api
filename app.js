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
const md5 = require('blueimp-md5');

const index = require('./routes/index');
const users = require('./routes/users');

const app = express();
const corsOptions = {
  origin: true,
  credentials: true,
  allowedHeaders: ['eventkey', 'lastname', 'address']
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
app.get('/api/guest/rsvp', findRsvp);
app.post('/api/guest/rsvp', rsvpGuest);

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
    const { lastName, address } = getRsvpHeaders(req);

    if (lastName && address) {
      selectRsvp(lastName, address)
      .then((guest) => {
        if (guest) {
          guest.id = md5(`${config.get('salt')}-${guest.id}`);
          res.status(200).json(guest);
        } else {
          res.status(404).send();
        }
      }).catch((err) => res.status(500).send(err));
    } else {
      res.status(400).send();
    }
  } else {
    res.status(401).send();
  }
}

function rsvpGuest(req, res) {
  if (authorizedGuest(req.cookies)) {
    const body = req.body;
    if (typeof body.id !== 'undefined' && typeof body.attending !== 'undefined') {
      updateRsvp(body.id, body.attending)
      .then(() => res.send())
      .catch((err) => res.status(500).send(err));
    } else {
      res.status(400).send();
    }
  } else {
    res.status(401).send();
  }
}

function getRsvpHeaders(request) {
  return {
    lastName: request.headers.lastname,
    address: request.headers.address
  };
}

function authorizedGuest(cookies) {
  return cookies[config.get('cookieName')] === config.get('cookieValue');
}

function selectRsvp(lastName, address) {
  const selectQueryTemplate = config.get('selectQueryTemplate');
  const inserts = [`%${lastName.trim()}%`, address];
  query = mysql.format(selectQueryTemplate, inserts);
  return queryDatabase(query);
}

function updateRsvp(id, attending) {
  const updateQueryTemplate = config.get('updateQueryTemplate');
  const inserts = [attending, id];
  query = mysql.format(updateQueryTemplate, inserts);
  return queryDatabase(query);
}

function queryDatabase(query) {
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
