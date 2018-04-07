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

/////////////////
// HEROKU CODE //
// inside of db.js

//require the url library
//this comes with node, so no need to yarn add
const url = require('url');

//check to see if we have this heroku environment variable
if( process.env.DATABASE_URL ){

  //we need to take apart the url so we can set the appropriate configs

  const params = url.parse(process.env.DATABASE_URL);
  const auth = params.auth.split(':');

  //make the configs object
  var configs = {
    user: auth[0],
    password: auth[1],
    host: params.hostname,
    port: params.port,
    database: params.pathname.split('/')[1],
    ssl: true
  };

}else{

  //otherwise we are on the local network
  var configs = {
      user: 'scottlee',
      host: '127.0.0.1',
      database: 'freebay',
      port: 5432
  };
}

//this is the same
const pool = new pg.Pool(configs);
// HEROKU CODE //
/////////////////

// Initialise postgres client

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
app.get("/itemlist", (request,response) => {    // RENDERS ALL ITEMS
    pool.connect( (error, client, done) => {    // IN ONE GRID PAGE.
    if (error) console.log(error);
    
    let sql = "SELECT * FROM items WHERE itemvisible = true"
    pool.query(sql, (err, res) => {
      response.render('itemlist', {item : res.rows});
    });
  });
});

app.get('/login', (request, response) => {         // Renders home
  response.render('login');
});

app.get('/', (request, response) => {        
  if (request.cookies.loggedin == "true"){   //START OF USER BLOCK
  pool.connect(( err, client, done) => {
    if (err) console.log("Pool connect error: " + err);

      let sql = "SELECT * FROM users WHERE email = '" + request.cookies.email + "'";
      client.query(sql, (error,res) => {
          if (error) console.log("Pool query error: " + error);
          
          let data = {
            firstname : res.rows[0].firstname,
            user_since : res.rows[0].u_date,
            karma: res.rows[0].karma,
            userid : res.rows[0].id
          }

          let sql2 = "SELECT * FROM items WHERE originid = '" + data.userid + "'";
          client.query(sql2, (ermsg,result) => {
            data.itemcount = result.rows.length;
            data.item = result.rows;

            let sql3 = "SELECT * FROM requests WHERE originid = '" + data.userid + "'";
            client.query(sql3, (errmsg,resp) => {
              data.reqcount = resp.rows.length;
              data.requests = resp.rows;
              
              response.render('dashboard', {data: data, firstname: data.firstname, item: data.item, requests: data.requests});
              done();
            });
          });
      });
    });

  } else {  // END OF USER BLOCK
    response.render('home');
  }
});

app.get('/give', (request, response) => {
  if (request.cookies.loggedin == "true"){
  response.render('postitem', {firstname : request.cookies.firstname});
  } else {
    response.render('login', {message: "Please log in first before posting items."});
  }
});

app.post('/give', (request, response) => {  //1
  pool.connect( (error, client, done) => {  //2
    if (error) console.log(error);

    let sql = "INSERT INTO items (itemname, description, imglink, originid, condition, shipping) VALUES ($1, $2, $3, $4, $5, $6)";
    let params = [request.body.itemname, request.body.description, request.body.imglink, request.cookies.userid, request.body.condition, request.body.shipping]
    client.query(sql, params,(err,res)=> {  //3
      if (err) console.log(err);

      let sql = "SELECT * FROM users WHERE email = '" + request.cookies.email + "'";
      client.query(sql, (err,res) => {  // 4
  
        let karma = res.rows[0].karma + 1;
        let cmd = "UPDATE users SET karma = '" + karma + "' WHERE email = '" + request.cookies.email + "' RETURNING *";
        client.query(cmd, (err, result) => {  //5
          if (err) console.log(err);
          
          response.redirect('/');
          done();
      }); // 5
    }); // 4
    }); // 3
  }); // 2
}); // 1

app.get('/inbox', (request,response) => {
  pool.connect((error, client, done) => {
    if (error) console.log(error);
    let sql = "SELECT * FROM users U INNER JOIN messages M ON U.id = M.destid INNER JOIN users UN ON M.originid = UN.id WHERE U.id = '"+ request.cookies.userid + "'";
    client.query(sql, (err,res) => {
      if (err) console.log(err);
      let data = { 
        inbox : res.rows.length,
        firstname : request.cookies.firstname,
        row : res.rows
      };
      response.render('inbox', data);
      done();
    });
  });
});

app.get('/logout', (request, response) => {         // Renders home
  response.clearCookie('email');
  response.clearCookie('loggedin');
  response.clearCookie('firstname');
  response.clearCookie('userid');
  response.render('home');
});

app.post('/login', (request, response) => { // Registration Route
  pool.connect( ( error , client , done )  => {     // Stores into DB users
    if (error) console.log(error);
    let sql = "SELECT * FROM users WHERE email = '" + request.body.email + "'";

      client.query(sql, (err, res) => {
        if (err) console.log(err);
        
        if (res.rows.length === 0){
          response.render('login', { message : "E-mail address doesn't exist."} );
          done();
        } else {
          bcrypt.compare(request.body.password, res.rows[0].pwdhash, (err, result) => { //run bcryot compare
            if (result === true) {
              response.cookie('loggedin', true);
              response.cookie('email', res.rows[0].email);
              response.cookie('userid', res.rows[0].id);
              response.cookie('firstname', res.rows[0].firstname);
              response.redirect('/'); //Pass - Cookie! - Redirect.
              done();
          } else {
            response.render('login', { message : "Wrong password, please try again."} );
            done();
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

app.post('/register', (request, response)  => { // Registration Route
  pool.connect( ( error , client , done )  => {
  if (error) console.log(error);
    
    //Begin check to see if email is already taken.
    let sql = "SELECT * FROM users WHERE email = '" + request.body.email + "'";
    client.query(sql, (err, res) => {
      if (err) console.log(err);
      
      if (res.rows.length === 0) {  // START-FRESH EMAIL

      bcrypt.hash(request.body.password, 10, (err,hash) => {   // Hashes password
        
         // Stores into DB users
        let params = [request.body.firstname, request.body.lastname, hash, request.body.email];
        let sql = "INSERT INTO users (firstname, lastname, pwdhash, email) VALUES ($1, $2, $3, $4)"

        client.query(sql, params, (err, res) => {  // STORE SIGNUP DATA
        if (err) console.log(err);

        console.log(`New user signed up ${request.body.email}.`);
        response.render('login', { message : "Thanks for signing up!"});
        done();
        });
      });
    } else {  //END - FRESH EMAIL
      response.render('register', {message:"E-mail is already in use."})
    } 
    done();
    }); // FIRST SQL QUERY
  });   // POOL CONNECT
});     // APP.GET

app.get('/:id/:itemid', (request,response) => {

  pool.connect(( err, client, done) =>{
      let sql = "SELECT * FROM users INNER JOIN items ON users.id = items.originid WHERE users.id = '"+ request.params.id + "' AND items.itemid = '" + request.params.itemid + "'";
      client.query(sql, (err,res) => {
            if (err) console.log(err);

            if (res.rows[0].email===request.cookies.email){
              response.render('useritem', {user : res.rows[0], firstname : request.cookies.firstname});
            } else {
              response.render('item', {user : res.rows[0], firstname : request.cookies.firstname});
            } done();
      });
    });
});

/** ================================
 * Listen to requests on port 3000
 * =================================*/
//app.listen(3000, () => console.log('Listen Port: 3000'));
const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, () => console.log('Listen port: '+PORT+''));
