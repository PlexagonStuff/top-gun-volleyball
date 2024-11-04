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
            io.to(room.toString()).emit("setTurn", {"turn":firstTeam, "prevCard":"spike"})
            io.to(room.toString()).emit("showBoard", {"blue":games[room.toString()]["blueRevealed"], "pink":games[room.toString()]["pinkRevealed"]})
            
        }
    });

    socket.on("evaluateSelection", (data)=> {
        console.log(data);
        const setIter = socket.rooms.values()
        setIter.next();
        const room = setIter.next().value;
        var row = data.row;
        var col = data.col;
        var turn = data.turn;
        var prevCard = data.prevCard;
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
                    if (sideShooting == "blue") {
                        row = row - 3;
                    }
                    var board = sideShooting + "Revealed";
                    var cipher = sideShooting + "Side";
                    //Hit, change/reveal the board
                    console.log(board)
                    console.log(cipher)
                    games[room.toString()][board][row][col] = games[room.toString()][cipher][row][col];
                    var whiffs = room.toString() + "Whiffs";
                    if (games[room.toString()][cipher][row][col] == "whiff") {
                        //Increment the whiff counter
                        games[room.toString()][whiffs] += 1;
                    }
                    //Switch Turns
                    io.to(room.toString()).emit("setTurn", {"turn":sideShooting, "prevCard":games[room.toString()][cipher][row][col]});
                    io.to(room.toString()).emit("showBoard", {"blue":games[room.toString()]["blueRevealed"], "pink":games[room.toString()]["pinkRevealed"]})
                }
            }
        }
    });
})

server.listen(3000, () => {
    console.log('server running at http://localhost:3000');
  });