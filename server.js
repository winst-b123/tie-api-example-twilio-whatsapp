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

const TIE = require('@artificialsolutions/tie-api-client');
const {
    TENEO_ENGINE_URL
} = process.env;

const port = process.env.PORT || 4337;
const teneoEngineUrl = process.env.TENEO_ENGINE_URL;

const responseObject = {
  smsText: ""
}

const app = express();

// initalise teneo
const teneoApi = TIE.init(teneoEngineUrl);

app.use(bodyParser.urlencoded({ extended: false }));

// twilio message comes in
app.post("/", handleAPIMessages());
app.get("/", handleAPIMessages());

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
function handleAPIMessages() {

    return async (req, res) => {

        console.log("Called handleAPIMessages");
        
        let body = '';
        var post ;
        var userInput;
        var apiKey;

        req.on('data', function (data) {
          
            body += data;
        });

        req.on('end', async function () {

            post = JSON.parse(body);
            userInput = post.userInput;
            apiKey = req.headers["apikey"];    
            
            console.log("Userinput: " + userInput);
            console.log("apikey: " + apiKey);

            if (apiKey === '' || apiKey === null || apiKey === 'undefined')
            {
                console.log("Returning a 401 response");
                res.writeHead(401, { 'Content-Type': 'text/json' });
                res.end();   
                return;
            }             

            var teneoResponse = "";
            var teneoSessionId = "";

            // send input to engine using stored sessionid and retreive response:
            teneoResponse = await teneoApi.sendInput(teneoSessionId, { 'text': userInput, 'channel': 'cai-connector', 'apiKey': apiKey });

            console.log("Response from teneo " + _stringify(teneoResponse));
        
            // If api key does not match the one in Teneo
            if (teneoResponse.output.text === "You are not authorised to access this service.")
            {
                console.log("Returning a 401 response");
                res.writeHead(401, { 'Content-Type': 'text/json' });
                res.end();
                return;
            }
            
            // Create the response object which is this API final output
            var caiConnectorResponse = Object.create(responseObject);
            caiConnectorResponse.smsText = teneoResponse.output.text;

            // return teneo answer to twilio
            console.log("Returning a 200 response");
            res.writeHead(200, { 'Content-Type': 'text/json' });
            res.end(_stringify(caiConnectorResponse));
            return;
        });
    }
}

http.createServer(app).listen(port, () => {
  console.log(`Express server listening on port ${port}`);
});
