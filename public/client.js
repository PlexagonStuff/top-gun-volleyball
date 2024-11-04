const socket = io();

socket.on("connect", () => {
	console.log("Connected");
});

var hand = ["set", "whiff", "bump", "whiff", "set", "spike", "whiff", "bump", "spike"]
var currentSide = null;
var heldCard = null;
var currentTurn = null;
var prevShot = null;
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

socket.on("setTurn", (data)=> {
    currentTurn = data.turn;
    prevShot = data.prevCard;
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
    document.getElementById("turnIndicator").textContent = "It is " + currentTurn.toString() + "'" + "s turn (You are" + currentSide + ")";
    generateSide(data.blue, data.pink, "pink")
    generateSide(data.blue,data.pink,"blue")
    var errorLog = document.createElement("p");
    errorLog.id = "errorLog"
    document.getElementById("volleyball").appendChild(errorLog);
})



document.getElementById("joinRoom").onclick = function(){
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
            console.log(currentSide);
            socket.emit("evaluateSelection", {"row": parseInt(selectButton.value.charAt(0)), "col":parseInt(selectButton.value.charAt(1)),"turn": currentTurn, "prevCard":prevShot});
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
        if (selectButton.textContent == "Hello :)") {
            selectButton.textContent = heldCard.innerText;
            cardSide[i][j] = heldCard.innerText;
            heldCard.remove();
            if (document.getElementById("cardHandler").children.length == 0) {
                socket.emit("cardsPlaced", {"side": currentSide, "board": cardSide})
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
    document.getElementById("setup").appendChild(row);
}