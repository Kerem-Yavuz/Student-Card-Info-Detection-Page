let game = {
  a: [
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0]
  ],
  pointsO: 0,
  pointsX: 0,
  turn: 0,//0 means turn for "O"  1 means turn for "X"
  stop: true,// false means game runs, true means game stops
};


let canvasX = 600;
let canvasY = 600;


// coin flip variables
let coin = {
  startTime: 0,
  durationTime: 1500, // base value = 2000, means 2 seconds
  rotating: false,
  coinValue: 0,
  rotationSpeed: 10, // base value = 10
};

let flipButton;
let startGameButton;





//game box color change variables
let gameLines = {
  startColorTime: 0,
  colorDurationTime: 1000,//minimum it should be 1000 under this creates problem, 1200 recommended
  currentColor: 0,
};



//game end line variables
let endLines = {
startLineTime:-999999,
lineDurationTime: 500,
currentLineTime: 0,
lineLenght: 0,
startX: 0,
startY: 0,
isHorizontal: 0,//0 for horizontal, 1 for vertical,2 for \ ,3 for /
isBlue: true,
};




function setup() {
  let gameCanvas = createCanvas(canvasX, canvasY, WEBGL);
  gameCanvas.parent('game');


  flipButton = createButton('Flip Coin');
  flipButton.show();
  flipButton.position(canvasX * 2, canvasY / 6);
  flipButton.mousePressed(flipCoin);

  // Create the remove button

  startGameButton = createButton('Start Game');
  startGameButton.position(canvasX * 2, canvasY / 6);
  startGameButton.hide();
  startGameButton.mousePressed(function() {
    coin.rotating = false; // Stop animation on remove button click
    var roundElement = document.getElementById("round");
    var roundNumber = parseInt(roundElement.innerHTML); // Get the current round number and convert it to an integer
    roundNumber++; // Increment the round number
    roundElement.innerHTML = roundNumber;
    clear();
    noLoop();
    restart();
    startGameButton.hide();
    // Clear canvas after stopping animation
  });


}


