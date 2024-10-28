# Suck
agar.io clone

Become the biggest suck. Don't get sucked.

Try a demo: [suck.animetidd.is](http://suck.animetidd.is/)

## Installation
- Download repo
- Unzip
- Navigate to folder in shell
- Run `npm i`
- Run `node app.js`
- Copy `data/database_template.db` to `/data/database.db`
- In browser, go to `http://localhost:3000`
- Share your IP with friends (they replace `localhost` with your IP)
- Suck

### Editting
- Game logic is handle by `GameCode.js`
- Drawing and receiving controls is handled by `public/js/game.js`
- The website, the game loop, and the database are in `app.js`

#### Deployment
- You can add a `/.env` file containing `PORT=xxxx` to change your port