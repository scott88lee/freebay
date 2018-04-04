const express = require('express');
const handlebars = require('express-handlebars');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const cookieParser = require('cookie-parser');

const pg = require('pg');
const { Pool } = require('pg');
//const methodOverride = require('method-override');

// Initialise postgres client
const pool = new Pool({
user: 'scottlee',
host: '127.0.0.1',
database: 'freebay',
port: 5432,
});

pool.on('error', (err, client) => {
  console.error('Unexpected error on idle client', err)
  process.exit(-1)
})

/* =================================
 * Configurations and set up
 * =================================*/

// Init express app
const app = express();

app.engine('handlebars', handlebars.create().engine);
app.set('view engine', 'handlebars');

app.use(cookieParser());
app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: true }));
//app.use(methodOverride('_method'));

/**================================
 * Routes
 * ===============================*/

app.get('/', (request, response) => {        // Renders home
  
  if (request.cookies.loggedin == "true"){   //START OF USER BLOCK
    
    response.render('dashboard');

  } else {  // END OF USER BLOCK

    response.render('home');
  }
});

app.get('/login', (request, response) => {         // Renders home
  response.render('login');
});

app.post('/login', (request, response) => { // Registration Route

  pool.connect( ( error , client , done )  => {     // Stores into DB users

    let sql = "SELECT * from users WHERE email = '" + request.body.email + "'";

      client.query(sql, (err, res) => {
        if (err) console.log(err);

        if (request.body.email === undefined){
          response.send("Email address doesn't exist");
        } else {
          bcrypt.compare(request.body.password, res.rows[0].pwdhash, (err, result) => { //run bcryot compare
            if (result === true) {
              response.cookie('loggedin', true);
              response.cookie('email', request.body.email);
              response.redirect('/'); //Pass - Cookie! - Redirect.
          } else {
            response.send("Log in fail, <a href='/login'>Try again</a>");
            //Fail - Wrong pass
          }
          });
        }
      });
  });
});


app.get('/register', (request, response) => { // Routes to register page
  response.render('register');
});

app.post('/register', (request, response) => { // Registration Route
  
  bcrypt.hash(request.body.password, 10, (err,hash)=>{   // Hashes password
    
    let params = [request.body.username, hash, request.body.email];

    pool.connect( ( error , client , done )  => {     // Stores into DB users

      let sql = "INSERT INTO users (name, pwdhash, email) VALUES ($1, $2, $3)"

      client.query(sql, params, (err, res) => {
        if (err) console.log(err);

        console.log(`New user signed up ${request.body.email}.`);
        response.redirect('/');
      });
    });
  });
});


/** ================================
 * Listen to requests on port 3000
 * =================================*/
app.listen(3000, () => console.log('Listen Port: 3000'));
