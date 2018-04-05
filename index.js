const express = require('express');
const handlebars = require('express-handlebars');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const cookieParser = require('cookie-parser');

const pg = require('pg');
const { Pool } = require('pg');

const handlebarsConfig = {
   extname: '.handlebars',
   layoutsDir: 'views',
   defaultLayout: 'layout'
};
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

app.engine('handlebars', handlebars.create(handlebarsConfig).engine);
app.set('view engine', 'handlebars');

app.use(cookieParser());
app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: true }));
//app.use(methodOverride('_method'));

/**================================
 * Routes
 * ===============================*/

app.get('/login', (request, response) => {         // Renders home
  response.render('login');
});

app.get('/', (request, response) => {        // Renders home
  
  if (request.cookies.loggedin == "true"){   //START OF USER BLOCK

    pool.connect(( err, client, done) =>{
      let sql = "SELECT * FROM users INNER JOIN items ON users.id = items.ownerid WHERE users.id = '"+ request.cookies.userid + "'";
      client.query(sql, (err,res) => {
            response.render('dashboard', {user : res.rows, firstname : request.cookies.firstname });
      });
    });

  } else {  // END OF USER BLOCK
    response.render('home');
  }
});

app.get('/give', (request, response) => {
  if (request.cookies.loggedin == "true"){
  response.render('postitem');
  } else {
    response.redirect('/login');
  }
});

app.post('/give', (request, response) => {
  pool.connect( (error, client, done) => {
    
    let sql = "INSERT INTO items (itemname, description, imglink, ownerid, shipping) VALUES ($1, $2, $3, $4, $5)";
    let params = [request.body.itemname, request.body.description, request.body.imglink, request.cookies.userid, request.body.shipping]
    
    client.query(sql, params,(err,res)=> {
      response.redirect('/');
    });
  });
});

app.get('/inbox', (request,response)=>{
  pool.connect((error, client, done) => {
    let sql = "SELECT * FROM users U INNER JOIN messages M ON U.id = M.destid INNER JOIN users UN ON M.originid = UN.id WHERE U.id = '"+ request.cookies.userid + "'";
    client.query(sql, (err,res) => {

      let data = { 
        inbox : res.rows.length,
        firstname : request.cookies.firstname,
        row : res.rows
      };
      response.render('inbox', data);
    });
  });
});

app.get('/karma', (request, response) => {
  pool.connect( (error, client, done) => {
    let sql = "SELECT * FROM users WHERE email = '" + request.cookies.email + "'";
    client.query(sql, (err,res) => {
      console.log(res.row);
      let karma = res.rows[0].karma + 1;
      console.log('new karma', karma)
      let cmd = "UPDATE users SET karma = '" + karma + "' WHERE email = '" + request.cookies.email + "' RETURNING *";
      client.query(cmd, (err, result) => {
        if (err) console.log(err);
        response.send(result);
        done();
      });
    });
  });
});   //PROBLEM WITH MULTI-SQL queries


app.get('/logout', (request, response) => {         // Renders home
  response.clearCookie('email');
  response.clearCookie('loggedin'); 
  response.render('home');
});

app.post('/login', (request, response) => { // Registration Route

  pool.connect( ( error , client , done )  => {     // Stores into DB users

    let sql = "SELECT * FROM users WHERE email = '" + request.body.email + "'";

      client.query(sql, (err, res) => {
        if (err) console.log(err);

        if (request.body.email === undefined){
          response.send("Email address doesn't exist");
        } else {
          bcrypt.compare(request.body.password, res.rows[0].pwdhash, (err, result) => { //run bcryot compare
            if (result === true) {
              response.cookie('loggedin', true);
              response.cookie('email', request.body.email);
              response.cookie('userid', res.rows[0].id);
              response.cookie('firstname', res.rows[0].firstname);
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
    
    let params = [request.body.firstName, request.body.lastName, hash, request.body.email];

    pool.connect( ( error , client , done )  => {     // Stores into DB users

      let sql = "INSERT INTO users (firstname, lastname, pwdhash, email) VALUES ($1, $2, $3, $4)"

      client.query(sql, params, (err, res) => {
        if (err) console.log(err);

        console.log(`New user signed up ${request.body.email}.`);
        response.redirect('/');
      });
    });
  });
});

app.get('/:id/:itemid', (request,response) => {

  pool.connect(( err, client, done) =>{
      let sql = "SELECT * FROM users INNER JOIN items ON users.id = items.ownerid WHERE users.id = '"+ request.params.id + "' AND items.itemid = '" + request.params.itemid + "'";
      client.query(sql, (err,res) => {
            console.log(res.rows[0]);
            response.render('item', {user : res.rows[0] });
      });
    });

});

/** ================================
 * Listen to requests on port 3000
 * =================================*/
app.listen(3000, () => console.log('Listen Port: 3000'));
