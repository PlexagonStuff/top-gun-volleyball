const socket = io({transports: ['websocket'],
  secure: true});

socket.on("connect", () => {
	console.log("Connected");
});

var hand = ["set", "whiff", "bump", "whiff", "set", "spike", "whiff", "bump", "spike"]
var currentSide = null;
var heldCard = null;
var currentTurn = "";
var prevShot = null;
var prevShotRow = 0;
var prevShotCol = 0;
var cardSide = [[null,null,null],
                [null,null,null],
                [null,null,null]];

socket.on("placeCards", (data)=> {
    console.log("Has this worked yet?")
    if (socket.id.toString() == data.blue || socket.id.toString() == data.pink) {
        if (socket.id.toString() == data.blue) {
            currentSide = "blue"
        }
        else {
            currentSide = "pink"
        }
        console.log("wassup? it's table time :)")
        document.getElementById("setupText").textContent = "Click a card, then place it on the board (You are " + currentSide + ")";
        document.getElementById("startScreen").style.display = "none"
        document.getElementById("setup").style.display = "block"
        if (document.getElementById("setup").children.length == 1) {
            generateCardTable();
            generateHand();
        }
        
    }
});

socket.on("return", ()=> {
  document.getElementById("startScreen").style.display = "block"
  document.getElementById("setup").style.display = "none"
  document.getElementById("volleyball").style.display = "none"
})

socket.on("setTurn", (data)=> {
    currentTurn = data.turn;
    prevShot = data.prevCard;
    prevShotCol = data.prevCardCol;
    prevShotRow = data.prevCardRow;
    console.log("Turn has been set!")
});


socket.on("showBoard", (data)=> {
    document.getElementById("setup").style.display = "none"
    document.getElementById("volleyball").remove();
    var volleyball = document.createElement("div");
    volleyball.id = "volleyball"
    document.body.appendChild(volleyball)
    var turnIndicator = document.createElement("h3");
    turnIndicator.id = "turnIndicator";
    volleyball.appendChild(turnIndicator);
    document.getElementById("turnIndicator").textContent = "It is " + currentTurn.toString() + "'" + "s turn (You are " + currentSide + ")";
    generateSide(data.blue, data.pink, "pink")
    generateSide(data.blue,data.pink,"blue")
    var errorLog = document.createElement("p");
    errorLog.id = "errorLog"
    document.getElementById("volleyball").appendChild(errorLog);
})

socket.on("shootingError", (data)=> {
  document.getElementById("errorLog").textContent = data.message
})

socket.on("shotConfirmation", (data)=> {
  document.getElementById("errorLog").textContent = data.message
  var yesButton = document.createElement("button");
  yesButton.textContent = "Yes"
  yesButton.onclick = function() {
    socket.emit("confirmShot", {"row":data.row, "col":data.col});
    document.getElementById("errorLog").remove();
  }
  document.getElementById("errorLog").appendChild(yesButton);
  var noButton = document.createElement("button");
  noButton.textContent = "No"
  noButton.onclick = function() {
    document.getElementById("errorLog").removeChild(yesButton)
    document.getElementById("errorLog").textContent = ""
    document.getElementById("errorLog").removeChild(noButton)
  }
  document.getElementById("errorLog").appendChild(noButton);
})



document.getElementById("joinRoom").onclick = function(){
    socket.connect();
    socket.emit("joinRoom", {"room":document.getElementById("roomName").value});
};

function generateSide(blueSide, pinkSide, side) {
      // creates a <table> element and a <tbody> element
  const tbl = document.createElement("table");
  const tblBody = document.createElement("tbody");

  // creating all cells
  for (let i = 0; i < 3; i++) {
    // creates a table row
    const row = document.createElement("tr");

    for (let j = 0; j < 3; j++) {
      // Create a <td> element and a text node, make the text
      // node the contents of the <td>, and put the <td> at
      // the end of the table row
      const cell = document.createElement("td");
      const selectButton = document.createElement("button")
      if (side == "blue") {
        selectButton.textContent = blueSide[i][j];
        selectButton.value = (i+3).toString() + j.toString();
      }
      else {
        selectButton.textContent = pinkSide[i][j];
        selectButton.value = (i).toString() + j.toString();
      }
      selectButton.style.color = side;
      selectButton.onclick = function() {
        console.log(currentSide + " "+ currentTurn);
        if (currentSide == currentTurn) {
          //This blocks playing on exposed cards on the opponents side, because that is not how the game works
            if (selectButton.textContent == "blank" || side == currentTurn) {
              console.log(currentSide);
              socket.emit("evaluateSelection", {"row": parseInt(selectButton.value.charAt(0)), "col":parseInt(selectButton.value.charAt(1)),"turn": currentTurn, "prevCard":prevShot, "prevCardRow":prevShotRow, "prevCardCol":prevShotCol});
            }
        } 
      }
      cell.appendChild(selectButton);
      row.appendChild(cell);
    }

    // add the row to the end of the table body
    tblBody.appendChild(row);
  }

  // put the <tbody> in the <table>
  tbl.appendChild(tblBody);
  // appends <table> into <body>
  document.getElementById("volleyball").appendChild(tbl);
  // sets the border attribute of tbl to '2'
  //tbl.setAttribute("border", "2");
}

function generateCardTable() {
  // creates a <table> element and a <tbody> element
  const tbl = document.createElement("table");
  const tblBody = document.createElement("tbody");

  // creating all cells
  for (let i = 0; i < 3; i++) {
    // creates a table row
    const row = document.createElement("tr");

    for (let j = 0; j < 3; j++) {
      // Create a <td> element and a text node, make the text
      // node the contents of the <td>, and put the <td> at
      // the end of the table row
      const cell = document.createElement("td");
      const selectButton = document.createElement("button")
      selectButton.textContent = "Hello :)"
      selectButton.value = i.toString() + j.toString()
      selectButton.onclick = function() {
        if (selectButton.textContent == "Hello :)" && heldCard != null) {
            selectButton.textContent = heldCard.innerText;
            cardSide[i][j] = heldCard.innerText;
            heldCard.remove();
            if (document.getElementById("cardHandler").children.length == 1) {
                socket.emit("cardsPlaced", {"side": currentSide, "board": cardSide})
            }
        }
        heldCard = null; 
      }
      cell.appendChild(selectButton);
      row.appendChild(cell);
    }

    // add the row to the end of the table body
    tblBody.appendChild(row);
  }

  // put the <tbody> in the <table>
  tbl.appendChild(tblBody);
  // appends <table> into <body>
  document.getElementById("setup").appendChild(tbl);
  // sets the border attribute of tbl to '2'
  //tbl.setAttribute("border", "2");
}

function generateHand() {
    const row = document.createElement("p")
    row.id = "cardHandler";
    for (let i = 0; i < 9; i ++) {
        let card = document.createElement("button");
        card.textContent = hand[i];
        card.onclick = function(){
            console.log(card.innerText)
            heldCard = card;
        }
        row.appendChild(card);
    }
    let random = document.createElement("button");
    random.textContent = "Random Spread";
    random.onclick = function() {
      for (var i = 0; i < 3; i++) {
        for (var j =0; j < 3; j++) {
          var randCardIndex = Math.floor(Math.random() * hand.length);
          cardSide[i][j] = hand[randCardIndex];
          hand.splice(randCardIndex, 1);
        }
      }
      socket.emit("cardsPlaced", {"side": currentSide, "board": cardSide})
    }
    row.appendChild(random);
    document.getElementById("setup").appendChild(row);
}