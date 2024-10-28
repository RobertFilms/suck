// find the ip address of the server by replacing the https or http with ws
let host = window.location.href.replace("http", "ws");
if (host.includes("wss")) host = host.replace("wss", "ws");
host = host.replace("game", "");

// open a ws connection to server
const ws = new WebSocket(host);

// connect to ws server
ws.onopen = () => {
    console.log('Connected to server');
}

// listen for messages from server
ws.onmessage = (message) => {
    message = JSON.parse(message.data);

    // See if you're receiving your ID
    if (message.id) {
        ws.id = message.id;
        ws.send(JSON.stringify({ resize: { width: canvas.width, height: canvas.height } }));
        if (user.name)
            ws.send(JSON.stringify({ realID: { name: user.name, fbid: user.fbid } }));
    }
    //See if this is an update message
    if (message.update && !gameState) {
        let player = message.update.player;
        if (!player) {
            gameState = Date.now();
            // listen for clicks
            canvas.addEventListener('click', () => {
                // reload the page
                location.reload();
            });
        } else {
            camera.target = player;
            // Update the status
            gameStatus = message.update.status;
            // Reset the blobs array
            blobs = [];
            // Add each blob from the message to the blobs array
            for (const blob of message.update.nearbyBlobs) {
                blobs.push(new Blob(blob.x, blob.y, blob.r, blob.id, blob.type, blob.name));
                this.blobs[this.blobs.length - 1].color = blob.color;
            }
        }
    }
}

// listen for disconnects
ws.onclose = () => {
    //reload the page
    location.reload();
}

// Create a Blob class with the usually movement properties
class Blob {
    constructor(x, y, r, id = "", type = "blob", name = "") {
        this.id = id;
        this.x = x;
        this.y = y;
        this.r = r;
        this.type = type;
        this.name = name;
        this.color = "#000000"
    }

    // Draw the blob on the canvas
    draw() {
        // compare this to the camera's target x and y
        let compareX = this.x - camera.target.x;
        let compareY = this.y - camera.target.y;
        // if this compare is greater than half the size of the screen plus this r times the camera multiplier, don't draw it
        // console.log(compareX, canvas.width, this.r, camera.multiplier);

        if (Math.abs(compareX * camera.multiplier) > (canvas.width / 2) + (this.r * 2 * camera.multiplier)) return 0;
        if (Math.abs(compareY * camera.multiplier) > (canvas.height / 2) + (this.r * 2 * camera.multiplier)) return 0;
        // draw a circle with this blob's color
        ctx.beginPath();
        ctx.arc(
            canvas.width / 2 + (compareX * camera.multiplier),
            canvas.height / 2 + (compareY * camera.multiplier),
            this.r * camera.multiplier,
            0, 2 * Math.PI);
        ctx.fillStyle = this.color;
        ctx.fill();
        ctx.stroke();
        // if this type is player, write their name above them
        if (this.type === "player") {
            ctx.font = Math.min(parseInt(30 * camera.multiplier), 30) + 'px BubbleGums';
            ctx.fillStyle = 'black';
            ctx.fillText(
                this.name,
                canvas.width / 2 + (compareX * camera.multiplier) - (ctx.measureText(this.name).width / 2),
                canvas.height / 2 + (compareY * camera.multiplier) - (this.r * camera.multiplier) - 10
            );
        }
        return 1;
    }
}

class touchUI {
    constructor() {
        this.visible = false;
        this.touch = { sx: 0, sy: 0, ex: 0, ey: 0 };
        this.pressed = { up: false, down: false, left: false, right: false };
        this.deadZone = 5;
    }

    draw() {
        if (this.visible) {
            // draw red circle at start touch
            ctx.beginPath();
            ctx.arc(this.touch.sx, this.touch.sy, 10, 0, 2 * Math.PI);
            ctx.fillStyle = 'red';
            ctx.fill();
            //draw a blue line from the start touch to the end touch
            ctx.beginPath();
            ctx.moveTo(this.touch.sx, this.touch.sy);
            ctx.lineTo(this.touch.ex, this.touch.ey);
            ctx.strokeStyle = 'green';
            ctx.lineWidth = 2;
            ctx.stroke();
        }
    }
}

