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
    // console.log('Received: ' + message.data);
    message = JSON.parse(message.data);
    // See if you're receiving your ID
    if (message.id) {
        ws.id = message.id;
    }
    //See if this is an update message
    if (message.update && !gameState) {
        let player = message.update.find(b => b.id == ws.id);
        if (!player) {
            gameState = Date.now();
            // listen for clicks
            canvas.addEventListener('click', () => {
                // reload the page
                location.reload();
            });
        } else {
            camera.target = player;
            camera.multiplier = (canvas.width / 16) / player.r;
        }
        // Reset the blobs array
        blobs = [];
        biggest = { size: 0, name: "" };
        numPlayers = 0;
        // Add each blob from the message to the blobs array
        for (const blob of message.update) {
            blobs.push(new Blob(blob.x, blob.y, blob.r, blob.id, blob.type, blob.name));
            this.blobs[this.blobs.length - 1].color = blob.color;
            if (blob.type === "player") numPlayers++;
            if (blob.r > biggest.size && blob.name) {
                biggest.size = blob.r;
                biggest.name = blob.name;
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
        if (Math.abs(compareX * camera.multiplier) > (canvas.width / 2) + (this.r * 2 * camera.multiplier)) return 0;
        if (Math.abs(compareY * camera.multiplier) > (canvas.height / 2) + (this.r * 2 * camera.multiplier)) return 0;
        // draw a circle with this blob's color
        ctx.beginPath();
        ctx.arc(
            camera.width / 2 + (compareX * camera.multiplier),
            camera.height / 2 + (compareY * camera.multiplier),
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
                camera.width / 2 + (compareX * camera.multiplier) - (ctx.measureText(this.name).width / 2),
                camera.height / 2 + (compareY * camera.multiplier) - (this.r * camera.multiplier) - 10
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
            //draw a blue line from the start touch to the end touch
            ctx.beginPath();
            ctx.moveTo(this.touch.sx, this.touch.sy);
            ctx.lineTo(this.touch.ex, this.touch.ey);
            ctx.strokeStyle = 'blue';
            ctx.lineWidth = 5;
            ctx.stroke();
        }
    }

}

// Set the game over state
gameState = 0;

// Create an array of blobs
var blobs = [];

// biggest blob
var biggest = { size: 0, name: "" };

// number of players
var numPlayers = 0;

var ui = new touchUI();

// Get the canvas and context
var canvas = document.getElementById('gameWindow');
var ctx = canvas.getContext('2d');

// prevent right click context menu
canvas.addEventListener('contextmenu', function (event) {
    event.preventDefault(); // Prevent context menu from appearing
}, false);

var camera = {
    target: null,
    multiplier: 1,
    width: canvas.width,
    height: canvas.height,
}

// This is the game loop
function step() {

    //change the canvas element's size to match the window size
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // Set the game width and height to the screen size
    camera.width = window.innerWidth;
    camera.height = window.innerHeight;

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

        let count = 0;
        // Move and draw each blob
        for (const blob of blobs) {
            count += blob.draw();
        }
        // draw name of biggest blob in top left of screen
        ctx.font = '20px BubbleGums';
        ctx.fillStyle = 'black';
        ctx.fillText(biggest.name + " is the biggest suck", camera.width / 2 - (ctx.measureText(biggest.name + " is the biggest suck").width / 2), 30);
        // draw number of players below that
        ctx.fillText(numPlayers + " players are trying to suck", camera.width / 2 - (ctx.measureText(numPlayers + " players are trying to suck").width / 2), 60);
        // draw camera's target's r in bottom left of screen
        if (camera.target) ctx.fillText("your suck size is " + parseInt(camera.target.r), camera.width / 2 - (ctx.measureText("your suck size is " + parseInt(camera.target.r)).width / 2), 90);
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
    if (camera.target.r == 20) ui.visible = true;
    if (gameState) location.reload();
    // get the touch coordinates and save to the ui object touch property
    ui.touch.sx = event.touches[0].clientX;
    ui.touch.sy = event.touches[0].clientY;
}, { passive: false });

//listen for touch changes
document.addEventListener('touchmove', (event) => {
    event.preventDefault();
    if (camera.target.r != 20) ui.visible = false;
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
            console.log('pressed', y > 0 ? 'down' : 'up');
            ws.send(JSON.stringify({ press: y > 0 ? 'down' : 'up' }));
        }
        // update the pressed property of the ui so it doesn't send another press message
        ui.pressed[y < 0 ? 'down' : 'up'] = false;
        ui.pressed[y > 0 ? 'down' : 'up'] = true;
    } else {
        // if the user isn't pressing far enough but hasn't untouched, send a release message
        if (ui.pressed[y < 0 ? 'down' : 'up']) {
            console.log('released', y < 0 ? 'down' : 'up');
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
        ws.send(JSON.stringify({ release: 'down' }));
        ws.send(JSON.stringify({ release: 'right' }));
        ws.send(JSON.stringify({ release: 'left' }));
    }
}, { passive: false });