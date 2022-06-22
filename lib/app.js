const http = require('http');
const express = require('express');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const cors = require('cors');


const dotenv = require('dotenv');
dotenv.config({ path: '.env' });

require('express-group-routes');



const app = express();

app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());
app.use(cookieParser());

app.use(cors({ origin: (origin, callback) => callback(null, true), credentials: true }));


app.server = http.createServer(app)

app.group("/api/v1/eth", (router) => {
    router.use('/', require('../lib/routes/eth_routes')); 
});



module.exports = {
    start: async () => {
        try {
            await app.server.listen(process.env.NPM_PORT, () => console.log("Server Started on port " +process.env.NPM_PORT));
        } catch (e) {
            console.log(e)
        }
    }
}