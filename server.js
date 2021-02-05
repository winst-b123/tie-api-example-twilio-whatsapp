/**
 * Copyright 2019 Artificial Solutions. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 * 
 *    http://www.apache.org/licenses/LICENSE-2.0
 * 
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

const http = require('http');
const express = require('express');
const bodyParser = require('body-parser');
const MessagingResponse = require('twilio').twiml.MessagingResponse;
const TIE = require('@artificialsolutions/tie-api-client');
const {
    TENEO_ENGINE_URL,
    TWILIO_ACCOUNT_SID,
    TWILIO_AUTH_TOKEN,
    TWILIO_OUTBOUND_NUMBER
} = process.env;

const port = process.env.PORT || 4337;
const teneoEngineUrl = process.env.TENEO_ENGINE_URL;
const postPath = {
    default: '/'
};

let twilioActions = {
    outbound_call: '/outbound',
    hang_up: '/hang_up'
};
let twilioAction = postPath.default;
const app = express();

// initalise teneo
const teneoApi = TIE.init(teneoEngineUrl);

// initialise session handler, to store mapping between sender's phone number and the engine session id
const sessionHandler = SessionHandler();

app.use(bodyParser.urlencoded({ extended: false }));

// twilio message comes in
app.post("/outbound", handleTwilioMessages(sessionHandler));
app.post("/", handleTwilioMessages(sessionHandler));

function _stringify (o)
{
  const decircularise = () =>
  {
    const seen = new WeakSet();
    return (key,val) => 
    {
      if( typeof val === "object" && val !== null )
      {
        if( seen.has(val) ) return;
        seen.add(val);
      }
      return val;
    };
  };
  
  return JSON.stringify( o, decircularise() );
}

// handle incoming twilio message
function handleTwilioMessages(sessionHandler) {
  return async (req, res) => {
    console.log("in handleTwilioMessages");
    // get the sender's phone number
    var from = req.body.From;
    console.log(`from: ${from}`);

    // get message from user
    var userInput = req.body.Body;
    console.log(`REQUEST (flattened):`);
    console.log(_stringify(req));
    
    console.log(`RESPONSE (flattened):`);
    console.log(_stringify(res));
    const triggerFrom = "+" + req.query["phone"].replace(/[^0-9]/g, '');  
    const triggerInput = req.query["userInput"];   
    console.log(`from: ${triggerFrom}`);
    console.log(`userInput: ${triggerInput}`);
    //var teneoSessionId = req.headers["session"];
    //console.log(`my session ID: ${teneoSessionId}`);
    if(from===undefined || from===null || from=="") {
      from = triggerFrom ;
      userInput = triggerInput;
      console.log(`UPD1 from: ${from}`);
      console.log(`UPD2 userInput: ${userInput}`);
    }
    var teneoResponse = "";

    // check if we have stored an engine sessionid for this sender
    //if(teneoSessionId===undefined || teneoSessionId===null || teneoSessionId=="") {
    var teneoSessionId = sessionHandler.getSession(from);
    
     
    console.log(`my session ID: ${teneoSessionId}`);
    // send input to engine using stored sessionid and retreive response:
    teneoResponse = await teneoApi.sendInput(teneoSessionId, { 'text': userInput, 'channel': 'twilio-whatsapp' });
    console.log(`teneoResponse: ${teneoResponse.output.text}`);
    teneoResponse = teneoResponse.output.text;
    teneoSessionId = teneoResponse.sessionId;
    /*}
    else {
        teneoResponse = userInput;
        console.log(`teneoResponse: ${teneoResponse}`);
    }*/
    
    // store engine sessionid for this sender
    sessionHandler.setSession(from, teneoSessionId);

    // return teneo answer to twilio
    sendTwilioMessage(teneoResponse, res, triggerFrom);
  }
}

// compose and send message
function sendTwilioMessage(teneoResponse, res, triggerFrom) {
const client = require('twilio')(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
if(triggerFrom!==undefined && triggerFrom!==null && triggerFrom!="") {
    console.log('trying to send outbound message: ${teneoResponse}');
    console.log(`to: ${triggerFrom}`)
    console.log(`from: ${TWILIO_OUTBOUND_NUMBER}`)
client.messages
      .create({
         from: TWILIO_OUTBOUND_NUMBER,
         body:  teneoResponse,
         to: triggerFrom
       })
      .then(message => console.log(message.sid));
}
 else {
  const message = teneoResponse;
  const twiml = new MessagingResponse();

  twiml.message(message);

  res.writeHead(200, { 'Content-Type': 'text/xml' });
  res.end(twiml.toString());
   console.log(`twim1: ${twiml.toString()}`);
 }
}


/***
 * SESSION HANDLER
 ***/
function SessionHandler() {

  // Map the sender's phone number to the teneo engine session id. 
  // This code keeps the map in memory, which is ok for testing purposes
  // For production usage it is advised to make use of more resilient storage mechanisms like redis
  const sessionMap = new Map();

  return {
    getSession: (userId) => {
      if (sessionMap.size > 0) {
        return sessionMap.get(userId);
      }
      else {
        return "";
      }
    },
    setSession: (userId, sessionId) => {
      sessionMap.set(userId, sessionId)
    }
  };
}

http.createServer(app).listen(port, () => {
  console.log(`Express server listening on port ${port}`);
});
