var mysql = require('mysql');
var express = require("express");
const crypto = require('crypto');
var app = express();
var path = require('path');

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


    app.get("/anasayfa", (req,res) => {
        res.render("main");
    });

    app.get("/table", (req,res) => { //gets all values from data for /anasayfa
        let  query = 'SELECT id, sehir_adi FROM sehirler';
        con.query(query, function (err, datas) {
            res.render('DB', { data: datas });
        });
    });

    

    app.get("/table/arama", (req, res) => { // gets values for given queries
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
        console.log(hashedPassword);
        let query = 'SELECT authentication_string FROM mysql.user WHERE user = ?;';
        let name = [person.username];
    
        con.query(query, name, function (err, results) {
            if (err) {
                return res.status(500).send('Database query failed.');
            }
            console.log(results);
            if (results.length > 0) {
                let storedHashedPassword = results[0].authentication_string;
                if (storedHashedPassword === hashedPassword) {
                    // do something if the passwords match
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
            password: req.query.username
        }
        
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
