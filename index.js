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
      done();
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

          let sql2 = "SELECT * FROM items WHERE originid = '" + data.userid + "' AND itemvisible = true";
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

app.get('/rankings', (request,response) => {
  pool.connect((connectError, client, done) => {
  if (connectError) console.log(connectError);

    let sql = "SELECT id,firstname,lastname,karma,pf_pic,u_date FROM users"
    client.query(sql, (queryErr,res) =>{
      if (res.rows.length>0) {
        let rank = res.rows;
        rank.sort(function(a, b) {
        return parseFloat(b.karma) - parseFloat(a.karma);
        });

        for (let i=0; i<rank.length; i++){
          let temp = res.rows[i].u_date.toString();
          let ert = temp.slice(0,15);
          rank[i].usr_date = ert;
        }
      response.render('rank',{rank: rank, firstname: request.cookies.firstname});
      }
      done();
    });
  });
});

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

app.get('/pfreset', (request,response) => {
  pool.connect((cError, client, done) => {
    let sql = "UPDATE users SET pf_pic = '" + "2.bp.blogspot.com/-F8q2V2-kdEo/UVwhXeMgHdI/AAAAAAAAF80/NR3ffJlWrhU/s1600/avatar-constituent-default+%281%29.gif" + "'";
    client.query(sql,(err,res) => {
      response.send("done");
      done();
    });
  });
});

app.post('/register', (request, response)  => { // Registration Route
  pool.connect((cError, client)  => {
    if (cError) console.log("Pool connect error: " + cError);
    
    //Begin check to see if email is already taken.
    let sql = "SELECT * FROM users WHERE email = '" + request.body.email + "'";
    client.query(sql, (qErr, res) => {
      if (qErr) console.log("Query error: " + qErr);
      
      if (res.rows.length === 0) {  // START-FRESH EMAIL

        bcrypt.hash(request.body.password, 10, (err,hash) => {   // Hashes password

          // Stores into DB users
          let params = [request.body.firstname, request.body.lastname, hash, request.body.email];
          let sql = "INSERT INTO users (firstname, lastname, pwdhash, email) VALUES ($1, $2, $3, $4)"

          client.query(sql, params, (queryErr, res) => {  // STORE SIGNUP DATA
            if (queryErr) console.log("Second Query Error: "+queryErr);

            console.log(`New user signed up ${request.body.email}.`);
            response.render('login', { message : "Thanks for signing up!"});
          });
        });
    } else {  //END - FRESH EMAIL
      response.render('register', {message:"E-mail is already in use."})
    } 
    }); // FIRST SQL QUERY
  });   // POOL CONNECT
});     // APP.GET

app.get('/edititem/:itemid', (request,response) => {
  if (request.cookies.loggedin == "true") {   //START USER BLOCK
    pool.connect((err, client, done) =>{
      let sql = "SELECT * FROM items WHERE itemid = '" + request.params.itemid + "'";
      client.query(sql, (err, res) => {
      if (err) console.log(err);
      
      if (res.rows[0].originid == request.cookies.userid){
        response.render('edititem', {item:res.rows[0], firstname: request.cookies.firstname});
        done();
      } else {
        done();
        response.redirect('/'); //ITEM DOESNT BELONG TO U
      }
      });
    });
  } else { // END OF USER BLOCK
    response.render('login', {message: "You need to be logged in to edit items."});
    done();
  }
});

app.post('/edititem/:itemid', (request,response) => {
  let info = request.body;
  let sql = "UPDATE items SET itemname = '"+ info.itemname + "', description = '" + info.description + "', condition = '" + info.condition + "', shipping = '" + info.shipping + "' WHERE items.itemid = '" + request.params.itemid + "'";

  pool.connect((err, client, done) => {
  if (err) console.log("Pool connection error :" + err);
    client.query(sql, (queryErr, result) => {
      let rPath = '/item/'+request.params.itemid;
      response.redirect(rPath);
      done();
    });
  });
});

app.get('/delete/:itemid', (request,response) => {  // 1 - Delete Route
  let info = request.body;
  let sql = "UPDATE items SET itemvisible = false WHERE items.itemid = '" + request.params.itemid + "'";

  pool.connect((err, client, done) => {  // 2 - Pool Connection
  if (err) console.log("Pool connection error :" + err);
    client.query(sql, (queryErr, result) => { // 3 - Set Item to DELETE
      if (queryErr) console.log(queryErr);
      
      let sql = "SELECT * FROM users WHERE email = '" + request.cookies.email + "'";
      client.query(sql, (err,res) => {  // 4 - Read User Karma
  
        let karma = res.rows[0].karma - 1;
        let cmd = "UPDATE users SET karma = '" + karma + "' WHERE email = '" + request.cookies.email + "'";
        client.query(cmd, (err, result) => {  //5 Write User Karma
          if (err) console.log(err);
          
          response.redirect('/');
          done();
        }); // 5
      }); // 4
    }); // 3
  }); // 2
}); // 1

app.get('/item/:itemid', (request,response) => {
  pool.connect(( err, client, done) => {

      let sql = "SELECT * FROM items WHERE itemid = '" + request.params.itemid + "'";
      client.query(sql, (err,res) => {
      if (err) console.log(err);

        if (request.cookies.loggedin == "true") {
          if (res.rows[0].originid == request.cookies.userid){
            response.render('useritem', {user : res.rows[0], firstname : request.cookies.firstname, owner: true});
            done();
          } else { // not your item
            response.render('useritem', {user : res.rows[0], firstname : request.cookies.firstname});
            done();
          }  
        } else {
          // Public view
          response.render('item', {user : res.rows[0], message : "Register or log in to request for items."});
          done();
        }
      });
    });
});

/** ================================
 * Listen to requests on port 3000
 * =================================*/
//app.listen(3000, () => console.log('Listen Port: 3000'));
const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, () => console.log('Listen port: '+PORT+''));
