var mysql = require('mysql');
var express = require("express");
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
var app = express();
var path = require('path');
var session = require('express-session');
var cookieParser = require('cookie-parser');

const JWT_SECRET = 'your_jwt_secret_key'; // Change this to a strong secret key

app.set('view engine', 'ejs');
app.use(express.static(path.join(__dirname,"/public")));
app.use(cookieParser());

var con = mysql.createConnection({//mysql connections
    host: "localhost",
    user: "kerem",
    password: "150921",
    database: "login",
    port: 3306
    });

con.connect(function(err) {
        if (err) throw err;
        console.log("Connected to MySQL database!");
    });

app.use(session({
    secret: 'asdfhgdsoim',
    resave: false,
    checkerror: false,
    saveUninitialized: true,
    cookie: { secure: false } // Set to true if using HTTPS
}));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

function isAuthenticated(req, res, next) {
    const token = req.cookies.token;
    if (!token) {
        return res.redirect('/login');
    }

    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) {
            res.clearCookie('token');
            return res.redirect('/login');
        }
        req.user = decoded;
        req.session.checkerror = false;
        next();
    });
}

function isHavePriv(privType) {
    return function(req, res, next) {
        let username = req.user.username;

        // SQL query to get the user's groupID based on username
        let userQuery = 'SELECT groupID FROM login.users WHERE username = ?';

        con.query(userQuery, [username], (error, userResults) => {
            if (error) {
                console.error('Database query error getting groupID:', error);
                return res.status(500).send('Database query error');
            }

            if (userResults.length === 0) {
                return res.status(404).send('User not found');
            }

            let groupID = userResults[0].groupID;

            // Variables for constructing the query
            let priv;

            // Determine the condition field based on privType
            switch (privType) {
                case 1: // For tablePriv
                    priv = 'tablePriv';
                    break;
                case 2: // For namePriv
                    priv = 'infoPriv';
                    break;
                default:
                    return res.status(400).send('Invalid privilege type');
            }

            // Construct the SQL query
            let usernamequery = [`"${username}"`];
            
            let privQuery = `SELECT tablePriv FROM user_privileges JOIN users ON users.groupID = user_privileges.privID WHERE users.username = ${usernamequery} AND user_privileges.${priv};`;

            // Execute the privilege check query
            con.query(privQuery, [groupID], (error, privResults) => {
                if (error) {
                    console.error('Database query error checking privileges:', error);
                    return res.status(500).send('Database query error');
                }

                if (privResults.length > 0) {
                    return next();
                } else {
                    console.log(privResults);
                    return res.redirect('/anasayfa');
                }
            });
        });
    };
}

app.use((req, res, next) => {
    if (req.cookies.token) {
        try {
            const decoded = jwt.verify(req.cookies.token, JWT_SECRET);
            req.user = decoded; // Set the decoded token as req.user
        } catch (err) {
            console.error('Token verification failed:', err);
            res.clearCookie('token');
            return res.redirect("/anasayfa");
        }
    }
    next();
});

app.get("/info", isAuthenticated, isHavePriv(2), (req,res) => {
    res.render("info", {
        title: 'Info',
        loggedin: !!req.cookies.token,
        username: req.user ? req.user.username : null,
        password: req.cookies.token
    });
});

app.get("/anasayfa", (req,res) => {
    res.render("main", {
        title: 'Anasayfa',
        loggedin: !!req.cookies.token,
        username: req.user ? req.user.username : null
    });
});

app.get("/table", isAuthenticated, isHavePriv(1),  (req,res) => { //gets all values from data for /anasayfa
    let  query = 'SELECT id, sehir_adi FROM webfinal.sehirler';
    con.query(query, function (err, datas) {
        res.render('DB', {
            data: datas,           // Pass the data from your query
            title: 'Tablo',        // Page title
            loggedin: !!req.cookies.token, // Session variables
            username: req.user.username
        });
    });
});

app.get("/table/arama",isAuthenticated, isHavePriv(1), (req, res) => { // gets values for given queries
    const nesne = {
        kosul: req.query.kosul,
        aramaturu: req.query.aramaturu,
    };

    let query;
    let values;

    if (nesne.aramaturu === "id") {
        query = 'SELECT id, sehir_adi FROM webfinal.sehirler WHERE id LIKE ?';
        values = [`%${nesne.kosul}%`];
    } 
    else if (nesne.aramaturu === "sehir_adi") {
        query = 'SELECT id, sehir_adi FROM webfinal.sehirler WHERE sehir_adi LIKE ?';
        values = [`%${nesne.kosul}%`];
    }

    con.query(query, values, function (err, datas) {
        if (err) {
            return res.status(500).send('Database query failed.');
        }
        res.render('DB', {
            data: datas,           // Pass the data from your query
            title: 'Tablo',        // Page title
            loggedin: !!req.cookies.token, // Session variables
            username: req.user.username
        });
    });
});

app.get("/login", (req,res)=>
{
    res.render("login", {
        title: 'Giriş',
        checkerror: req.session.checkerror,
        loggedin: !!req.cookies.token,
        username: req.user ? req.user.username : null
    } );
    
});

app.get("/login/check", (req, res) => {
    const person = {
        username: req.query.username,
        password: req.query.password
    };
    let hashedPassword = hashPassword(person.password);
    
    let query = 'SELECT * FROM login.users WHERE username = ?;';
    let name = [person.username];
    
    con.query(query, name, function (err, results) {
        if (err) {
            return res.status(500).send('Database query failed.');
        }
       
        if (results.length > 0) {
            let storedHashedPassword = results[0].password;
            if (storedHashedPassword === hashedPassword) {
                const token = jwt.sign({ username: person.username }, JWT_SECRET, { expiresIn: '1h' });
                res.cookie('token', token, { httpOnly: true });
                req.session.checkerror = false;
                res.redirect("/table");
            } else {//Wrong password
                req.session.checkerror = true;
                res.redirect("/login");
            }
        } else {//Wrong username
            req.session.checkerror = true;
            res.redirect("/login");
        }
    });
});

app.get("/signup", (req,res)=>
    {
        res.render("signup", {
            title: 'Kayıt Ol',
            loggedin: !!req.cookies.token,
            username: req.user ? req.user.username : null
        });
    });

app.get("/signup/check", (req,res)=>
{
    const person =
    {
        username: req.query.username,
        password: req.query.password
    }
    let usercheck = 'SELECT * FROM login.users WHERE username = ?;';
    let name = [person.username];
    let hashedPassword = hashPassword(person.password);

    con.query(usercheck, name, function (err, results) {
        if (err) {
            return res.status(500).send('Database query failed.');
        }
        
        if (results.length > 0) {
            res.send("you already have account");
        } else {
            let createUserQuery = `INSERT INTO login.users VALUES("${person.username}","${hashedPassword}",2,0);`;//creates user in users table with hashed password but they only have priv for name page

            con.query(createUserQuery, function (err, result) {
                if (err) {
                    console.error("Failed to create user:", err);
                    return res.status(500).send("Failed to create user");
                }
                res.redirect("/login");
            });
        }
    });
});

app.get('/logout', (req, res) => {
    res.clearCookie('token');
    res.redirect('/anasayfa');
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
