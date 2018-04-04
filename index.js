/* Gebruik gemaakt van de mysql-server example (credits naar Titus Wormer) */
/* eslint-disable semi */
var express = require('express')
var bodyParser = require('body-parser')
var multer = require('multer')
var mysql = require('mysql')
var argon2 = require('argon2')


require('dotenv').config()

var connection = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
})

connection.connect()

var upload = multer({dest: 'static/upload/'})

express()
  .use(express.static('static'))
  .use(bodyParser.urlencoded({extended: true}))
  .set('view engine', 'ejs')
  .set('views', 'view')
  .get('/', matches)
  .post('/', upload.single('cover'), add)
  .get('/add', form)
  .get('/mijnprofiel', mijnprofiel)
  .get('/login', loginform)
 .post('/login', login)
  .get('/registreren', registreerform)
  .post('/registreren', registreren)
  .get('/:id', profiel)
  .delete('/:id', remove)
  .use(notFound)
  .listen(8000)

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
      bios: bios
    }, oninsert)
    
    function oninsert(err) {
      if (err) {
        next(err)
      } else {
        // Signed up!
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
  var email = req.body.email
  var password = req.body.password

  if (!email || !password) {
    res
      .status(400)
      .send('Username or password are missing')

    return
  }

  connection.query(
    'SELECT * FROM gebruikers WHERE email = ?',
    email,
    done
  )
function done(err, data) {
    var user = data && data[0]

    if (err) {
      next(err)
    } else if (user) {
      argon2
        .verify(user.hash, password)
        .then(onverify, next)
    } else {
      res
        .status(401)
        .send('Email adres bestaat niet')
    }

    
  }
function onverify(match) {
      if (match) {
        // Logged in!
        res.redirect('/')
      } else {
        res.status(401).send('Wachtwoord is niet correct')
      }
    } }



function mijnprofiel(req, res, next) {
  connection.query('SELECT * FROM gebruikers', done)

  function done(err, data) {
    if (err) {
      next(err)
    } else {
      res.render('profiel.ejs', {data: data})
    }
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

function form(req, res) {
  res.render('add.ejs')
}

function add(req, res, next) {
  connection.query('INSERT INTO movies SET ?', {
    cover: req.file ? req.file.filename : null,
    title: req.body.title,
    plot: req.body.plot,
    description: req.body.description
  }, done)

  function done(err, data) {
    if (err) {
      next(err)
    } else {
      res.redirect('/' + data.insertId)
    }
  }
}

function remove(req, res, next) {
  var id = req.params.id

  connection.query('DELETE FROM movies WHERE id = ?', id, done)

  function done(err) {
    if (err) {
      next(err)
    } else {
      res.json({status: 'ok'})
    }
  }
}

function notFound(req, res) {
  res.status(404).render('not-found.ejs')
}
