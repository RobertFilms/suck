// Start an express server with websockets without socket.io
const express = require('express');
const WebSocket = require('ws');
// import sqlite3 database module
const sqlite3 = require('sqlite3').verbose();
// import unique id handler
const { v4: uuidv4 } = require('uuid');
// import local environment variables
require('dotenv').config();
// import custome GameCode
const GameCode = require('./GameCode.js');
const { log } = require('console');

// load the port from the environment variables
const PORT = process.env.PORT || 3000;

const app = express();
const http = require('http').Server(app);
const wss = new WebSocket.Server({ server: http });

// set the express view engine to ejs
app.set('view engine', 'ejs');

// set express to use public for static files
app.use(express.static(__dirname + '/public'));

// Define a route handler for the default home page
app.get('/', (req, res) => {
    res.render('info', { numPlayers: wss.clients.size, game: game.stats });
    // add 1 to the hits_home column in the database
    db.run(`UPDATE general SET hits_home = hits_home + 1 WHERE uid = 1 ;`, (err) => {
        if (err) {
            console.error(err.message);
        } else {
            game.stats.hits_home++;
        }
    });
});

// game page
app.get('/game', (req, res) => {
    res.render('game');
    // add 1 to the hits_game column in the database
    db.run(`UPDATE general SET hits_game = hits_game + 1 WHERE uid = 1 ;`, (err) => {
        if (err) {
            console.error(err.message);
        } else {
            game.stats.hits_game++;
        }
    });
});

// create a new game instance
const game = new GameCode.Game();

// Run the game loop and send updates every tick interval
setInterval(() => {
    //No need to advance the game if there are no players
    if (wss.clients.size) {

        // update the number of players in the game object
        game.numPlayers = wss.clients.size;

        // update the game state
        game.step();

        // pack all blobs into an update message and send to all clients
        let update = [];
        for (const blob of game.blobs) {
            update.push(blob.pack());
        }

        // send the update message to each client
        for (const client of wss.clients) {
            // find the blobs that are players
            let players = game.blobs.filter(b => b.type == "player");
            // find the client's blob
            let player = players.find(b => b.id == client.id);
            let nearbyBlobs = [];
            if (player) {
                // find nearby blobs by filtering blob list with the player's canSee method
                nearbyBlobs = game.blobs.filter(b => player.canSee(b)).map(b => b.pack());
            }
            //search blobs for number of players
            let numPlayers = players.filter(b => b.type == "player").length;
            // the player with the highest r
            let biggestBlob = players.reduce((a, b) => a.r > b.r ? a : b, { r: 1, name: "Bob Jenkins", fbid: 0 });

            // send the update message to the client
            client.send(JSON.stringify({
                update: {
                    player: player, //Send the player's blob if it exists
                    nearbyBlobs: nearbyBlobs,
                    status: {
                        numPlayers: numPlayers,
                        top_score: biggestBlob.r || 1,
                        top_name: biggestBlob.name || "Bob Jenkins",
                        top_uid: biggestBlob.fbid || 0
                    }
                }
            }));
        }
        // if the game updated the stats, update the database
        if (game.updateDB) {
            db.run(`UPDATE general SET top_score = ?, top_name = ?, top_uid = ? WHERE uid = 1 ;`, [game.stats.top_score, game.stats.top_name, game.stats.top_uid], (err) => {
                game.updateDB = false;
                if (err) {
                    console.error(err.message);
                } else {
                    console.log('Updated stats in database.');
                }
            });
        }
    }

}, game.tickSpeed);

// Listen for WS connections
wss.on('connection', (ws) => {
    ws.id = uuidv4();
    ws.send(JSON.stringify({ id: ws.id }));
    console.log(`Client connected, ${new Date()}: ${ws.id}`);
    // add blob to game with ws's id as the blob id
    game.blobs.push(new GameCode.Player(Math.random() * game.gameWidth, Math.random() * game.gameHeight, 20, ws.id, "player"));

    ws.on('message', (message) => {
        message = JSON.parse(message);
        if (message.press) {
            // find blob with this ws id
            let player = game.blobs.find(b => b.id == ws.id);
            if (player) {
                player[message.press] = true;
            }
        }

        if (message.release) {
            // find blob with this ws id
            let player = game.blobs.find(b => b.id == ws.id);
            if (player) {
                player[message.release] = false;
            }
        }

        if (message.resize) {
            // find blob with this ws id
            let player = game.blobs.find(b => b.id == ws.id);
            if (player) {
                player.vision = message.resize;
            }
        }
    });

    // listen for disconnects
    ws.on('close', () => {
        console.log(`Client disconnected, ${new Date()}: ${ws.id}`);
        //remove blob from game by ws's id
        game.blobs = game.blobs.filter(b => b.id !== ws.id);
    });
});


// Start the server on port 3000
http.listen(PORT, () => {
    console.log(`Server started on http://localhost:${PORT}`);
});

// open the database file
let db = new sqlite3.Database('data/database.db', (err) => {
    if (err) {
        console.error(err.message);
    }
    console.log('Connected to the database.');
    db.get('SELECT * FROM general', (err, row) => {
        if (err) {
            console.error(err.message);
        } else if (row) {
            console.log(row);
            // Save the row to the game object
            game.stats = row;
        }
    });
});