function draw() {




  //GAME END LİNES//
  if (game.stop === true) {
    translate(-canvasX / 2, -canvasY / 2, 0);
    fill(255, 50, 0);
    strokeWeight(canvasX / 40);
    endLines.currentLineTime = millis() - endLines.startLineTime;
    if (endLines.currentLineTime < endLines.lineDurationTime) {
      endLines.lineLenght = map(endLines.currentLineTime, 0, endLines.lineDurationTime, 0, canvasX / 4 * 3);
      stroke('rgba(255,77,77, 0.50)');
      if (endLines.isBlue)
        stroke('rgba(77,77,255,0.50)');


      switch (endLines.isHorizontal) {

        case 0:
          {
            line(endLines.startX - endLines.lineLenght / 2, endLines.startY, endLines.startX + endLines.lineLenght / 2, endLines.startY);
            stroke(255, 200, 200);
            if (endLines.isBlue)
              stroke('rgba(200,200,255,1)');
            strokeWeight(canvasX / 120);
            line(endLines.startX - endLines.lineLenght / 2, endLines.startY, endLines.startX + endLines.lineLenght / 2, endLines.startY);
            break;
          }
        case 1:
          {
            line(endLines.startX, endLines.startY - endLines.lineLenght / 2, endLines.startX, endLines.startY + endLines.lineLenght / 2);
            stroke(255, 200, 200);
            if (endLines.isBlue)
              stroke('rgba(200,200,255,1)');
            strokeWeight(canvasX / 120);
            line(endLines.startX, endLines.startY - endLines.lineLenght / 2, endLines.startX, endLines.startY + endLines.lineLenght / 2);
            break;
          }
        case 2:
          {
            line(endLines.startX - endLines.lineLenght / 2, endLines.startY - endLines.lineLenght / 2, endLines.startX + endLines.lineLenght / 2, endLines.startY + endLines.lineLenght / 2);
            stroke(255, 200, 200);
            if (endLines.isBlue)
              stroke('rgba(200,200,255,1)');
            strokeWeight(canvasX / 120);
            line(endLines.startX - endLines.lineLenght / 2, endLines.startY - endLines.lineLenght / 2, endLines.startX + endLines.lineLenght / 2, endLines.startY + endLines.lineLenght / 2);
            break;
          }
        case 3:
          {
            line(endLines.startX - endLines.lineLenght / 2, endLines.startY + endLines.lineLenght / 2, endLines.startX + endLines.lineLenght / 2, endLines.startY - endLines.lineLenght / 2);
            stroke(255, 200, 200);
            if (endLines.isBlue)
              stroke('rgba(200,200,255,1)');
            strokeWeight(canvasX / 120);
            line(endLines.startX - endLines.lineLenght / 2, endLines.startY + endLines.lineLenght / 2, endLines.startX + endLines.lineLenght / 2, endLines.startY - endLines.lineLenght / 2);
            break;
          }

      }
    }
  }


  //GAME LINES//

  if (game.stop === false) {

    push();//game lines
    translate(-canvasX / 2, -canvasY / 2);
    specularMaterial(255);
    shininess(50);
    pointLight(255, 255, 255, 1, canvasY / 7.5, 100);
    pointLight(255, 255, 255, 1, -canvasY / 7.5, 100);
    pointLight(255, 255, 255, 100, -canvasY / 7.5, 100);
    pointLight(255, 255, 255, -100, -canvasY / 7.5, 100);
    let colorBlue;
    let colorRed;
    let currenColorTime = millis() - gameLines.startColorTime;


    if (currenColorTime < gameLines.colorDurationTime && game.turn === 0) {
      colorRed = map(currenColorTime, 0, gameLines.colorDurationTime, 0, 255);
      fill(colorRed, 50, 255 - colorRed);
      //console.log("Red:" + colorRed);
      //this project made by 8th group, other than us no one can use this code.
    }
    else if (currenColorTime < gameLines.colorDurationTime && game.turn === 1) {
      colorBlue = map(currenColorTime, 0, gameLines.colorDurationTime, 0, 255);
      fill(255 - colorBlue, 50, colorBlue);
      //console.log("Blue:" + colorBlue);
    }//çerçeve rengi
    else {
      fill(gameLines.currentColor);
    }

    if (colorBlue > 245) {
      gameLines.currentColor = color(0, 50, 255);

    }
    if (colorRed > 245) {
      gameLines.currentColor = color(255, 50, 0);
    }



    noStroke();
    rotateZ(PI / 2);
    translate(canvasY / 2, -canvasX / 3, -canvasX / 60);
    box(canvasY, canvasX / 60);
    translate(0, -canvasX / 3, 0);
    box(canvasY, canvasX / 60);

    rotateZ(PI / 2);
    translate(canvasX / 6, canvasY / 6, -canvasX / 60);
    box(canvasY, canvasX / 60);
    translate(0, -canvasY / 3, 0);
    box(canvasY, canvasX / 60);
    pop();//game lines ends
  }



  //COIN//


  // Draw the coin only if coin.rotating or remove button hasn't been pressed
  if (coin.rotating || !startGameButton.mousePressed) {
    translate(canvasX / 2, canvasY / 2);
    let currenTime = millis() - coin.startTime;// calculates time and use it for coin spin duration
    background('rgba(0, 0, 0, 0)');
    // If elapsed time is less than duration, flip the ellipsoid
    if (currenTime < coin.durationTime) {
      let rotation = map(currenTime, 0, coin.durationTime, 0, PI);// if we want to rotate something we have to use angles so we are remapping currenTime values to 0 to PI
      rotateX(rotation * coin.rotationSpeed);
      rotateZ(rotation);
      rotateY(rotation);

    } else {
      noLoop();
      coin.rotating = false;
      startGameButton.show();
      // Stop looping and mark rotation as finished
      if (coin.coinValue < 0.5) {
        game.turn = 1;//changes game.turn to X
        rotateX(PI * 2);//rotate to X side of coin
        console.log("x plays");
        gameLines.currentColor = color(0, 50, 255);// it will change box color when coin stops
      }
      else if (coin.coinValue >= 0.5) {
        game.turn = 0;//changes game.turn to O
        rotateX(PI);//rotate to O side of coin
        console.log("o plays");
        gameLines.currentColor = color(255, 50, 0);// it will change box color when coin stops
      }



    }
    push();
    specularMaterial(50);//to change light and materials of coin
    shininess(10);
    pointLight(255, 255, 255, 1, canvasY / 7.5, 100);
    pointLight(255, 255, 255, 1, -canvasY / 7.5, 100);
    noStroke();


    fill(255, 215, 0);// main coin
    ellipsoid(canvasX / 5, canvasY / 5, canvasX / 100, 24, 16);


    translate(0, 0, -canvasX / 40);//o side of coin
    drawcircle(0, 0);


    translate(0, 0, canvasX / 15);// x side of coin
    drawcross(0, 0);

    pop();
  }
}



