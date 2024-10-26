// Start an express server with websockets without socket.io
const express = require('express');
const WebSocket = require('ws');
// import unique id handler
const { v4: uuidv4 } = require('uuid');
// import custome GameCode
const GameCode = require('./GameCode.js');

const app = express();
const http = require('http').Server(app);
const wss = new WebSocket.Server({ server: http });

// set the express view engine to ejs
app.set('view engine', 'ejs');

// set express to use public for static files
app.use(express.static(__dirname + '/public'));


// Define a route handler for the default home page
app.get('/', (req, res) => {
    res.render('info', { numPlayers: wss.clients.size });
});

// game page
app.get('/game', (req, res) => {
    console.log('home page');
    res.render('game');
});

// create a new game instance
const game = new GameCode.Game();

// Run the game loop and send updates every tick interval
setInterval(() => {
    game.numPlayers = wss.clients.size;
    game.step();
    wss.clients.forEach((client) => {
        client.send(JSON.stringify({ update: game.blobs }));
    });
}, game.tickSpeed);

// Listen for WS connections
wss.on('connection', (ws) => {
    ws.id = uuidv4();
    ws.send(JSON.stringify({ id: ws.id }));
    console.log('Client connected: ' + ws.id);
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
    });
    // listen for disconnects
    ws.on('close', () => {
        console.log('Client disconnected: ' + ws.id);
        //remove blob from game by ws's id
        game.blobs = game.blobs.filter(b => b.id !== ws.id);
    });
});


// Start the server on port 3000
http.listen(3000, () => {
    console.log('Server started on http://localhost:3000');
});