// Set the game over state
gameState = 0;

// Create an array of blobs
var blobs = [];

// Create a variable to hold the status
var gameStatus = { numPlayers: 0, top_score: 0, top_name: "", top_uid: "" };

var ui = new touchUI();

// Get the canvas and context
var canvas = document.getElementById('gameWindow');
var ctx = canvas.getContext('2d');

// prevent right click context menu
canvas.addEventListener('contextmenu', function (event) {
    event.preventDefault(); // Prevent context menu from appearing
}, false);

var camera = {
    target: {
        x: 0,
        y: 0,
        r: 20
    },
    multiplier: 1,
    lastWidth: 0,
    lastHeight: 0,
    lastR: 0,
}

// This is the game loop
function step() {

    //change the canvas element's size to match the window size
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    //if not equal to the last width or height, update the camera multiplier
    if (canvas.width != camera.lastWidth || canvas.height != camera.lastHeight || camera.target.r != camera.lastR) {
        camera.multiplier = (canvas.width / 16) / camera.target.r;
        camera.lastWidth = canvas.width;
        camera.lastHeight = canvas.height;
        if (ws.id)
            ws.send(JSON.stringify({ resize: { width: canvas.width, height: canvas.height } }));
    }

    // If the game is over, show the game over text
    if (gameState) {
        // show game over text in middle of screen
        ctx.font = '30px BubbleGums';
        ctx.fillStyle = 'red';
        ctx.fillText('ya got sucked', canvas.width / 2 - (ctx.measureText('ya got sucked').width / 2), canvas.height / 2 - 20);
        //if the current time minus the gameState is greater than 3 seconds, show a link
        if (Date.now() - gameState > 2000) {
            // show link to game in middle of screen
            ctx.font = '20px BubbleGums';
            ctx.fillStyle = 'green';
            ctx.fillText('click to resuck', canvas.width / 2 - (ctx.measureText('click to resuck').width / 2), canvas.height / 2 + 20);
            // If we end here, it can't request another frame, so it stops the game
            return;
        }
        requestAnimationFrame(step);
    }
    // Otherwise, keep playing the game
    else {
        // Clear the canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Move and draw each blob
        for (const blob of blobs) {
            blob.draw();
        }
        // draw name of biggest blob in top left of screen
        ctx.font = '20px BubbleGums';
        ctx.fillStyle = 'black';
        ctx.fillText(`${gameStatus.top_name} is the biggest suck`, canvas.width / 2 - (ctx.measureText(gameStatus.top_name + " is the biggest suck").width / 2), 30);
        // draw number of players below that
        ctx.fillText(`${gameStatus.numPlayers} players are trying to suck`, canvas.width / 2 - (ctx.measureText(`${gameStatus.numPlayers} players are trying to suck`).width / 2), 60);
        // draw camera's target's r in bottom left of screen
        if (camera.target) ctx.fillText("your suck size is " + parseInt(camera.target.r), canvas.width / 2 - (ctx.measureText("your suck size is " + parseInt(camera.target.r)).width / 2), 90);
        // try to draw the touch ui
        ui.draw();
        // Call the next frame
        requestAnimationFrame(step);
    }
}

// Start the game
requestAnimationFrame(step);

//listen for keypresses
document.addEventListener('keydown', (event) => {
    switch (event.key) {
        case 'w':
        case 'W':
        case 'ArrowUp':
            ws.send(JSON.stringify({ press: 'up' }));
            break;
        case 's':
        case 'S':
        case 'ArrowDown':
            ws.send(JSON.stringify({ press: 'down' }));
            break;
        case 'a':
        case 'A':
        case 'ArrowLeft':
            ws.send(JSON.stringify({ press: 'left' }));
            break;
        case 'd':
        case 'D':
        case 'ArrowRight':
            ws.send(JSON.stringify({ press: 'right' }));
            break;
        default:
            break;
    }
});

