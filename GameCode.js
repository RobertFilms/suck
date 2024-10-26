// Create a game class that will hold the game state
class Game {
    constructor() {
        this.gameWidth = 2000;
        this.gameHeight = 2000;
        this.tickSpeed = 1000 / 30;
        this.blobCounter = 0;
        this.blobs = [];
        this.blobLimit = ((this.gameWidth + this.gameHeight) / 2) / 10;
        this.blobAbsorb = 0.1;
        this.baddyChance = 0.3;
        this.maxSize = 50;
        for (let i = 0; i < this.blobLimit; i++) {
            let type = Math.random() > this.baddyChance ? "blob" : "baddy";
            this.blobs.push(
                new Blob(
                    Math.random() * this.gameWidth,
                    Math.random() * this.gameHeight,
                    Math.round(Math.random() * 20) + 10,
                    this.blobCounter++,
                    type
                ));
            // Set the color of the blob we just created by its type
            this.blobs[i].color = type === "blob" ? "#00FF00" : "#FF0000";
        }
    }

    step() {

        // If there are less than the limit of blobs, create a new blob
        if (this.blobs.length < this.blobLimit) {
            let type = Math.random() > this.baddyChance ? "blob" : "baddy";
            this.blobs.push(
                new Blob(
                    Math.random() * this.gameWidth,
                    Math.random() * this.gameHeight,
                    Math.round(Math.random() * 20) + 10,
                    this.blobCounter++,
                    type
                ));
            // Set the color of the blob we just created by its type
            this.blobs[this.blobs.length - 1].color = type === "blob" ? "#00FF00" : "#FF0000";
        }

        for (const blob of this.blobs) {
            // remove the blob if it is not alive
            if (!blob.alive) {
                this.blobs = this.blobs.filter(b => b.id !== blob.id);
            }
            // move the blob
            blob.move(this.gameWidth, this.gameHeight);

            // check if thhe blob is colliding with another blob
            for (const cblob of this.blobs) {
                // if the blob contains another blob
                if (blob.containsBlob(cblob) && blob.alive && cblob.alive) {
                    if (cblob.type === "baddy" && blob.type === "baddy" || cblob.type !== "baddy") {
                        // absorb the other blob
                        blob.r += cblob.r * this.blobAbsorb
                        // set the blob to not alive for next frame
                        cblob.alive = false;
                    } else {
                        blob.r -= cblob.r * this.blobAbsorb
                        cblob.r -= cblob.r * this.blobAbsorb
                        if (cblob.r < 2) {
                            cblob.alive = false;
                        }
                    }

                    // blob can't be bigger than a quarter the map
                    blob.r = Math.min(blob.r, Math.max(this.gameWidth, this.gameHeight) * 0.25);
                    // blob can't be smaller than 12
                    blob.r = Math.max(blob.r, 12);
                }
            }

            // if the blob is larger than this.maxSize, set it to not alive, and create 3 new blobs
            if (blob.r > this.maxSize && blob.type !== "player") {
                blob.alive = false;
                blob.r = 0;
                for (let i = 0; i < 5; i++) {
                    // create 5 new blobs outside of 10 pixels of this blob
                    this.blobs.push(
                        new Blob(
                            Math.random() * 20 + (blob.x - 10),
                            Math.random() * 20 + (blob.y - 10),
                            10,
                            this.blobCounter++,
                            blob.type
                        ));
                    this.blobs[this.blobs.length - 1].color = blob.type === "blob" ? "#00FF00" : "#FF0000";
                }
            }
        }
    }
}

// Create a Blob class with the usually movement properties
class Blob {
    constructor(x, y, r, id = null, type = "blob") {
        this.alive = true;
        this.id = id;
        this.type = type;
        this.x = x;
        this.y = y;
        this.r = r;
        this.up, this.down, this.left, this.right = false;
        this.xMom = 0;
        this.yMom = 0;
        this.xSpeed = 1;
        this.ySpeed = 1;
        // this.travelX = 0;
        // this.travelY = 0;
        this.travelX = Number((Math.random() * 4 - 2).toFixed(2));
        this.travelY = Number((Math.random() * 4 - 2).toFixed(2));
        this.color = "#FFFFFF";
    }

    // Each from will move the blob in its travel direction
    move(gW, gH) {
        // move the blob in its travel direction
        this.x += this.travelX;
        this.y += this.travelY;
        // if the blob hits the wall, change direction
        if (this.x + this.r > gW || this.x - this.r < 0) {
            this.travelX *= -1;
        }
        if (this.y + this.r > gH || this.y - this.r < 0) {
            this.travelY *= -1;
        }
    }

