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
    if (message.update) {
        let player = message.update.find(b => b.id == ws.id);
        if (!player) {
            gameState = "lose";
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

// Create a blob that is the Player
class Player extends Blob {
    constructor(x, y, r) {
        // Get all the properties of the Blob class
        super(x, y, r);
        // Set the player's color to red
        this.color = "#FF0000";
    }

    // Draw the player on the canvas
    draw() {
        super.draw();
    }
}

class touchUI {
    constructor() {
        this.visible = false;
    }

    draw() {
        if (this.visible) {
            ctx.beginPath();
            ctx.arc(
                canvas.width - 50,
                canvas.height - 50,
                40,
                0, 2 * Math.PI);
            ctx.fillStyle = "#000000";
            ctx.fill();
            ctx.stroke();
        }
    }

}

// Set the game over state
gameState = "";

// Create an array of blobs
var blobs = [];

// biggest blob
var biggest = { size: 0, name: "" };

// number of players
var numPlayers = 0;

// Get the canvas and context
var canvas = document.getElementById('gameWindow');
var ctx = canvas.getContext('2d');

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
    if (gameState == "lose") {
        // show game over text in middle of screen
        ctx.font = '30px BubbleGums';
        ctx.fillStyle = 'red';
        ctx.fillText('ya got sucked', canvas.width / 2 - 100, canvas.height / 2);
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
        ctx.fillText(biggest.name + " is the biggest suck", 10, 30);
        // draw number of players below that
        ctx.fillText(numPlayers + " players are trying to suck", 10, 60);
        // draw camera's target's r in bottom left of screen
        if (camera.target) ctx.fillText("your suck size is " + parseInt(camera.target.r), 10, 90);
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
    let x = event.touches[0].clientX;
    let y = event.touches[0].clientY;
    ws.send(JSON.stringify({ touch: { x, y } }));
});