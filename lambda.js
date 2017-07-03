/**
 * Send request for home service to SQS from Alexa
 */

// Route the incoming request based on type (LaunchRequest, IntentRequest,
// etc.) The JSON body of the request is provided in the event parameter.
const AWS = require('aws-sdk'),
      sqs = new AWS.SQS();

// Enter in your information
const sqsQueueUrl     = 
      applicationId   = 

const volumeIncreaseMax = 20,
      volumeDefault     = 5;

const validIntents = [
    "power",
    "volume",
    "volume_up",
    "volume_down",
    "volumeLevel",
    "mute",
    "mute_on",
    "mute_off",
    "input",
    "mode"
];
const actionDictionary = {
    quieter:    "Down",
    louder:     "Up",
    up:         "Up",
    down:       "Down",
    on:         "On",
    off:        "Off"
};
const inputDictionary = {
    hdmi1:          "HDMI1",
    hdmi2:          "HDMI2",
    hdmi3:          "HDMI3",
    hdmi4:          "HDMI4",
    hdmi5:          "HDMI5",
    hdmi6:          "HDMI6",
    av1:            "AV1",
    av2:            "AV2",
    av3:            "AV3",
    av4:            "AV4",
    av5:            "AV5",
    av6:            "AV6",
    radio:          "Radio",
    usb:            "USB",
    'apple tv':     "HDMI1",
    apple:          "HDMI1",
    ps3:            "HDMI2",
    chromecast:     "HDMI3",
    'chrome cast':  "HDMI3",
    pc:             "HDMI4",
    media:          "HDMI4",
    'raspberry pi': "HDMI5",
    raspberry:      "HDMI5",
    pi:             "HDMI5",
    aux:            "AUX",
    auxiliary:      "AUX"
};
const modeDictionary = {
    '5 stereo':         "5ch Stereo",
    'music':            "Music",
    'hall munich':      "Hall in Munich",
    'hall vienna':      "Hall in Vienna",
    'hall amsterdam':   "Hall in Amsterdam",
    'chamber':          "Chamber",
    'church freiburg':  "Church in Freiburg",
    'church royaumont': "Church in Royaumont",
    'village vanguard': "Village Vanguard",
    'the bottom line':  "The Bottom Line",
    'cellar club':      "Cellar Club",
    'the roxy theatre': "The Roxy Theatre",
    'warehouse loft':   "Warehouse Loft",
    '9 stereo':         "9ch Stereo",
    'standard':         "Standard",
    'spectacle':        "Spectacle",
    'sci-fi':           "Sci-Fi",
    'adventure':        "Adventure",
    'drama':            "Drama",
    'mono movie':       "Mono Movie",
    'sports':           "Sports",
    'recital':          "Recital",
    'opera':            "Opera",
    'action game':      "Action Game",
    'roleplaying game': "Roleplaying Game",
    'music video':      "Music Video"
};


exports.handler = function (event, context) {
    try {
        console.log("event.session.application.applicationId=" + event.session.application.applicationId);

        // Prevent someone else from configuring a skill that sends requests to this function.
        
        if (event.session.application.applicationId !== applicationId) {
             context.fail("Invalid Application ID");
        }

        if (event.session.new) {
            onSessionStarted({requestId: event.request.requestId}, event.session);
        }

        if (event.request.type === "LaunchRequest") {
            onLaunch(event.request,
                event.session,
                function callback(sessionAttributes, speechletResponse) {
                    context.succeed(buildResponse(sessionAttributes, speechletResponse));
                });
        } else if (event.request.type === "IntentRequest") {
            onIntent(event.request,
                event.session,
                function callback(sessionAttributes, speechletResponse) {
                    context.succeed(buildResponse(sessionAttributes, speechletResponse));
                });
        } else if (event.request.type === "SessionEndedRequest") {
            onSessionEnded(event.request, event.session);
            context.succeed();
        }
    } catch (e) {
        context.fail("Exception: " + e);
    }
};

/**
 * Called when the session starts.
 */
function onSessionStarted(sessionStartedRequest, session) {
    console.log("onSessionStarted requestId=" + sessionStartedRequest.requestId +
        ", sessionId=" + session.sessionId);
}

/**
 * Called when the user launches the skill without specifying what they want.
 */
function onLaunch(launchRequest, session, callback) {
    console.log("onLaunch requestId=" + launchRequest.requestId +
        ", sessionId=" + session.sessionId);

    // Dispatch to your skill's launch.
    getLaunchResponse(callback);
}

/**
 * Called when the user specifies an intent for this skill.
 */
function onIntent(intentRequest, session, callback) {
    console.log("onIntent requestId=" + intentRequest.requestId +
        ", sessionId=" + session.sessionId);

    var intent = intentRequest.intent,
        intentName = intentRequest.intent.name;

    // Dispatch to your skill's intent handlers
    if (isInArray(intentName, validIntents)) {
        createMessage(intent, callback);
    } else if ("AMAZON.HelpIntent" === intentName) {
        getHelpResponse(callback); 
    } else if ("AMAZON.StopIntent" === intentName || "AMAZON.CancelIntent" === intentName) {
        stopSessionRequest(callback);
    } else {
        throw "Invalid intent";
    }
}

