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
        this.buttons = [
            { x: 0, y: 0, w: 0, h: 0, text: "up", press: "up", release: "up" },
            { x: 0, y: 0, w: 0, h: 0, text: "down", press: "down", release: "down" },
            { x: 0, y: 0, w: 0, h: 0, text: "left", press: "left", release: "left" },
            { x: 0, y: 0, w: 0, h: 0, text: "right", press: "right", release: "right" },
        ]
    }

    draw() {
        if (this.visible) {
            // if camera is wider that it is tall
            if (camera.width > camera.height) {
                /* 
                place four rectanglur buttons, 1/8th the screen width and 1/2 the screen height
                up, left, right, down on the screen in the top-left, bottom-left, top-right, bottom-right respectively
                */
                this.buttons = [
                    { x: 0, y: 0, w: camera.width / 8, h: camera.height / 2, text: "🢁u", press: "up", release: "up" },
                    { x: 0, y: camera.height / 2, w: camera.width / 8, h: camera.height / 2, text: "🢀l", press: "left", release: "left" },
                    { x: camera.width - camera.width / 8, y: 0, w: camera.width / 8, h: camera.height / 2, text: "🢂r", press: "right", release: "right" },
                    { x: camera.width - camera.width / 8, y: camera.height / 2, w: camera.width / 8, h: camera.height / 2, text: "🢃d", press: "down", release: "down" },
                ]
            } else {
                /* 
                place four rectanglur buttons, 1/4th the screen width and 1/4 the screen height
                across the bottom of the screen in left up down right order
                */
                this.buttons = [
                    { x: 0, y: camera.height - camera.height / 4, w: camera.width / 4, h: camera.height / 4, text: "🢀l", press: "left", release: "left" },
                    { x: camera.width / 4, y: camera.height - camera.height / 4, w: camera.width / 4, h: camera.height / 4, text: "🢁u", press: "up", release: "up" },
                    { x: camera.width / 2, y: camera.height - camera.height / 4, w: camera.width / 4, h: camera.height / 4, text: "🢃d", press: "down", release: "down" },
                    { x: camera.width - camera.width / 4, y: camera.height - camera.height / 4, w: camera.width / 4, h: camera.height / 4, text: "🢂r", press: "right", release: "right" },
                ]
            }
            // draw each button
            for (const button of this.buttons) {
                ctx.beginPath();
                ctx.rect(button.x, button.y, button.w, button.h);
                ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
                ctx.fill();
                ctx.stroke();
                ctx.font = '20px arial';
                ctx.fillStyle = 'white';
                ctx.fillText(button.text, button.x + button.w / 2 - (ctx.measureText(button.text).width / 2), button.y + button.h / 2 + 10);
            }
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
canvas.addEventListener('contextmenu', function(event) {
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
    ui.visible = false;
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
    /* for each touch, check if it's inside a button 
    and send the press message for that button */
    for (const touch of event.touches) {
        for (const button of ui.buttons) {
            if (touch.clientX > button.x && touch.clientX < button.x + button.w && touch.clientY > button.y && touch.clientY < button.y + button.h) {
                ws.send(JSON.stringify({ press: button.press }));
            }
        }
    }
});

//listen for touch changes
document.addEventListener('touchmove', (event) => {
    event.preventDefault();
    /* for each touch, check if to see if it was inside a button, but moved out 
    and send the release message for that button */
    for (const touch of event.changedTouches) {
        for (const button of ui.buttons) {
            if (!(touch.clientX > button.x && touch.clientX < button.x + button.w && touch.clientY > button.y && touch.clientY < button.y + button.h)) {
                ws.send(JSON.stringify({ release: button.release }));
            }
        }
    }
});

//listen for touch ends
document.addEventListener('touchend', (event) => {
    event.preventDefault();
    /* for each touch, check if it's inside a button 
    and send the release message for that button */
    for (const touch of event.changedTouches) {
        for (const button of ui.buttons) {
            if (touch.clientX > button.x && touch.clientX < button.x + button.w && touch.clientY > button.y && touch.clientY < button.y + button.h) {
                ws.send(JSON.stringify({ release: button.release }));
            }
        }
    }
});