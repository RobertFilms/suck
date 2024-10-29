// Start an express server with websockets without socket.io
const express = require('express');
// import express session module
const session = require('express-session');
// import the websockets module
const WebSocket = require('ws');
// import the express-ws module
const expressWs = require('express-ws')
// import sqlite3 database module
const sqlite3 = require('sqlite3').verbose();
// import unique id handler
const { v4: uuidv4 } = require('uuid');
// import local environment variables
require('dotenv').config();
// import webtoken module
const jwt = require('jsonwebtoken');
// make a little shortcut for log()
const { log } = require('console');
// import custome GameCode
const GameCode = require('./GameCode.js');

// load the port from the environment variables
// The port to run this on
const PORT = process.env.PORT || 3000;
// The URL for the Formbar authentication server
const AUTH_URL = process.env.AUTH_URL || 'http://localhost:420/oauth';
// The URL for this server for the oauth callback
const THIS_URL = process.env.THIS_URL || 'http://localhost:3000/login';
// The secret for the session data
const FB_SECRET = process.env.FB_SECRET || 'secret';

const app = express();

// set the express view engine to ejs
app.set('view engine', 'ejs');

// set express to use public for static files
app.use(express.static(__dirname + '/public'));

// create a session middleware with a secret key
const sessionMiddleware = session({
    secret: 'your-secret-key',
    resave: false,
    saveUninitialized: true,
    // Add a store if needed, like Redis for scalability
});
// use the session middleware in express
app.use(sessionMiddleware);

// use the express-ws module to add websockets to express
expressWs(app);

// This function is used to intercept page loads to check if the user is authenticated
function isAuthenticated(req, res, next) {
    if (req.session.user) next()
    else res.redirect('/login')
};

// Define a route handler for the default home page
app.get('/', (req, res) => {
    let user = { name: "", fbid: 0 };
    if (req.session.user) {
        user = req.session.user
        user.top_score = 0;
        // get the user from the database
        db.get(`SELECT * FROM users WHERE fb_id = ? ;`, [req.session.user.fbid], (err, row) => {
            if (err) {
                console.error(err.message);
            } else if (row) {
                user.top_score = row.top_score;
            } else {
                //insert this user into the database
                db.run(`INSERT INTO users (fb_name, fb_id, top_score) VALUES (?, ?, ?);`, [req.session.user.name, req.session.user.fbid, 0], (err) => {
                    if (err) {
                        console.error(err.message);
                    } else {
                        log('Inserted user into database.');
                    }
                });
            }
            res.render('info', { numPlayers: clients.length, game: game.stats, user: user });

        });
    } else {
        res.render('info', { numPlayers: clients.length, game: game.stats, user: user });
    };
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
    let user = { name: "", fbid: 0 };
    if (req.session.user) user = req.session.user;
    res.render('game', { user: user });
    // add 1 to the hits_game column in the database
    db.run(`UPDATE general SET hits_game = hits_game + 1 WHERE uid = 1 ;`, (err) => {
        if (err) {
            console.error(err.message);
        } else {
            game.stats.hits_game++;
        }
    });
});

// login page
app.get('/login', (req, res) => {
    if (req.query.token) {
        let tokenData = jwt.decode(req.query.token);
        req.session.token = tokenData;
        req.session.user = { name: tokenData.username, fbid: tokenData.id };
        res.redirect('/');
    } else {
        res.redirect(`${AUTH_URL}?redirectURL=${THIS_URL}`);
    };
});

// create a new game instance
const game = new GameCode.Game();

// create a client list
var clients = [];

// Run the game loop and send updates every tick interval
setInterval(() => {
    //No need to advance the game if there are no players
    if (clients.length) {

        // update the number of players in the game object
        game.numPlayers = clients.length;

        // update the game state
        game.step();

        // pack all blobs into an update message and send to all clients
        let update = [];
        for (const blob of game.blobs) {
            update.push(blob.pack());
        }

        // send the update message to each client
        for (const client of clients) {
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
                    log('Updated stats in database.');
                }
            });
        }
    }

}, game.tickSpeed);

app.ws('/game', (ws, req) => {
    // add a unique id to the ws object
    ws.id = uuidv4();

    // add client to list
    clients.push(ws);

    ws.send(JSON.stringify({ id: ws.id }));
    log(`Client connected, ${new Date()}: ${ws.id}`);
    // add blob to game with ws's id as the blob id
    game.blobs.push(new GameCode.Player(Math.random() * game.gameWidth, Math.random() * game.gameHeight, 20, ws.id, "player"));
    // add the session user to the ws object and update the blob that was jsut created
    if (req.session.user) {
        ws.user = req.session.user;
        game.blobs[game.blobs.length - 1].name = req.session.user.name;
        game.blobs[game.blobs.length - 1].fbid = req.session.user.fbid;
        // get the user from the database
        db.get(`SELECT * FROM users WHERE fb_id = ? ;`, [req.session.user.fbid], (err, row) => {
            if (err) {
                console.error(err.message);
            } else if (row) {
                console.log("User found: ", row);
                game.blobs[game.blobs.length - 1].top_score = row.top_score;
            }
        });
    }

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
        log(`Client disconnected, ${new Date()}: ${ws.id}`);
        //remove blob from game by ws's id
        game.blobs = game.blobs.filter(b => b.id !== ws.id);
        //remove client from list
        clients = clients.filter(c => c !== ws);
    });
});

// Start the server on port 3000
app.listen(PORT, () => {
    log(`Server started on http://localhost:${PORT}`);
});

// open the database file
let db = new sqlite3.Database('data/database.db', (err) => {
    if (err) {
        console.error(err.message);
    }
    log('Connected to the database.');
    db.get('SELECT * FROM general', (err, row) => {
        if (err) {
            console.error(err.message);
        } else if (row) {
            log(row);
            // Save the row to the game object
            game.stats = row;
        }
    });
});
