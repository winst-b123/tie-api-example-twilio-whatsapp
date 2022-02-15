const postPath = {
  default: '/',
  outbound: "/outbound"
};
const http = require('http');
const express = require('express');
const path = require('path');
//const bodyParser = require('body-parser');
/**
 * Initialise variables using environment parameters
 */
const dotenv = require('dotenv');
dotenv.config();
const port = process.env.PORT || 3000 ;

// initialize an Express application
const app = express();
const router = express.Router();

// Tell express to use this router with /api before.
app.use(postPath.default, router);

console.log("I am here");
const MessagingResponse = require('twilio').twiml.MessagingResponse;
const TIE = require('@artificialsolutions/tie-api-client');
const {
    TENEO_ENGINE_URL,
    TWILIO_ACCOUNT_SID,
    TWILIO_AUTH_TOKEN,
    TWILIO_OUTBOUND_NUMBER
} = process.env;

//const port = process.env.PORT || 4337;
const teneoEngineUrl = process.env.TENEO_ENGINE_URL;

// initalise teneo
const teneoApi = TIE.init(teneoEngineUrl);

// initialise session handler, to store mapping between sender's phone number and the engine session id
const sessionHandler = SessionHandler();


// twilio message comes in
router.all(postPath.default, handleTwilioMessages(sessionHandler));
router.all(postPath.outbound, handleTwilioMessages(sessionHandler));


// start the express application
http.createServer(app).listen(port, () => {
  console.log(`Listening on port: ${port}`);
});



// handle incoming twilio message
function handleTwilioMessages(sessionHandler) {
  return async (req, res) => {

    const triggerFrom = req.headers["from"];
    const triggerInput = req.headers["body"];


    
  }
}


