const request       = require('request'),
      mustache      = require('mustache'),
      AWS           = require('aws-sdk'),
      Promise       = require('promise'),
      SamsungRemote = require('samsung-remote');

process.on('uncaughtException', function (err) {
  console.log(err);
});

AWS.config.update({
  region:           process.env.AWS_DEFAULT_REGION,
  accessKeyId:      process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey:  process.env.AWS_SECRET_KEY
});

const recieverIP  = process.env.RECEIVER_IP,
      recieverAPI = "YamahaRemoteControl/ctrl",
      sqsQueueUrl = process.env.AWS_SQS_URL,
      sqs         = new AWS.SQS(),
      remote      = new SamsungRemote({ ip: process.env.TV_IP }); 

const commands = {
  power:        '<YAMAHA_AV cmd="PUT"><Main_Zone><Power_Control><Power>{{value}}</Power></Power_Control></Main_Zone></YAMAHA_AV>',
  volume:       '<YAMAHA_AV cmd="PUT"><Main_Zone><Volume><Lvl><Val>{{value}} {{value2}} dB</Val><Exp></Exp><Unit></Unit></Lvl></Volume></Main_Zone></YAMAHA_AV>', // <Val>Up 1 dB</Val>
  volumeLevel:  '<YAMAHA_AV cmd="PUT"><Main_Zone><Volume><Lvl><Val>{{value}}</Val><Exp>1</Exp><Unit>dB</Unit></Lvl></Volume></Main_Zone></YAMAHA_AV>',
  mute:         '<YAMAHA_AV cmd="PUT"><Main_Zone><Volume><Mute>{{value}}</Mute></Volume></Main_Zone></YAMAHA_AV>',
  input:        '<YAMAHA_AV cmd="PUT"><Main_Zone><Input><Input_Sel>{{value}}</Input_Sel></Input></Main_Zone></YAMAHA_AV>',
  mode:         '<YAMAHA_AV cmd="PUT"><Main_Zone><Surround><Program_Sel><Current><Sound_Program>{{value}}</Sound_Program></Current></Program_Sel></Surround></Main_Zone></YAMAHA_AV>'
};

var num     = 0,
    command;

sqsRequest();

// Poll SQS queue
function sqsRequest() {
  return new Promise(function (resolve, reject) {
    var params = {
      QueueUrl: sqsQueueUrl,
      MaxNumberOfMessages:  1, // how many messages do we wanna retrieve?
      VisibilityTimeout:    60, // seconds - how long we want a lock on this job
      WaitTimeSeconds:      20 // seconds - how long should we wait for a message?
    };
    sqs.receiveMessage(params, function(err, data) {
      if (err) { 
        console.log(err); 
        reject(err);
      } else if (data.Messages) {
        var message = data.Messages[0];
        sendReciever(message);
        removeFromQueue(message); 
        resolve(data);
      } else { 
        resolve(data);
      }
      console.log(num += 1);
    });
  }).then(sqsRequest);
}

// Remove the message from queue
function removeFromQueue (message) {
  return new Promise(function (resolve, reject) {
    var params = {
      QueueUrl:       sqsQueueUrl,
      ReceiptHandle:  message.ReceiptHandle
    };
    sqs.deleteMessage(params, function(err, data) {
      if (err) reject(err);
      else     resolve(data);
    });
  });
}

// Send data to the receiver
function sendReciever(message) {
  return new Promise(function (resolve, reject) {
    command = JSON.parse(message.Body);
    console.log(command);

    if (command.action === "power") {
      if (command.value === "Standby") {
        tvOff();
      }
    }

    request.post(
      {url:     recieverIP+recieverAPI,
      body :    mustache.render(commands[command.action], command),
      headers:  {'Content-Type': 'text/xml'}
      },
      function (err, response, data) {        
        if (err) reject(err);
        else     resolve(data);
      }
    );
  });
}

function tvUp() {
  return new Promise(function (resolve, reject) {
    remote.isAlive(function(err) {
      if (err) reject(false);
      else     resolve(true);
    });
  });
}

function tvOff() {
  return new Promise(function (resolve, reject) {
    remote.send('KEY_POWEROFF', function callback(err) {
      if (err) reject(err);
      else     resolve();
    });
  });
}

function tvOn() {
  return new Promise(function (resolve, reject) {
    remote.send('KEY_POWERON', function callback(err) {
      if (err) reject(err);
      else     resolve();
    });
  });
}
// ** build in the npm lookup function for the receiver ip