//listen for key releases
document.addEventListener('keyup', (event) => {
    switch (event.key) {
        case 'w':
        case 'W':
        case 'ArrowUp':
            ws.send(JSON.stringify({ release: 'up' }));
            break;
        case 's':
        case 'S':
        case 'ArrowDown':
            ws.send(JSON.stringify({ release: 'down' }));
            break;
        case 'a':
        case 'A':
        case 'ArrowLeft':
            ws.send(JSON.stringify({ release: 'left' }));
            break;
        case 'd':
        case 'D':
        case 'ArrowRight':
            ws.send(JSON.stringify({ release: 'right' }));
            break;
        default:
            break;
    }
});

//listen for touches
document.addEventListener('touchstart', (event) => {
    event.preventDefault(); // Prevent default touch behaviors
    ui.visible = true;
    if (gameState) location.reload();
    // get the touch coordinates and save to the ui object touch property
    ui.touch.sx = event.touches[0].clientX;
    ui.touch.sy = event.touches[0].clientY;
    ui.touch.ex = event.touches[0].clientX;
    ui.touch.ey = event.touches[0].clientY;
}, { passive: false });

//listen for touch changes
document.addEventListener('touchmove', (event) => {
    event.preventDefault();
    // get the touch coordinates and save to the ui object touch property
    ui.touch.ex = event.touches[0].clientX;
    ui.touch.ey = event.touches[0].clientY;
    // calculate the distance between the start and end touch coordinates and normalize  to -1 to 1
    let x = ui.touch.ex - ui.touch.sx;
    let y = ui.touch.ey - ui.touch.sy;
    // if the distance for each axis is greater than the deadzone, press the appropriate key
    if (Math.abs(x) > ui.deadZone) {
        //if the UI hadn't already pressed the key, send a press message
        if (!ui.pressed[x > 0 ? 'right' : 'left']) {
            ws.send(JSON.stringify({ press: x > 0 ? 'right' : 'left' }));
        }
        // update the pressed property of the ui so it doesn't send another press message
        ui.pressed[x < 0 ? 'right' : 'left'] = false;
        ui.pressed[x > 0 ? 'right' : 'left'] = true;
    } else {
        // if the user isn't pressing far enough but hasn't untouched, send a release message
        if (ui.pressed[x < 0 ? 'right' : 'left']) {
            ws.send(JSON.stringify({ release: x < 0 ? 'right' : 'left' }));
        }
        // update the pressed property of the ui so it doesn't send another release
        ui.pressed[x < 0 ? 'right' : 'left'] = false;
    }
    // Up and down
    if (Math.abs(y) > ui.deadZone) {
        //if the UI hadn't already pressed the key, send a press message
        if (!ui.pressed[y > 0 ? 'down' : 'up']) {
            ws.send(JSON.stringify({ press: y > 0 ? 'down' : 'up' }));
        }
        // update the pressed property of the ui so it doesn't send another press message
        ui.pressed[y < 0 ? 'down' : 'up'] = false;
        ui.pressed[y > 0 ? 'down' : 'up'] = true;
    } else {
        // if the user isn't pressing far enough but hasn't untouched, send a release message
        if (ui.pressed[y < 0 ? 'down' : 'up']) {
            ws.send(JSON.stringify({ release: y < 0 ? 'down' : 'up' }));
        }
        // update the pressed property of the ui so it doesn't send another release message
        ui.pressed[y < 0 ? 'down' : 'up'] = false;
    }
}, { passive: false });

//listen for touch ends
document.addEventListener('touchend', (event) => {
    event.preventDefault();
    // if the touch ends, release all keys
    if (event.touches.length === 0) {
        ui.visible = false;
        ws.send(JSON.stringify({ release: 'up' }));
        ui.pressed.up = false;
        ws.send(JSON.stringify({ release: 'down' }));
        ui.pressed.down = false;
        ws.send(JSON.stringify({ release: 'right' }));
        ui.pressed.right = false;
        ws.send(JSON.stringify({ release: 'left' }));
        ui.pressed.left = false;
    }
}, { passive: false });