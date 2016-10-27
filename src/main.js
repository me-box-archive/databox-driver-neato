var express = require("express");
var bodyParser = require("body-parser");
var session = require("express-session");
var databox_directory = require("./utils/databox_directory.js");
var request = require('request');

var config = require('./config.json');

var DATABOX_STORE_BLOB_ENDPOINT = process.env.DATABOX_STORE_BLOB_ENDPOINT;


var botvac = require('node-botvac');
var client = new botvac.Client();

var robot = null;
client.authorize(config.email, config.password, false, function (error) {
    if (error) {
        console.log(error);
        return;
    }
    client.getRobots(function (error, robots) {
        if (error) {
            console.log(error);
            return;
        }
        robot = robots[0];
    });
});



var SENSOR_TYPE_IDs = [];
var SENSOR_IDs = {};
var ACTUATOR_IDs = {};
var VENDOR_ID = null;
var DRIVER_ID = null;
var DATASTORE_ID = null;


var allowCrossDomain = function(req, res, next) {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Content-Length, X-Requested-With');
    res.header('Content-Type', 'application/json');
    next();
};

var app = express();
app.use(session({resave: false, saveUninitialized: false,  secret: 'databox'}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));
app.use(allowCrossDomain);

app.get("/status", function(req, res) {
    res.send("active");
});

app.post('/api/actuate', function(req, res, next) {
  		
      var actuator_id = req.body.actuator_id;
      var method = req.body.method;
      var data = req.body.data;
      
      if(ACTUATOR_IDs[actuator_id] == 'startCleaning') {
        robot.startCleaning()
        res.send("OK");
        return;
     }
      if(ACTUATOR_IDs[actuator_id] == 'startSpotCleaning') {
        robot.startSpotCleaning()
        res.send("OK");
        return;
      }
      if(ACTUATOR_IDs[actuator_id] == 'pauseCleaning') {
        robot.pauseCleaning()
        res.send("OK");
        return;
      }
      if(ACTUATOR_IDs[actuator_id] == 'resumeCleaning') {
        robot.resumeCleaning();
        res.send("OK");
        return;
      }
      if(ACTUATOR_IDs[actuator_id] == 'startCleaning') {
        robot.startCleaning();
        res.send("OK");
        return;
      }
      if(ACTUATOR_IDs[actuator_id] == 'sendToBase') {
        robot.sendToBase();
        res.send("OK");
        return;
      }
      
      res.send("Unsupported actuator");

});

var lastReading = {error:"no readings taken"}
app.get("/api/lastReading", function (req, res, next) {
  
    res.send(lastReading);
});

function updateSensors() {
  var data = [];
  robot.getState((err)=>{
    data.push({name:'charge',val:robot.charge});
    data.push({name:'isCharging',val:robot.isCharging});
    data.push({name:'isDocked',val:robot.isDocked});
    data.push({name:'canStart',val:robot.canStart});
    data.push({name:'canStop',val:robot.canStop});
    data.push({name:'canPause',val:robot.canPause});
    data.push({name:'canResume',val:robot.canResume});
    data.push({name:'canGoToBase',val:robot.canGoToBase});

    for(item of data) {
      save(SENSOR_IDs[item.name] , item.val);
    }

  });

  console.log(data);
  lastReading = data;
}

setInterval(updateSensors, 5000);


app.listen(8080);


