let imgElement = document.getElementById("imageSrc");
let inputElement = document.getElementById("fileInput");
let canvas = document.getElementById("canvasOutput");
let ctx = canvas.getContext('2d');
let points = [];
const maxPoints = 4;
let originalImageData = null; // To store the original image data for OpenCV processing

let faceImg = document.getElementById("faceimageSrc");
let faceinputElement = document.getElementById("resetFaceImage");
let faceCanvas = document.getElementById("faceCanvas");
let facectx = faceCanvas.getContext('2d');

let currentimg;

faceinputElement.addEventListener("change", (e) => {
    e.preventDefault();
    faceImg.src = URL.createObjectURL(e.target.files[0]);
    faceImg.onload = async function() {
        console.log("Image uploaded Successfully");
        document.getElementById("noFaceFound").style.display = "none";
        document.getElementById("faceretakebutton").style.display = "inline-block";
        // Set canvas dimensions and draw the original image
        faceCanvas.width = faceImg.naturalWidth;
        faceCanvas.height = faceImg.naturalHeight;
        facectx.drawImage(faceImg, 0, 0);

        // Convert the canvas to an OpenCV Mat object
        let src = cv.imread(faceCanvas); // Read the image from the canvas into an OpenCV Mat

        // Display the image using OpenCV
        cv.imshow("outputFace", src);

        // Clear points and add event listener for clicks
        points = [];
        await detectFace(faceImg);

        // Clean up
        src.delete(); // Release memory used by the Mat object
    };
}, false);

inputElement.addEventListener("change", (e) => {
    e.preventDefault();
    imgElement.src = URL.createObjectURL(e.target.files[0]);
    imgElement.onload = function() {
        console.log("Image uploaded Successfully");
        // Set canvas dimensions and draw the original image
        canvas.width = imgElement.naturalWidth;
        canvas.height = imgElement.naturalHeight;
        ctx.drawImage(imgElement, 0, 0);



        document.getElementById("progress-container").style.display = "block";//when image uploaded shows progress-container and hides fileInput button
        inputElement.style.display = "none";


        // Store original image data for OpenCV processing
        originalImageData = canvas.toDataURL('image/png');
        
        // Clear points and add event listener for clicks
        points = [];
        calculateDimensions(points);
        // Process the original image with OpenCV
        processImage(originalImageData);
    };
}, false);


async function updateProgress(progress)
{
    document.getElementById('progressBar').style.width = progress + '%';
    document.getElementById('progressBar').innerText = progress + '%';
    await new Promise(resolve => setTimeout(resolve, 10));// wait 0.01 seconds to better progress bar
    if(progress >= 100)
    {
        document.getElementById("progress-container").style.display = "none";//dont display the progress barr
        document.getElementById("output").style.display = "table";// show the table for changing outputs
        document.getElementById("reset1").style.display = "inline-block";// show the button for uploading new image

        document.getElementById('resetFaceImage').value = '';// resets the value of buttons so that same images can be uploaded
        document.getElementById('fileInput').value = '';
    }
}


function reset()
{   
    location.reload();
}

function valuereset()//For reseting the values that found
{
    document.getElementById('name').value = "";
    document.getElementById('surname').value = "";
    document.getElementById('tckimlikno').value = "";
    document.getElementById('studentno').value = "";
    document.getElementById('faculty').value = "";
    document.getElementById('department').value = "";
}

function checkBeforeReset()//Asks for confirmation before reseting
{
    let userConfirmed = confirm("Devam Etmek İstediğinize Emin Misiniz Kaydedilmeyen Veriler Silinir");
    if(userConfirmed)
    {
        reset();
    }
}

function submit()//sends data to the mysql
{
    document.getElementById("output").style.display = "none";
    document.getElementById("load").style.display = "flex";
    document.getElementById("reset1").style.display = "none";
    let data = {
        name: document.getElementById('name').value,
        surname: document.getElementById('surname').value,
        tckimlikno: document.getElementById('tckimlikno').value,
        studentno: document.getElementById('studentno').value,
        faculty: document.getElementById('faculty').value,
        department: document.getElementById('department').value,
        img: currentimg
    };

    fetch('/submit-output-data',{
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    })
    .then(response => response.text())
    .then(result => {
        document.getElementById("reset2").style.display = "inline-block";
        document.getElementById("load").style.display = "none";
        document.getElementById("confirmbox").style.display = "block";// after got confirm show confirm box and hides loading animation
        document.getElementById("confirm").innerHTML = "ID:" + result;
    })
    .catch(error => {
        console.error('Error:', error);
    });
}

document.addEventListener('keydown', function(event) {

});


let croppedImage;
let img = new Image();

