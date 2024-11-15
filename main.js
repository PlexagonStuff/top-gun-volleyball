import express, { response } from 'express';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {Server} from 'socket.io'


const app = express();
const server = createServer(app);
const io = new Server(server);
var rooms = [];
var games = {}
const __dirname = dirname(fileURLToPath(import.meta.url));


app.use(express.static(__dirname + '/public'));

io.on("connection", (socket)=> {
    console.log("Hello?")
    socket.on("joinRoom", (data)=> {
        console.log(data);
        console.log(rooms.indexOf(data.room));
        if (!(rooms.includes(data.room))) {
            rooms.push(data.room)
        }
        console.log(Object.keys(games))
        if (Object.keys(games).includes(data.room) == false) {
            games[data.room] = {
                "blue":null,
                "pink":null,
                "blueSide": [],
                "pinkSide":[],
                "blueRevealed":[
                    ["blank","blank","blank"],
                    ["blank","blank","blank"],
                    ["blank","blank","blank"]
                ],
                "pinkRevealed":[
                    ["blank","blank","blank"],
                    ["blank","blank","blank"],
                    ["blank","blank","blank"]
                ],
                "bumpSaveOwner": null,
                "bumpSaved":true,
                "blueWhiffs": 0,
                "pinkWhiffs": 0,
                "started": false
            };
        }
        console.log(games)
        if (games[data.room]["blue"] == null) {
            games[data.room]["blue"] = socket.id.toString()
            socket.join(data.room)
        }
        else if (games[data.room]["pink"] == null) {
            games[data.room]["pink"] = socket.id.toString()
            socket.join(data.room)
        }
        else {
            socket.join(data.room)
        }
        console.log(socket.id)
        if  (games[data.room]["started"]) {
            //If someone joins while the game has started, just jump them into the game state
            io.to(socket.id).emit("showBoard", {"blue":games[data.room]["blueRevealed"], "pink":games[data.room]["pinkRevealed"]})
        }
        else {
            io.to(data.room).emit("placeCards", {"blue": games[data.room]["blue"], "pink": games[data.room]["pink"]});
        }
        
    });

    socket.on("cardsPlaced", (data)=> {
        console.log(data.board);
        console.log(data.side);
        const setIter = socket.rooms.values()
        setIter.next();
        const room = setIter.next().value;
        var side = data.side+ "Side"
        console.log(side)
        games[room.toString()][side] = data.board;
        //If both boards are filled out, it is time to start the game :)
        if (games[room.toString()]["blueSide"].length > 0 && games[room.toString()]["pinkSide"].length > 0) {
            //START THE GAME!!!!
            games[room.toString()]["started"] = true;
            var teams = ["blue", "pink"];
            var firstTeam = teams[Math.floor(Math.random() * teams.length)];
            if (firstTeam == "blue") {
                games[room.toString()]["bumpSaveOwner"] = "pink"
            }
            else {
                games[room.toString()]["bumpSaveOwner"] = "blue"
            }
            //Show/generate the board for everyone
            io.to(room.toString()).emit("setTurn", {"turn":firstTeam, "prevCard":"spike", "prevCardRow":0, "prevCardCol":0})
            io.to(room.toString()).emit("showBoard", {"blue":games[room.toString()]["blueRevealed"], "pink":games[room.toString()]["pinkRevealed"]})
            
        }
    });

    socket.on("evaluateSelection",  async (data)=> {
        console.log(data);
        const setIter = socket.rooms.values()
        setIter.next();
        const room = setIter.next().value;
        var row = data.row;
        var col = data.col;
        var turn = data.turn;
        var prevCard = data.prevCard;
        var prevCardRow = data.prevCardRow;
        var prevCardCol = data.prevCardCol;
        var sideShooting = null;
        if (row > 2) {
            sideShooting = "blue";
        }
        else {
            sideShooting = "pink";
        }
        if (prevCard == "spike" || prevCard == "whiff") {
            if (sideShooting == turn) {
                io.to(socket.id).emit("shootingError", {"message":"You must select a card on the opposite side"})
            }
            else {
                if (games[room.toString()]["bumpSaved"] == false) {
                    io.to(games[room.toString()][games[room.toString()]["bumpSaveOwner"]]).emit("chooseBumpSave", {"row":row, "col":col})
                }
                else {
                    await landAShot(sideShooting, room, row, col, prevCard);
                }
            }
        }
        else if (prevCard == "set") {
            var hDistance = Math.abs(prevCardCol-col);
            var vDistance = Math.abs(prevCardRow-row);
            console.log(hDistance)
            console.log(vDistance)
            if (hDistance > 0 && vDistance > 0) {
                //If both are greater than zero, this is a diagonal shot, and is not allowed
                io.to(socket.id).emit("shootingError", {"message":"Bumps/Sets cannot be diagonal"})
                return;
            }
            if (hDistance > 1 || vDistance > 1) {
                //Bumps can only go a distance of one
                io.to(socket.id).emit("shootingError", {"message":"Out of range for a set"})
                return;
            }
            //If it passes these checks, this is a valid shot
            if (sideShooting == turn) {
                //Reveal to the player what card they have selected, and if they want to continue
                var tempRow = row;
                if (sideShooting == "blue") {
                    tempRow = row - 3;
                }
                var cipher = sideShooting + "Side";
                var cardVal = games[room.toString()][cipher][tempRow][col];
                var message = "Are you sure you want to select this card? It is a " + cardVal.toString();
                io.to(socket.id).emit("shotConfirmation", {"message":message, "row":row, "col":col});
            }
            else {
                if (games[room.toString()]["bumpSaved"] == false) {
                    io.to(games[room.toString()][games[room.toString()]["bumpSaveOwner"]]).emit("chooseBumpSave", {"row":row, "col":col})
                }
                else {
                    await landAShot(sideShooting, room, row, col, prevCard);
                }
            }
        
    }
    else if (prevCard == "bump") {
        var hDistance = Math.abs(prevCardCol-col);
        var vDistance = Math.abs(prevCardRow-row);
        console.log(hDistance)
        console.log(vDistance)
        if (hDistance > 0 && vDistance > 0) {
            //If both are greater than zero, this is a diagonal shot, and is not allowed
            io.to(socket.id).emit("shootingError", {"message":"Bumps/Sets cannot be diagonal"})
            return;
        }
        if (hDistance > 2 || vDistance > 2) {
            //Bumps can only go a distance of one
            io.to(socket.id).emit("shootingError", {"message":"Out of range for a bump"})
            return;
        }
        //If it passes these checks, this is a valid shot
        if (sideShooting == turn) {
            //Reveal to the player what card they have selected, and if they want to continue
            var tempRow = row;
            if (sideShooting == "blue") {
                tempRow = row - 3;
            }
            var cipher = sideShooting + "Side";
            var cardVal = games[room.toString()][cipher][tempRow][col];
            var message = "Are you sure you want to select this card? It is a " + cardVal.toString();
            io.to(socket.id).emit("shotConfirmation", {"message":message, "row":row, "col":col});
        }
        else {
            if (games[room.toString()]["bumpSaved"] == false) {
                io.to(games[room.toString()][games[room.toString()]["bumpSaveOwner"]]).emit("chooseBumpSave", {"row":row, "col":col})
            }
            else {
                await landAShot(sideShooting, room, row, col, prevCard);
            }
        }
    }
    });

    socket.on("confirmShot", async (data)=> {
       const setIter = socket.rooms.values()
       setIter.next();
       const room = setIter.next().value;
       var row = data.row
       var col = data.col
       var sideShooting = null;
        if (row > 2) {
            sideShooting = "blue";
        }
        else {
            sideShooting = "pink";
        }
        await landAShot(sideShooting, room, row, col, "whiff");
    })


})