databox_directory.register_driver('Neato','databox-driver-neato', 'A Databox driver for the neato botvac')
   .then((ids) => {
    console.log(ids);
    VENDOR_ID = ids['vendor_id'];
    DRIVER_ID = ids['driver_id'];
    console.log("VENDOR_ID", VENDOR_ID);
    console.log("DRIVER_ID", DRIVER_ID);
    return databox_directory.get_datastore_id('databox-store-blob');
  })
  .then ((datastore_id) => {
    DATASTORE_ID = datastore_id;
    console.log("DATASTORE_ID", DATASTORE_ID);
    proms = [
      databox_directory.register_sensor_type('charge'),
      databox_directory.register_sensor_type('isCharging'),
      databox_directory.register_sensor_type('isDocked'),
      databox_directory.register_sensor_type('canStart'),
      databox_directory.register_sensor_type('canStop'),
      databox_directory.register_sensor_type('canPause'),
      databox_directory.register_sensor_type('canResume'),
      databox_directory.register_sensor_type('canGoToBase'),
    ]
    return Promise.all(proms);
  })
  .then((sensorTypeIds)=>{
    console.log('sensorTypeIds::', sensorTypeIds);
    SENSOR_TYPE_IDs = sensorTypeIds;
    return Promise.resolve()
  }) 
  .then (() => {
    
    proms = [
        databox_directory.register_sensor(DRIVER_ID, SENSOR_TYPE_IDs[0].id, DATASTORE_ID, VENDOR_ID, 'botvac', '%', '%', 'Battery charge %', ''),
        databox_directory.register_sensor(DRIVER_ID, SENSOR_TYPE_IDs[1].id, DATASTORE_ID, VENDOR_ID, 'botvac', 'Bool', '', 'is it charging?', ''),
        databox_directory.register_sensor(DRIVER_ID, SENSOR_TYPE_IDs[2].id, DATASTORE_ID, VENDOR_ID, 'botvac', 'Bool', '', 'is it docked?', ''),
        databox_directory.register_sensor(DRIVER_ID, SENSOR_TYPE_IDs[3].id, DATASTORE_ID, VENDOR_ID, 'botvac', 'Bool', '', 'can it start cleaning?', ''),
        databox_directory.register_sensor(DRIVER_ID, SENSOR_TYPE_IDs[4].id, DATASTORE_ID, VENDOR_ID, 'botvac', 'Bool', '', 'can it stop cleaning?', ''),
        databox_directory.register_sensor(DRIVER_ID, SENSOR_TYPE_IDs[5].id, DATASTORE_ID, VENDOR_ID, 'botvac', 'Bool', '', 'can it pause cleaning?', ''),
        databox_directory.register_sensor(DRIVER_ID, SENSOR_TYPE_IDs[6].id, DATASTORE_ID, VENDOR_ID, 'botvac', 'Bool', '', 'can it resume cleaning?', ''),
        databox_directory.register_sensor(DRIVER_ID, SENSOR_TYPE_IDs[7].id, DATASTORE_ID, VENDOR_ID, 'botvac', 'Bool', '', 'can it go back to base?', '')
    ];
    return Promise.all(proms);
  })
  .then((sensorIds) => {
    console.log("sensorIds::", sensorIds); 
    
      SENSOR_IDs.charge = sensorIds[0].id;
      SENSOR_IDs.isCharging = sensorIds[1].id;
      SENSOR_IDs.isDocked = sensorIds[2].id;
      SENSOR_IDs.canStart = sensorIds[3].id;
      SENSOR_IDs.canStop = sensorIds[4].id;
      SENSOR_IDs.canPause = sensorIds[5].id;
      SENSOR_IDs.canResume = sensorIds[6].id;
      SENSOR_IDs.canGoToBase = sensorIds[7].id;

      console.log("SENSOR_IDs", SENSOR_IDs);
  })
  .then(()=>{
      var proms = []
      var actuators = ['startCleaning','startSpotCleaning','stopCleaning','pauseCleaning','resumeCleaning','sendToBase']
      for(var atype of actuators) {
        proms.push(
          new Promise((resolve, reject) => {
            var actuator_type = atype;
            databox_directory.register_actuator_type(actuator_type, function(result) {
                var id = result.id;
                databox_directory.register_actuator( DRIVER_ID, id, DATASTORE_ID, VENDOR_ID, 1, actuator_type, 'home', function (err,data) { 
                  if(err) { 
                    console.log("[ERROR]", err, DRIVER_ID, on_id,DATASTORE_ID,VENDOR_ID , actuator_type)
                    reject(err);
                    return;
                  }
                  ACTUATOR_IDs[result.id] = actuator_type;
                  resolve(result.id);
                });
            })
          })
        );
      }

      return Promise.all(proms);
  })
  .then(() => {
    console.log("DONE");
  })
  .catch((err) => {
    console.log(err)
  });


module.exports = app;


function save(sid,data) {
      console.log("Saving data::", sid, data);
      if(VENDOR_ID != null) {
        var options = {
            uri: DATABOX_STORE_BLOB_ENDPOINT + '/data',
            method: 'POST',
            json: 
            {
              'sensor_id': sid, 
              'vendor_id': VENDOR_ID, 
              'data': data   
            }
        };
        request.post(options, (error, response, body) => { if(error) console.log(error, body);});
      }
    }