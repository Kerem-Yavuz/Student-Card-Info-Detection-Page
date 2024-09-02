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
    //host: "172.18.1.230",
    //user: "root",
    //password: "Selim123!",
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
        let userQuery = 'SELECT groupID FROM login.users WHERE BINARY username = ?';

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
                case 1: // For game page
                    priv = 'game_priv';
                    break;
                case 2: // For table page 
                    priv = 'table_priv';
                    break;
                case 3: //for text detection page
                    priv = 'image_priv';
                    break;
                default:
                    return res.status(400).send('Invalid privilege type');
            }

            // Construct the SQL query
            let usernamequery = [`"${username}"`];
            
            let privQuery = `SELECT * FROM users JOIN login.groups ON users.groupID = login.groups.groupID JOIN group_privileges on groups.privID = group_privileges.group_privilege_id  WHERE BINARY users.username = ${usernamequery} AND group_privileges.${priv};`;

            // Execute the privilege check query
            con.query(privQuery, (error, privResults) => {
                if (error) {
                    console.error('Database query error checking privileges:', error);
                    return res.status(500).send('Database query error');
                }

                if (privResults.length > 0) {
                    return next();
                } else {
                    
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
            
            res.clearCookie('token');
            return res.redirect("/anasayfa");
        }
    }
    next();
});

app.get("/anasayfa", (req,res) => {
    res.render("main", {
        title: 'Anasayfa',
        loggedin: !!req.cookies.token,
        username: req.user ? req.user.username : null
    });
});

app.get('/logout', (req, res) => {
    res.clearCookie('token');
    res.redirect('/anasayfa');
});

app.get('/', (req, res) => {
    res.redirect('/anasayfa');
});

app.get("/uploadImage",isAuthenticated, isHavePriv(3), (req,res) => {
    res.render("uploadImage",{
        title: 'Text Detection',
        loggedin: !!req.cookies.token,
        username: req.user ? req.user.username : null
    });
});

app.get("/game",isAuthenticated, isHavePriv(1), (req,res) => {
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
    
    let query = 'SELECT * FROM login.users WHERE BINARY username = ?;';
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
                res.redirect("/uploadImage");
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
    let usercheck = 'SELECT * FROM login.users WHERE BINARY username = ?;';
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
        

        const ocrOutput = replaceNewlines(text);

        const info = {};
        
        // Helper function to clean and normalize text
        function cleanText(text) {
            return text.replace(/[\s:]+/g, ' ').trim().toLowerCase();
        }

        function replaceNewlines(text) {
            return text.replace(/\n+/g, ' ');
        }
        
        // Patterns for extraction with potential OCR variations
        const patterns = {
            tckimlikno: /t\.?c\.?\s*kimlik\s*no\s*[:\s]*(\d{11})/i, // T.C. Kimlik No - 11 digits
            ad: /ad[iı]\s*[:\s]*([\wşŞçÇğĞıİöÖüÜ]+)/i, // First name
            soyad: /soyadı\s*[:\s]*([\wşŞçÇğĞıİöÖüÜ]+)/i, // Last name
            ogrencino: /öğrenci\s*no\s*[:\s]*(\d{8})/i, // Student Number - 8 digits
            fakulte: /fak\.\s*\/?\s*ens\.\s*\/?\s*yo\s*[:\s]*([\wşŞçÇğĞıİöÖüÜ\s\.]+?Fak\.)/i, // Faculty ending with "Fak."
            bolum: /bölüm\s*\/\s*program\s*[:\s]*([\wşŞçÇğĞıİöÖüÜ\s]+?Bölümü)/i // Department/Program ending with "Bölümü"
        };
        
        // Extract data using patterns
        for (const [key, pattern] of Object.entries(patterns)) {
            const match = ocrOutput.match(pattern);
            if (match) {
                info[key] = match[1].trim();
                
            }
            if(!match)
            {
                
                info[key] = key + " Not Found";
            }
        }

        
        randomImgName = generateRandomString(10);//create global name for the image
       
        /*let tckimlikno = (info["tckimlikno"]);
        let ad = (info["ad"]);
        let soyad = (info["soyad"]);
        let ogrencino = (info["ogrencino"]);
        let fakulte = (info["fakulte"]);
        let bolum = (info["bolum"]);

        let outputQuery = `INSERT INTO \`login\`.\`outputs\` 
(\`output_name\`, \`output_surname\`, \`output_tckimlikno\`, \`output_student_id\`, \`output_faculty\`, \`output_department\`, \`output_imageName\`) 
VALUES ('${ad}', '${soyad}', '${tckimlikno}', '${ogrencino}', '${fakulte}', '${bolum}', '${randomImgName}');`;
        con.query(outputQuery, function (err, results) {
            if (err) {
                return res.status(500).send('Database query failed.');
            }
            
        });*/   //BURAYI KAPATMAMIZIN SEBEBİ ONAYLANDIKTAN SONRA DB YE YOLLANMASI ONAYLANMADAN DBYE KAYDETMESİNİ İSTİYORSAK BUNU AÇICAZ
        
        

        // Terminate the worker
        await worker.terminate();

        // Delete the file after processing
        await fs.unlink(imagePath);

        res.json({ text,info });
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
    let date = new Date();
    let year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0'); // Months are zero-based
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    result = year+month+day+hours+minutes+seconds+ "-" + result;
    return result;
}

const imagesDir = path.join(__dirname, 'uploads/images/');



app.post('/upload', async (req, res) => {  //upload works after perforOCR if the client side finds the face  
    try {
        const { imgData } = req.body;

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

app.post('/submit-output-data', (req, res) => {
    const { name, surname, tckimlikno, studentno, faculty, department } = req.body;

    const query = `
    INSERT INTO \`outputs\` 
    (\`output_name\`, \`output_surname\`, \`output_tckimlikno\`, \`output_student_id\`, \`output_faculty\`, \`output_department\`, \`output_imageName\`) 
    VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    const values = [name, surname, tckimlikno, studentno, faculty, department, randomImgName];
    
    con.query(query, values, (err, result) => {
        if (err) {
            res.redirect('/uploadImage');
        } else {
            // Redirect to the confirmation page with submitID assigned to randomImgName
            res.send(randomImgName);
        }
        
    });
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