async function processImage(imageData) {
    await updateProgress(10);
    
    img.onload = async function() {
        
        let src = cv.imread(img);
        let threshold = new cv.Mat();
        
        

        // Convert to grayscale and apply threshold or edge detection
        threshold = filter(src);
        cv.imshow("canvasOutput", threshold);//output it into canvasOutput so we can get the data and send it to the performOCR
        cv.imshow("canvasoutputrect", threshold);
        
        await updateProgress(15);
        let dataURL = document.getElementById("canvasOutput").toDataURL("image/png");
        await performOCR(dataURL);
        
        await updateProgress(40);
        cv.imshow("outputFace", src);//output into outputFace so that detectFace function can get it from there
        detectFace(img);

        // Clean up
        src.delete();
        threshold.delete();
    };
    img.src = imageData;
}




let classifier;
async function detectFace(imgInput0) {
    
    let faceCanvas = document.getElementById("outputFace"); // faceCanvas is the id of faceCanvas tag

    // Load the image from the canvas
    let src = cv.imread(faceCanvas);
    let dst = new cv.Mat();
    let gray = new cv.Mat();
    let faces = new cv.RectVector();
    
    let faceCascadeFile = 'haarcascade_frontalface_default.xml'; // path to xml
    
    
    await updateProgress(45);
    console.log(typeof classifier);
    if(classifier === undefined)
    {
        classifier = new cv.CascadeClassifier();
        try {
            const response = await fetch(faceCascadeFile);
            const arrayBuffer = await response.arrayBuffer();
            const byteArray = new Uint8Array(arrayBuffer);
            
            // Create a temporary file in the virtual file system
            const file = new Uint8Array(byteArray);
            cv.FS_createDataFile('/', faceCascadeFile, file, true, false);
            classifier.load(faceCascadeFile);
            processfaceCanvas();
        } catch (error) {
            console.error('Error loading cascade file:', error);
            return;
        }
        
    }
    else
    {
        processfaceCanvas();
    }
    

    async function processfaceCanvas() {
        let foundedFaces= 0;
        // Convert the image to grayscale
        cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY, 0);
        
        await updateProgress(55);
        try {
            // Detect faces
            classifier.detectMultiScale(gray, faces, 1.1, 15, 0);
            
            await updateProgress(60);
        } catch (err) {
            console.log(err);
        }

        // Draw rectangles around the detected faces
        for (let i = 0; i < faces.size(); ++i) {
            let face = faces.get(i);
            
            if(face.width >= src.cols*0.05 && face.height >= src.rows*0.05)
            {
                
                foundedFaces++;

                let point1; 
                let point2;
                let point3;
                let point4;
                if(src.cols>src.rows)// for checking if the image is in portrait or landscape so that cropped image will be more accurate
                {
                    point1 = new cv.Point(face.x-src.rows * 0.03, face.y-src.rows * 0.03);
                    point2 = new cv.Point(face.x + face.width+src.rows * 0.03, face.y + face.height+src.rows * 0.03);
                    point3 = new cv.Point(face.x-src.rows *0.03, face.y+ face.height+src.rows * 0.03);
                    point4 = new cv.Point(face.x + face.width+src.rows * 0.03, face.y-src.rows * 0.03);
                }
                else
                {
                    point1 = new cv.Point(face.x-src.cols * 0.03, face.y-src.cols * 0.03);
                    point2 = new cv.Point(face.x + face.width+src.cols * 0.03, face.y + face.height+src.cols * 0.03);
                    point3 = new cv.Point(face.x-src.cols *0.03, face.y+ face.height+src.cols * 0.03);
                    point4 = new cv.Point(face.x + face.width+src.cols * 0.03, face.y-src.cols * 0.03);
                }

                points =
                [
                    point1,
                    point2,
                    point3,
                    point4
                ];
                
                await updateProgress(80);
                orderPoints(points);//orders points before sending it to the crop
                cropImage(imgInput0); //crops the face that founded
                
                await updateProgress(100);
                
            }
        }
        if(foundedFaces === 0)// we will put upload face image button here
        {
            alert("No Faces Found in Image");
            document.getElementById("cropped").style.display ="none";
            document.getElementById("noFaceFound").style.display= "flex";
            document.getElementById("resetFaceImage").style.display = "none";
            document.getElementById("faceretakebutton").style.display = "none";
            currentimg = undefined;
            updateProgress(100);
        }

        // Display the result on the canvas
        cv.imshow("outputFace", src);

        // Clean up
        src.delete();
        dst.delete();
        gray.delete();
        faces.delete();
        
    }
}