function flipCoin() {
  game.stop = true;//when coin comes game stops
  coin.startTime = millis();// gets value for coin.startTime
  coin.rotating = true;
  loop();

  coin.coinValue = random(0, 1);// to decide randomly
  console.log("coin value: " + coin.coinValue);

  startGameButton.hide();//hides buttons when spinning
  flipButton.hide();
}




function mousePressed() {


  let i, j;// i x eksenindeki ilerlemeyi yapmak için j ise y eksenindeki ilerlemeyi yapmak için
  if (game.stop === true) {
    return;
  }
  for (i = 0; i < 3; i++) {
    for (j = 0; j < 3; j++) {
      if (mouseX <= canvasX / 3 * (i + 1) && mouseY <= canvasY / 3 * (j + 1) && mouseX >= 0 && mouseY >= 0) {

        if (game.a[i][j] === 0) { // Check if the slot is empty
          translate(-canvasX / 2, -canvasY / 2);
          if (game.turn === 0) {
            game.a[i][j] = 1;
            drawcircle(canvasX / 3 * i + canvasX / 6, canvasY / 3 * j + canvasY / 6);

          }

          else if (game.turn === 1) {
            game.a[i][j] = 4;
            drawcross(canvasX / 3 * i + canvasX / 6, canvasY / 3 * j + canvasY / 6);

          }
          gameLines.startColorTime = millis();// starts color change
          game.turn = (game.turn + 1) % 2;// Toggle game.turn between 0 and 1

        }

        return; // exit the loop once a square is found

      }
    }
  }
}

function mouseReleased() {


  if (game.stop === true) {
    return;//if game not running do not checks win
  }
  checkWin(); // checks win every time mouse relased if game still running

  var outputO = document.getElementById("scoreO");//to write points in html
  outputO.innerHTML = game.pointsO;

  var outputX = document.getElementById("scoreX");
  outputX.innerHTML = game.pointsX;
  if (game.pointsX >= 100) {
    document.querySelector(".col-displayX").style.fontSize = "60px";
  }
  if (game.pointsO >= 100) {
    document.querySelector(".col-displayO").style.fontSize = "60px";
  }
}


function drawcircle(x, y) {
  push();
  specularMaterial(10);//
  ambientLight(100, 10, 0, 255);//
  pointLight(255, 255, 255, x, y, 30);//bu işaretli yerler rengini falan düzenlemek için
  noStroke();//
  fill(255, 0, 0);//
  translate(x, y);
  torus(canvasX / 10, canvasY / 30);
  pop();
}

