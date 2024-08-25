var mysql = require('mysql');
var express = require("express");
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
var app = express();
var path = require('path');
var session = require('express-session');
var cookieParser = require('cookie-parser');
const fs = require('fs').promises;
const { createWorker } = require('tesseract.js');
const sharp = require('sharp'); // Ensure sharp is installed and required

const JWT_SECRET = 'your_jwt_secret_key'; // Change this to a strong secret key
const uploadsDir = path.join(__dirname, 'uploads');
const uploadImagesDir = path.join(__dirname, 'uploads','images');
let randomImgName;

app.set('view engine', 'ejs');
app.use(express.static(path.join(__dirname,"/public")));
app.use(cookieParser());

app.use(express.json({ limit: '50mb' })); // Increase the limit if needed
app.use(express.urlencoded({ extended: true }));

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public/data')));
app.use('/uploads/images', express.static(uploadImagesDir));


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


            // Variables for constructing the query
            let priv;

            // Determine the condition field based on privType
            switch (privType) {
                case 1: // For tablePriv
                    priv = 'table_priv';
                    break;
                case 2: // For namePriv
                    priv = 'info_priv';
                    break;
                case 3: 
                    priv = 'image_priv';
                    break;
                default:
                    return res.status(400).send('Invalid privilege type');
            }

            // Construct the SQL query
            let usernamequery = [`"${username}"`];
            
            let privQuery = `SELECT * FROM users JOIN login.groups ON users.groupID = login.groups.groupID JOIN group_privileges on groups.privID = group_privileges.group_privilege_id  WHERE users.username = ${usernamequery} AND group_privileges.${priv};`;

            // Execute the privilege check query
            con.query(privQuery, (error, privResults) => {
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

app.get("/uploadImage",isAuthenticated, isHavePriv(3), (req,res) => {
    res.render("uploadImage",{
        title: 'Text Detection',
        loggedin: !!req.cookies.token,
        username: req.user ? req.user.username : null
    });
});

app.get("/game",isAuthenticated, isHavePriv(3), (req,res) => {
    res.render("game",{
        title: 'Text Detection',
        loggedin: !!req.cookies.token,
        username: req.user ? req.user.username : null
    });
});

app.get('/getImages',isAuthenticated, isHavePriv(3), async (req, res) => { // Changed
    try {
        const files = await fs.readdir(uploadImagesDir);
        const images = files.filter(file => /\.(jpg|jpeg|png|webp)$/i.test(file));

        let imageHTML = images.map(image => `<img src="/uploads/images/${image}" alt="${image}" style="width:150px; margin:10px;">`).join('');
        imageHTML = `<html><body>${imageHTML}</body></html>`;

        res.send(imageHTML);
    } catch (err) {
        console.error('Error reading images directory:', err);
        res.status(500).send('Error reading images directory');
    }
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
    req.session.checkerror = false;
    req.session.save();
});

app.get("/login/check", (req, res) => {
    const person = {
        username: req.query.username,
        password: req.query.password
    };
    let hashedPassword = hashPassword(person.password);// hashes the inputed password
    
    let query = 'SELECT * FROM login.users WHERE username = ?;';
    let name = [person.username];
    
    con.query(query, name, function (err, results) {
        if (err) {
            return res.status(500).send('Database query failed.');
        }
       
        if (results.length === 1) {
            let sqlStoredHashedPassword = results[0].password; // we have already get the password with the first query so we are just checking it here
            if (sqlStoredHashedPassword === hashedPassword) {
                const token = jwt.sign({ username: person.username }, JWT_SECRET, { expiresIn: '1h' });// creates token 
                res.cookie('token', token, { httpOnly: true }); //stores that token in cookie
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
            let createUserQuery = `INSERT INTO login.users VALUES("${person.username}","${hashedPassword}",2,0);`;// Creates user with person.username, person.password , groupID = 2 , and the automatic userID

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

app.post('/performOCR', async (req, res) => {
    try {
        if (!req.body || !req.body.imgData) {
            return res.status(400).json({ error: 'No image data provided' });
        }

        const { imgData } = req.body;

        
        const base64Data = imgData.replace(/^data:image\/png;base64,/, '');

        const imagePath = path.join(uploadsDir, 'temp.png');//create temporary image

        
        await fs.mkdir(uploadsDir, { recursive: true });

        
        await sharp(Buffer.from(base64Data, 'base64')).toFile(imagePath);

        
        const worker = await createWorker();

        
        await worker.setParameters({// whitelist of chars that we want to see in our ocr result
            tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyzçğıöşüÇĞİÖŞÜ1234567890./ '
        });

        // Perform OCR on the image file
        const { data: { text } } = await worker.recognize(imagePath , 'tur');
        console.log('Detected text:', text);
        

        const ocrOutput = replaceNewlines(text);

        const data = {};
        
        // Helper function to clean and normalize text
        function cleanText(text) {
            return text.replace(/[\s:]+/g, ' ').trim().toLowerCase();
        }

        function replaceNewlines(text) {
            return text.replace(/\n+/g, ' ');
        }
        
        // Patterns for extraction with potential OCR variations
        const patterns = {
            tckimlikno: /t\.?c\.?\s*kimlik\s*no\s*[:\s]*(\d{11})/i, // T.C. Kimlik No - 11 haneli
            ad: /ad[iı]\s*[:\s]*([\wşŞçÇğĞıİöÖüÜ]+)/i,
            soyad: /soyadı\s*[:\s]*([\wşŞçÇğĞıİöÖüÜ]+)/i,
            ogrencino: /öğrenci\s*no\s*[:\s]*(\d{8})/i, // Öğrenci No - 8 haneli
            fakulte: /fak\.\s*\/?\s*ens\.\s*\/?\s*yo\s*[:\s]*([\wşŞçÇğĞıİöÖüÜ\s\.]+)/i,
            bolum: /bölüm\s*\/\s*program\s*[:\s]*([\wşŞçÇğĞıİöÖüÜ\s]+)/i
        };
        
        // Extract data using patterns
        for (const [key, pattern] of Object.entries(patterns)) {
            const match = ocrOutput.match(pattern);
            if (match) {
                data[key] = match[1].trim();
            }
        }
        
        // Log the extracted data
        console.log(JSON.stringify(data, null, 2));
    
        randomImgName = generateRandomString(10);//create global name for the image

        addToJson(JSON.stringify(data, null, 2));//add the name of the image to the json file
        
        

        // Terminate the worker
        await worker.terminate();

        // Delete the file after processing
        await fs.unlink(imagePath);

        res.json({ text });
    } catch (err) {
        console.error('OCR error:', err);
        res.status(500).send('Error processing image');
    }
});

function generateRandomString(length) {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';// list of char that will be used in name
    let result = '';
    for (let i = 0; i < length; i++) {
        const randomIndex = Math.floor(Math.random() * characters.length);
        result += characters[randomIndex];
    }
    return result;
}

const imagesDir = path.join(__dirname, 'uploads/images/');



app.post('/upload', async (req, res) => {    
    try {
        const { imgData } = req.body;

        console.log(randomImgName);
        if(randomImgName === undefined)//i dont know but when i restart node index.js it calls this upload function
            return;                    //when it calls at the start without image upload randomImgName will be undefined 
                                        //and it creates undefined.png with the image that is in the not reloaded page
                                        //so this prevents that
        
        // Extract base64 data from the data URL
        const base64Data = imgData.replace(/^data:image\/png;base64,/, '');

        const imagePath = path.join(imagesDir, `${randomImgName}.png`);

        // Ensure the uploads directory exists
        await fs.mkdir(imagesDir, { recursive: true });

        // Convert base64 data to an image file using sharp
        await sharp(Buffer.from(base64Data, 'base64')).toFile(imagePath);

    } catch (error) {
        console.error('Error processing image upload:', error);
        res.status(500).send('An error occurred while processing your request.');
    }
});

function addToJson(data) {
        
        if (typeof data === 'string') {
            //Parses Json String
            let dataObject = JSON.parse(data);

            // Check dataObject
            if (typeof dataObject === 'object' && !Array.isArray(dataObject)) {
                //Assigns new Data
                let newData = {
                    fileName: `${randomImgName}.png`,
                };
    
                Object.assign(dataObject,newData);
    
                // write the updated json into newjson
                let newJson = JSON.stringify(dataObject, null, 2);
    
                // write the newJson into to the data.json file
                fs.writeFile("data.json", newJson, (err) => {
                    if (err) throw err;
                    console.log("newData added");
                   });
            } 

        } 
}












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