server.listen(3000, () => {
    console.log('server running at http://localhost:3000');
  });


async function later(delay) {
    return new Promise(function(resolve) {
        setTimeout(resolve, delay);
    });
}



async function landAShot(sideShooting, room, row, col, prevCard) {
    if (sideShooting == "blue") {
        row = row - 3;
    }
    var board = sideShooting + "Revealed";
    var cipher = sideShooting + "Side";
    //Hit, change/reveal the board
    console.log(board)
    console.log(cipher)
    games[room.toString()][board][row][col] = games[room.toString()][cipher][row][col];
    var whiffs = sideShooting + "Whiffs";
    if (games[room.toString()][cipher][row][col] == "whiff") {
        //Increment the whiff counter
        games[room.toString()][whiffs] += 1;
    }
    console.log(games);
    if (games[room.toString()][whiffs] == 3) {
        console.log("Did someone whiff?");
        io.to(room.toString()).emit("shootingError", {"message":sideShooting + " lost :( "})
        await later(3000);
        io.to(room.toString()).emit("return");
        io.in(room).disconnectSockets();
        delete games[room];
        return;
    }
    prevCard = games[room.toString()][cipher][row][col];
    if (sideShooting == "blue") {
        row = row + 3;
    }
    //Switch Turns
    io.to(room.toString()).emit("setTurn", {"turn":sideShooting, "prevCard":prevCard, "prevCardRow":row, "prevCardCol":col});
    io.to(room.toString()).emit("showBoard", {"blue":games[room.toString()]["blueRevealed"], "pink":games[room.toString()]["pinkRevealed"]})
}