    // Check if the blob contains another blob
    containsBlob(blob) {
        // Use pathagorean theorem to calculate distance between two blobs
        let distance = Math.sqrt((blob.x - this.x) ** 2 + (blob.y - this.y) ** 2);
        // Return true if the distance is less than this blob's radius and this blob is larger than the other blob
        return distance < this.r && this.r > blob.r;
    }
}

// Create a blob that is the Player
class Player extends Blob {
    constructor(x, y, r, id = null, type = "player") {
        // Get all the properties of the Blob class
        super(x, y, r, id, type);
        // Generate a random color for the blob
        this.color = "#" + Math.floor(Math.random() * 16777215).toString(16);
        this.name();
    }

    // Player will move based on keypresses abd momentum
    move(gW, gH) {
        // Move the player based on keypresses
        if (this.up) {
            this.yMom -= this.ySpeed;
        }
        if (this.down) {
            this.yMom += this.ySpeed;
        }
        if (this.left) {
            this.xMom -= this.xSpeed;
        }
        if (this.right) {
            this.xMom += this.xSpeed;
        }

        // Move the player based on momentum
        this.x += this.xMom;
        this.y += this.yMom;

        // If the player hits the wall, stop the player
        if (this.x + this.r > gW || this.x - this.r < 0) {
            this.xMom = 0;
            this.x = Math.min(Math.max(this.x, this.r), gW - this.r);
        }
        if (this.y + this.r > gH || this.y - this.r < 0) {
            this.yMom = 0;
            this.y = Math.min(Math.max(this.y, this.r), gH - this.r);
        }

        // Use 80% friction to slow down the player
        this.xMom *= 0.8;
        this.yMom *= 0.8;
    }

    name() {
        const adjectives = [
            "abundant", "abysmal", "aged", "ancient", "arbitrary", "artificial", "barren", "bitter", 
            "bland", "blurry", "boiling", "bumpy", "chaotic", "clumsy", "coarse", "cold", "colossal", 
            "confused", "crooked", "crude", "curved", "damaged", "decent", "distant", "dusty", 
            "earthy", "empty", "faint", "feeble", "fickle", "filthy", "flat", "flimsy", "foul", 
            "fragile", "frigid", "fuzzy", "giant", "greasy", "grim", "grimy", "harsh", "hazy", 
            "hollow", "humid", "inferior", "jagged", "jumbled", "lean", "lethal", "limp", "loose", 
            "lousy", "massive", "messy", "mild", "misty", "moist", "muddy", "murky", "narrow", 
            "nasty", "obscure", "odd", "ordinary", "pale", "plain", "pointless", "poor", "prickly", 
            "primitive", "raw", "rigid", "rocky", "rough", "rusty", "scattered", "shabby", "shallow", 
            "shrill", "slimy", "slippery", "small", "smoky", "solid", "spare", "spiky", "spotted", 
            "square", "stale", "stiff", "sturdy", "tarnished", "tense", "thick", "thin", "uneven", 
            "vague", "weak", "wilted", "wiry", "worn", "wrinkled"
          ];
          const nouns = [
            "abyss", "angle", "arch", "ash", "badge", "bark", "beam", "beast", "blaze", "blend", 
            "bluff", "blur", "branch", "brink", "burst", "canyon", "cave", "charm", "cliff", "coil", 
            "creek", "crest", "crust", "dash", "depth", "ditch", "drain", "drift", "edge", "ember", 
            "feast", "flake", "flicker", "flood", "fog", "forge", "fringe", "frost", "glow", "grain", 
            "groove", "gust", "heap", "hitch", "hollow", "hue", "husk", "ice", "knot", "ledge", 
            "loop", "marsh", "moss", "mound", "notch", "patch", "peak", "pebble", "pile", "plume", 
            "pond", "pool", "pulse", "quarry", "ripple", "ridge", "rift", "ring", "river", "rust", 
            "scale", "scrap", "shade", "shaft", "shard", "shear", "shell", "shrine", "slab", "slate", 
            "slice", "smoke", "spark", "speck", "splinter", "spring", "stack", "stain", "streak", 
            "stream", "stretch", "stripe", "thicket", "trail", "trench", "veil", "void", "wave", 
            "whisper", "wrinkle", "zone"
          ];
          this.name = `${adjectives[Math.floor(Math.random() * adjectives.length)]} ${nouns[Math.floor(Math.random() * nouns.length)]}`;
    }

}

// export classes
module.exports = {
    Game: Game,
    Blob: Blob,
    Player: Player
}