/**
 * Called when the user ends the session.
 * Is not called when the skill returns shouldEndSession=true.
 */
function onSessionEnded(sessionEndedRequest, session) {
    console.log("onSessionEnded requestId=" + sessionEndedRequest.requestId +
        ", sessionId=" + session.sessionId);
    // Add cleanup logic here
}

// --------------- Functions that control the skill's behavior -----------------------

function getLaunchResponse(callback) {
    var sessionAttributes = {};
    var cardTitle = "Start";
    var speechOutput = "T V ready.";
    // If the user either does not reply to the welcome message or says something that is not
    // understood, they will be prompted again with this text.
    var repromptText = speechOutput;
    var shouldEndSession = false;

    callback(sessionAttributes,
        buildSpeechletResponse(cardTitle, speechOutput, repromptText, shouldEndSession));
}

function getHelpResponse(callback) {
    // If we wanted to initialize the session to have some attributes we could add those here.
    var sessionAttributes = {};
    var cardTitle = "Help";
    var speechOutput = "You can control the receiver's power, volume, input and sound modes.";
    // If the user either does not reply to the welcome message or says something that is not
    // understood, they will be prompted again with this text.
    var repromptText = speechOutput;
    var shouldEndSession = false;

    callback(sessionAttributes,
        buildSpeechletResponse(cardTitle, speechOutput, repromptText, shouldEndSession));
}

function createMessage(intent, callback) {
    var message = {};
    if (intent.name.match(/^.*_.*$/)) {
        var newMessage = intent.name.split("_");
        message.action = newMessage[0];
        message.value = actionDictionary[newMessage[1]];

        if (message.action === "volume") {
            message.value2 = volumeDefault;
        } 
    } else {
        message.action = intent.name;

        // Check for intents power, volume and mute
        if (intent.slots.action !== undefined) {
            if (message.action === "power" && intent.slots.action.value === "off") {
                message.value = "Standby";
            } else {
                message.value = actionDictionary[intent.slots.action.value];
                if (intent.slots.value !== undefined) {
                    var volume = intent.slots.value.value;
                    // Set the volume increase value, default if note set
                    if (isNaN(volume)) {
                        message.value2 = volumeDefault;
                    } else if (volume > volumeIncreaseMax) {
                        message.value2 = volumeIncreaseMax;
                    } else {
                        message.value2 = volume;
                    }
                }
            }
        // Checks for intent volume level, changes it to negative and times by 10
        } else if (intent.slots.value !== undefined) {
            var volumeSet = intent.slots.value.value;
            if (!isNaN(volumeSet)) {
                message.value = (volumeSet * -1) * 10;
            }
        // Checks for intent input 
        } else if (intent.slots.inputs !== undefined) {
            var input = intent.slots.inputs.value.toLowerCase();
            message.value = inputDictionary[input];
        } else if (intent.slots.modes !== undefined) {
            var mode = intent.slots.modes.value.toLowerCase();
            message.value = modeDictionary[mode];
        }
    }

    if (message.value === undefined) {
        handleSessionEndRequest(callback);
    } else {
        console.log(message);
        sendSQS(message, callback);
    }
}

function sendSQS(message, callback) {
    var params = {
        MessageBody: JSON.stringify(message),
        QueueUrl: sqsQueueUrl,
        DelaySeconds: 0
    };
    sqs.sendMessage(params, function(err, data) {
        if (err) {
            console.log(err, err.stack); // an error occurred
            handleSessionEndRequest(callback);
        } else {
            completeSQS(message, callback);
        }
    });
}

function completeSQS(message, callback) {
    var sessionAttributes = {message},
        cardTitle         = message.action,
        repromptText      = "",
        shouldEndSession  = false,
        speechOutput      = message.action + " " + message.value;

    if (message.value2 !== undefined) {
        speechOutput += " " + message.value2;
    }

    callback(sessionAttributes,
         buildSpeechletResponse(cardTitle, speechOutput, repromptText, shouldEndSession));
}

function handleSessionEndRequest(callback) {
    var cardTitle        = "Session Ended",
        speechOutput     = "I am unable to complete your request.",
    // Setting this to true ends the session and exits the skill.
        shouldEndSession = true;
    callback({}, buildSpeechletResponse(cardTitle, speechOutput, null, shouldEndSession));
}

function stopSessionRequest(callback) {
    var cardTitle        = "Session Stop",
    shouldEndSession = true;
    callback({}, buildSpeechletResponse(cardTitle, null, null, shouldEndSession));
}

// --------------- Helpers that build all of the responses -----------------------

function buildSpeechletResponse(title, output, repromptText, shouldEndSession) {
    return {
        outputSpeech: {
            type: "PlainText",
            text: output
        },
        card: {
            type:    "Simple",
            title:   "SessionSpeechlet - " + title,
            content: "SessionSpeechlet - " + output
        },
        reprompt: {
            outputSpeech: {
                type: "PlainText",
                text: repromptText
            }
        },
        shouldEndSession: shouldEndSession
    };
}

function buildResponse(sessionAttributes, speechletResponse) {
    return {
        version:           "1.0",
        sessionAttributes: sessionAttributes,
        response:          speechletResponse
    };
}

// --------------- Helpers functions -----------------------

function isInArray(value, array) {
  return array.indexOf(value) > -1;
}