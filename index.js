/* Gebruik gemaakt van de mysql-server example (credits naar Titus Wormer) */
/* eslint-disable semi */
var express = require('express')
var bodyParser = require('body-parser')
var multer = require('multer')
var mysql = require('mysql')
var argon2 = require('argon2')
var session = require('express-session')



require('dotenv').config()

var connection = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});

connection.connect()

var upload = multer({dest: 'static/images/'})

express()
  .use(express.static('static'))
  .use(bodyParser.urlencoded({extended: true}))
  .use(session({
    resave: false,
    saveUninitialized: true,
    secret: process.env.SESSION_SECRET
  }))
  .set('view engine', 'ejs')
  .set('views', 'view')

  .get('/matches', matches)
  .get('/', home)
  .get('/admin', admin)
  .get('/mijnprofiel', mijnprofiel)
  .get('/login', loginform)
  .get('/:id', profiel)
  .get('/films', films)
  .get('/registreren', registreerform)
  .get('/verwijderfilm=:id', verwijderfilm)

  .post('/', upload.single('afbeelding'), add)
  .post('/login', login)
  .post('/registreren', registreren)

  .use(notFound)
  .listen(8000)
  



function home(req, res) {
      res.render('index.ejs')
    }

function films(req, res, next) {
  connection.query('SELECT * FROM films', done)

  function done(err, data) {
    if (err) {
      next(err)
    } else {
      res.render('films.ejs', {data: data})
    }
  }
}

function matches(req, res, next) {
  connection.query('SELECT * FROM gebruikers', done)

  function done(err, data) {
    if (err) {
      next(err)
    } else {
      res.render('matches.ejs', {data: data})
    }
  }
}

function registreren(req, res, next) {
  var email = req.body.email
  var password = req.body.password
  var woonplaats = req.body.woonplaats
  var opzoek = req.body.opzoek
  var geslacht = req.body.geslacht
  var leeftijd = req.body.leeftijd
  var voornaam = req.body.voornaam
  var quote = req.body.quote
  var bios = req.body.bios
  var min = 8
  var max = 160

  if (!email || !password) {
    res
      .status(400)
      .send('Email adres of wachtwoord mist nog.')

    return
  }
  if (password.length < min || password.length > max) {
    res
      .status(400)
      .send(
        'Wachtwoord moet tussen de ' + min +
        ' en de ' + max + ' karakters lang zijn'
      )
    return
  }

    connection.query(
    'SELECT * FROM gebruikers WHERE email = ?',
    email,
    done
  )

  function done(err, data) {
    if (err) {
      next(err)
    } else if (data.length !== 0) {
      res.status(409).send('Dit email adres is al in gebruik.')
    } else {
      argon2.hash(password).then(onhash, next)
    }
  }
function onhash(hash) {
    connection.query('INSERT INTO gebruikers SET ?', {
      email: email,
      hash: hash,
      woonplaats: woonplaats,
      opzoek: opzoek,
      geslacht: geslacht,
      leeftijd: leeftijd,
      voornaam: voornaam,
      quote: quote,
      profielfoto: "4e607a6702f7b6e116f69ea2b250c5f4",
      bios: bios
    }, oninsert)
    
    function oninsert(err) {
      if (err) {
        next(err)
      } else {
        // Signed up!
          req.session.user = {username: email}
        res.redirect('/')
      }
    }
  }
}








function registreerform(req, res, next) {
  connection.query('SELECT * FROM gebruikers', done)

  function done(err, data) {
    if (err) {
      next(err)
    } else {
      res.render('registreer.ejs', {data: data})
    }
  }
}


function loginform(req, res, next) {
  connection.query('SELECT * FROM gebruikers', done)

  function done(err, data) {
    if (err) {
      next(err)
    } else {
      res.render('login.ejs', {data: data})
    }
  }
}


function login(req, res, next) {
  var email = req.body.email;
  var password = req.body.password;

  if (!email || !password) {
    res.status(400).send("Username or password are missing");

    return;
  }

  getLoggedInUser(email, done);     // GetLoggedInUser mogelijk gemaakt door Jona Meijers & Marijn Moviat - Cre

  function done(err, user) {
    if (err) {
      next(err);
    } else if (user) {
      argon2.verify(user.hash, password).then(onverify, next);
    } else {
      res.status(401).send('Email adres bestaat niet')
    }

    function onverify(match) {
      if (match) {
        req.session.user = {
          email: user.email
        };
        // Logged in!
        res.redirect("/films");
      } else {
        res.status(401).send("Wachtwoord is niet correct");
      }
    }
  }
}

function mijnprofiel(req, res) {
        var email = req.session.user.email
        connection.query('SELECT * FROM gebruikers WHERE email = ?', email, done) 
        function done(err, data) {
            res.render('profiel.ejs', {
                data: data
            })
        }
}






function profiel(req, res, next) {
  var id = req.params.id

  connection.query('SELECT * FROM gebruikers WHERE id = ?', id, done)

  function done(err, data) {
    if (err) {
      next(err)
    } else if (data.length === 0) {
      next()
    } else {
      res.render('details.ejs', {data: data[0]})
    }
  }
}

function admin(req, res) {
     var email = req.session.user.email
    connection.query('SELECT * FROM films', email, done)
    
    
      function done(err, data) {
      res.render('admin.ejs', {data: data})
    }
  }
    
    

function add(req, res, next) {
  connection.query('INSERT INTO films SET ?', {
    image: req.file ? req.file.filename : null,
    titel: req.body.title,
    beschrijving: req.body.description
  }, done)

  function done(err) {
    if (err) {
      next(err)
    } else {
      res.redirect('back');
    }
  }
}

function verwijderfilm(req, res, next) {
  var id = req.params.id

  connection.query('DELETE FROM films WHERE id = ?', id, done)

  function done(err) {
    if (err) {
      next(err)
    } else {
      res.redirect('back');
    }
  }
}

function getLoggedInUser(email, cb) {
  connection.query('SELECT * FROM gebruikers WHERE email = ?', email, done)

  function done(err, user) {
    if (err) {
      cb(err, null)
    } else {
      cb(null, user[0])
    }
  }
}

function notFound(req, res) {
  res.status(404).render('not-found.ejs')
}