async function cropImage(imgInput)
{
    const cropCanvas = document.getElementById('cropped');
    const ctx = cropCanvas.getContext('2d');
    cropCanvas.style.display = "flex";
    document.getElementById("faceretakebutton").style.display = "inline-block";
    // Calculate the crop area from the points
    const cropX = Math.min(...points.map(p => p.x));
    const cropY = Math.min(...points.map(p => p.y));
    const cropWidth = Math.max(...points.map(p => p.x)) - cropX;
    const cropHeight = Math.max(...points.map(p => p.y)) - cropY;

    // Set canvas size to the crop size
    cropCanvas.width = cropWidth;
    cropCanvas.height = cropHeight;

    // Draw the cropped area on the canvas
    ctx.drawImage(imgInput, cropX, cropY, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight);

    // Detect the image format
    const originalFormat = imgInput.src.split(';')[0].split('/')[1];  // Extract the format from the image source
    const validFormats = ['png', 'jpeg', 'jpg', 'webp']; // Add more formats if needed

    let format = 'png'; // Default format
    if (validFormats.includes(originalFormat)) {
        format = originalFormat;
    }

    // Convert canvas to a data URL (base64) and send to server
    const croppedImage = cropCanvas.toDataURL(`image/${format}`);
    currentimg = croppedImage;
}


function filter(input)
{
    let gray = new cv.Mat();
    let threshold = new cv.Mat();
    cv.cvtColor(input, gray, cv.COLOR_RGB2GRAY, 0);

        // Apply binary thresholding
    //cv.threshold(gray, threshold, 215,255,cv.THRESH_BINARY);
    cv.adaptiveThreshold(gray, threshold, 255, cv.ADAPTIVE_THRESH_GAUSSIAN_C, cv.THRESH_BINARY, 63,15);
    
    return threshold;
}

function orderPoints(points)
{
        
        points.sort((a, b) => a[1] - b[1]);
        
        let smallestTwo = points.slice(0, 2);
        let largestTwo = points.slice(2);
       
        smallestTwo.sort((a, b) => a[0] - b[0]);
        largestTwo.sort((a, b) => b[0] - a[0]);

        points[0] = smallestTwo[0]; //top-left
        points[1] = smallestTwo[1]; //top-right
        points[2] = largestTwo[0];  //bottom-right
        points[3] = largestTwo[1]; // bottom-left

        //it still takes a little bit of the line so we will take 5px inside each point
        points[0][0] = points[0][0] + 5;
        points[0][1] = points[0][1] + 5;
        points[1][0] = points[1][0] - 5;
        points[1][1] = points[1][1] + 5;
        points[2][0] = points[2][0] - 5;
        points[2][1] = points[2][1] - 5;
        points[3][0] = points[3][0] + 5;
        points[3][1] = points[3][1] - 5;
}


function calculateDimensions(points) {
    if (points.length < 4) return;

    function distance(pt1, pt2) {
        return Math.sqrt(Math.pow(pt1[0] - pt2[0], 2) + Math.pow(pt1[1] - pt2[1], 2));
    }

    let pt1 = points[0]; // Top-left
    let pt2 = points[1]; // Top-right
    let pt3 = points[2]; // Bottom-right
    let pt4 = points[3]; // Bottom-left

    let width_1 = distance(pt1, pt2);
    let width_2 = distance(pt3, pt4);
    let height_1 = distance(pt1, pt4);
    let height_2 = distance(pt2, pt3);

    let max_height = Math.max(height_1, height_2);
    let max_width = Math.max(width_1, width_2);

    window.max_height = Math.round(max_height);
    window.max_width = Math.round(max_width);

    // Store the points for perspective transformation
    window.input_pts = points.map(p => [p[0], p[1]]);
}


async function performOCR(imgData) {
    await updateProgress(20);
    try {
        let response = await fetch('/performOCR', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ imgData })
        });

        await updateProgress(25);

        let data = await response.json();

        await updateProgress(35);

        document.getElementById('detectedText').textContent = data.text;
        document.getElementById("name").value = data.info["ad"];
        document.getElementById("surname").value = data.info["soyad"];
        document.getElementById("tckimlikno").value = data.info["tckimlikno"];
        document.getElementById("studentno").value = data.info["ogrencino"];
        document.getElementById("faculty").value = data.info["fakulte"];
        document.getElementById("department").value = data.info["bolum"];

        await updateProgress(40);
    } catch (error) {
        console.error('Error:', error);
        await updateProgress(0); // Handle error case if needed
    }
}


async function upload(imgData) {
    await fetch('/upload', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ imgData }) // Ensure imgData is a string
    })
    .catch(error => {
        console.error('Error:', error);
    });
    
}