function drawcross(x, y) {
  push();
  specularMaterial(50);//
  shininess(0);//
  ambientLight(0, 10, 120, 10);// bu işaretli yerler rengini falan düzenlemek için
  noStroke();//
  fill(0, 0, 255);//
  translate(x, y);
  rotateZ(PI / 4);
  box(canvasX / 4, canvasX / 20);
  rotateZ(PI / 2);
  box(canvasX / 4, canvasX / 20);
  pop();
}



function checkWin() {
  strokeWeight(canvasX / 40);//neon line strokeweight

  let i;
  let j;
  translate(-canvasX / 2, -canvasY / 2);
  for (i = 0; i < 3; i++) //checks win in vertical lines
  {
    if (game.a[i][0] + game.a[i][1] + game.a[i][2] === 3) {
      oWins();
      drawGameEndLine((i + 1) * canvasX / 3 - canvasX / 6, canvasY / 2, 1, false);
    }
    if (game.a[i][0] + game.a[i][1] + game.a[i][2] === 12) {
      xWins();
      drawGameEndLine((i + 1) * canvasX / 3 - canvasX / 6, canvasY / 2, 1, true);
    }
  }

  if (game.stop)
    return;


  for (j = 0; j < 3; j++) // checks win in horizontal lines
  {
    if (game.a[0][j] + game.a[1][j] + game.a[2][j] === 3) {
      oWins();
      drawGameEndLine(canvasX / 2, (j + 1) * canvasY / 3 - canvasY / 6, 0, false);
    }

    if (game.a[0][j] + game.a[1][j] + game.a[2][j] === 12) {
      xWins()
      drawGameEndLine(canvasX / 2, (j + 1) * canvasY / 3 - canvasY / 6, 0, true);
      ;

    }
  }

  if (game.stop)
    return;

  if (game.a[0][0] + game.a[1][1] + game.a[2][2] === 3)//checks win in \ 
  {
    oWins();
    drawGameEndLine(canvasX / 2, canvasY / 2, 2, false);


  }
  if (game.a[0][0] + game.a[1][1] + game.a[2][2] === 12) {
    xWins();
    drawGameEndLine(canvasX / 2, canvasY / 2, 2, true);
  }

  if (game.stop)
    return;


  if (game.a[2][0] + game.a[1][1] + game.a[0][2] === 3) // checks win in /
  {
    oWins();
    drawGameEndLine(canvasX / 2, canvasY / 2, 3, false);
  }
  if (game.a[2][0] + game.a[1][1] + game.a[0][2] === 12) {
    xWins();
    drawGameEndLine(canvasX / 2, canvasY / 2, 3, true);
  }

  if (game.stop)
    return;

  if (game.a[0][0] != 0 && game.a[0][1] != 0 && game.a[0][2] != 0 && game.a[1][0] != 0 && game.a[1][1] != 0 && game.a[1][2] != 0 && game.a[2][0] != 0 && game.a[2][1] != 0 && game.a[2][2] != 0) {//Checks for draw
    game.pointsX++;
    game.pointsO++;
    game.stop = true;//stops game 
    flipButton.show();//flip coin button appears
  }
}


function oWins() {
  game.pointsO = game.pointsO + 3;
  game.stop = true;
  console.log("Owins:", game.pointsO);
  flipButton.show();//flip coin button appears
}

function xWins() {
  game.pointsX = game.pointsX + 3;
  game.stop = true;
  console.log("Xwins:", game.pointsX);
  flipButton.show();//flip coin button appears
}

function restart() {
  loop();
  //redraw canvas
  stroke(10);
  translate(-canvasX / 2, -canvasY / 2);//When we use WEBGL we have to translate everything to -150,-150 to achive normal canvas origin
  background('rgba(0, 0, 0, 0)');



  game.stop = false;//run game again
  game.a = [//reset the values 
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0]
  ];
}

function drawGameEndLine(startx, starty, vh, isblue) {
  endLines.isBlue = isblue;
  endLines.isHorizontal = vh;
  endLines.startX = startx;
  endLines.startY = starty;
  endLines.startLineTime = millis();
  loop();
}

