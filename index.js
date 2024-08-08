var mysql = require('mysql');
var express = require("express");
const crypto = require('crypto');
var app = express();
var path = require('path');
var session = require('express-session');

app.set('view engine', 'ejs');
app.use(express.static(path.join(__dirname,"/public")));


var con = mysql.createConnection({//mysql connections
    host: "localhost",
    user: "kerem",
    password: "150921",
    database: "webfinal",
    port: 3306
    });

con.connect(function(err) {
        if (err) throw err;
        console.log("Connected to MySQL database!");
    });

    app.use(session({
        secret: 'asdfhgdsoim',
        resave: false,
        saveUninitialized: true,
        cookie: { secure: false } // Set to true if using HTTPS
      }));

    app.use(express.urlencoded({ extended: true }));
    app.use(express.json());

    function isAuthenticated(req, res, next) {
        if (req.session.loggedin) {
          return next();
        } else {
          res.redirect('/login'); // Redirect to login if not authenticated
        }
      }

      function isHavePriv(req, res, next) {
        let username = req.session.username;
        let grantee = `'${username}'@'localhost'`; // Construct the GRANTEE value in JavaScript
    
        let query = `
            SELECT PRIVILEGE_TYPE 
            FROM information_schema.SCHEMA_PRIVILEGES 
            WHERE GRANTEE = ? 
            AND PRIVILEGE_TYPE = 'SELECT' 
            AND TABLE_SCHEMA = 'webfinal'
        `;
    
        con.query(query, [grantee], (error, results) => {
            if (error) {
                console.error('Database query error priv:', error); // Log error details
                return res.status(500).send('Database query error priv');
            }
    
            if (results.length > 0) { // Fixed typo: `lenght` to `length`
                return next();
            } else {
                return res.status(403).send('Dont have Privilages');
            }
        });
    }


    app.get("/anasayfa", (req,res) => {
        res.render("main");
    });

    app.get("/table", isAuthenticated, isHavePriv,  (req,res) => { //gets all values from data for /anasayfa
        let  query = 'SELECT id, sehir_adi FROM sehirler';
        con.query(query, function (err, datas) {
            res.render('DB', { data: datas });
        });
    });

    

    app.get("/table/arama",isAuthenticated, isHavePriv, (req, res) => { // gets values for given queries
        const nesne = {
            kosul: req.query.kosul,
            aramaturu: req.query.aramaturu,
        };
    
        let query;
        let values;
    
        if (nesne.aramaturu === "id") {
            query = 'SELECT id, sehir_adi FROM sehirler WHERE id LIKE ?';
            values = [`%${nesne.kosul}%`];
        } 
        else if (nesne.aramaturu === "sehir_adi") {
            query = 'SELECT id, sehir_adi FROM sehirler WHERE sehir_adi LIKE ?';
            values = [`%${nesne.kosul}%`];
        }
    
        con.query(query, values, function (err, datas) {
            if (err) {
                return res.status(500).send('Database query failed.');
            }
            res.render('DB', { data: datas });
        });
    });


    
    


    app.get("/login", (req,res)=>
    {
        res.render("login");
    });

    app.get("/login/check", (req, res) => {
        const person = {
            username: req.query.username,
            password: req.query.password
        };
        let hashedPassword = hashPassword(person.password);
        
        let query = 'SELECT authentication_string FROM mysql.user WHERE user = ?;';
        let name = [person.username];
        
        con.query(query, name, function (err, results) {
            if (err) {
                return res.status(500).send('Database query failed.');
            }
           
            if (results.length > 0) {
                let storedHashedPassword = results[0].authentication_string;
                console.log(storedHashedPassword);
                console.log(hashedPassword);
                if (storedHashedPassword === hashedPassword) {
                    req.session.loggedin = true;
                    req.session.username = person.username; //passwords matched so changes session
                    res.redirect("/table");
                } else {
                    res.send('Authentication failed.');
                }
            } else {
                res.send('User not found.');
                //kayıt etmeye yönlendir 
            }
        });
    });

    app.get("/signup", (req,res)=>
        {
            res.render("signup");
        });
    
    app.get("/signup/check", (req,res)=>
    {
        const person =
        {
            username: req.query.username,
            password: req.query.password
        }
        let usercheck = 'SELECT authentication_string FROM mysql.user WHERE user = ?;';
        let name = [person.username];

        con.query(usercheck, name, function (err, results) {
            if (err) {
                return res.status(500).send('Database query failed.');
            }
            
            if (results.length > 0) {
                res.send("you already have account");
            } else {
                

                let createUserQuery = `CREATE USER '${person.username}'@'localhost' IDENTIFIED  WITH mysql_native_password BY '${person.password}';`;//creates user with mysql native password
                let grantPrivilegesQuery = `GRANT SELECT ON webfinal.* TO '${person.username}'@'localhost';`;//gives them a select privilage on webfinal
                

                con.query(createUserQuery, function (err, result) {
                    if (err) {
                        console.error("Failed to create user:", err);
                        return res.status(500).send("Failed to create user");
                    }
                
                    con.query(grantPrivilegesQuery, function (err, result) {
                        if (err) {
                            console.error("Failed to grant privileges:", err);
                            return res.status(500).send("Failed to grant privileges");
                        }
                
                        res.redirect("/login");
                    });
                });

            }
        });
        
    });
   


    app.get('/', (req, res) => {
        
        res.redirect('/anasayfa');
      });


    

    function hashPassword(password) {
        // Hash the password with SHA-1 in binary format
    const firstHashBinary = crypto.createHash('sha1').update(password, 'utf8').digest('binary');

    // Hash the binary hash with SHA-1 again and output in hexadecimal format
    const secondHashHex = crypto.createHash('sha1').update(firstHashBinary, 'binary').digest('hex');

    // Format the result: uppercase and prepend an asterisk
    return '*' + secondHashHex.toUpperCase();
    }



let port = 8001;
let ip = "0.0.0.0";
    
let server = app.listen(port,ip, (error) => {
    if(error) throw error;
        console.log("Server is running on:",ip, port);
    });
