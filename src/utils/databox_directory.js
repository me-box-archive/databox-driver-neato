var request = require('request');
var Promise = require('promise');

var databox_directory_url = process.env.DATABOX_DIRECTORY_ENDPOINT

exports.register_datastore = function(hostname, api_url) { // requires a description which is most liekely the vendor name and must be unique, will return databox global vendor id
  
   var options = {
        uri: databox_directory_url+'/datastore/register',
        method: 'POST',
        json: 
        {
          "hostname": hostname,
          "api_url": api_url
        }
    };

  return new Promise((resolve, reject) => {
    
    var register_datastore_callback = function (error, response, body) {
        if (error) {
          console.log(error);
          console.log("Can not register datastore with directory! waiting 5s before retrying");
          setTimeout(request, 5000, options, register_datastore_callback);
        }
        resolve(body);
    }
    console.log("Trying to register datastore with directory.", options);
    request(options,register_datastore_callback);
  
  });
}

// register datastore with directory will retry if directory is not ready 
var register_driver = function(vendorName,driverName,driverDescription) {
  return new Promise((resolve, reject) => {
    
    var vendor_id = null;
    var driver_id = null;

    console.log("Registering vendor:: " + vendorName + " ....");

    var registerCallback = function (err, data) {
      if(err) {
        console.log("Can not register vendor with directory! waiting 5s before retrying");
        setTimeout(register_vendor,5000,vendorName,registerCallback);
        return;
      }
      vendor_id = data['id'];
      
      var options = {
                      uri: databox_directory_url+'/driver/register',
                      method: 'POST',
                      json: 
                      {
                        "description": driverDescription,
                        "hostname": driverName,
                        "vendor_id": vendor_id
                      }
                    };
                    
      console.log("Registering driver:: " + driverName + " ....");
      var registerDriverCallback = function (error, response, body) {
        if(error) {
          console.log("Can not register driver with directory! waiting 5s before retrying");
          setTimeout(request,5000, options,registerDriverCallback)
          return;
        }
        console.log("\n------------------\n",body,"\n------------------\n");
        driver_id = body['id'];
        resolve({"vendor_id":vendor_id,"driver_id":driver_id}); 
      }
      
      
      request(options,registerDriverCallback);
    
    };

    register_vendor(vendorName,registerCallback);
  });
}
exports.register_driver = register_driver;


var register_vendor = function(description, done) { // requires a description which is most liekely the vendor name and must be unique, will return databox global vendor id
  var options = {
      uri: databox_directory_url+'/vendor/register',
      method: 'POST',
      json: 
      {
        "description": description  
      }
  };

  request(options, function (error, response, body) {
      return done(error,body);
  });
}

exports.register_sensor_type = function(description) { // requires a description which describes the catagory of sensors, if already exits then returns id 
  return new Promise((resolve, reject) => {

    var options = {
        uri: databox_directory_url+'/sensor_type/register',
        method: 'POST',
        json: 
        {
          "description": description  
        }
    };

    request(options, function (error, response, body) {
        if (error) {
          reject(error);
        }
        console.log(body);
        resolve(body);
    });
  });
}

exports.register_sensor = function(driver_id, sensor_type_id, datastore_id, vendor_id, vendor_sensor_id, unit, short_unit, description, location) { 
  return new Promise((resolve, reject) => {

    var options = {
        uri: databox_directory_url+'/sensor/register',
        method: 'POST',
        json: 
        {
              "description" : description, 
              "driver_id": driver_id, 
              "sensor_type_id" : sensor_type_id, 
              "datastore_id" : datastore_id, 
              "vendor_id" : vendor_id, 
              "vendor_sensor_id" : vendor_sensor_id, 
              "unit" : unit, 
              "short_unit" : short_unit, 
              "location" : location
        }
    };

    request(options, function (error, response, body) {
        if (error) {
          reject(error);
        }
        resolve(body);
    });
  });
}


exports.register_actuator_type = function(description, done) {
  var options = {
      uri: databox_directory_url+'/actuator_type/register',
      method: 'POST',
      json: 
      {
        "description": description  
      }
  };

  request(options, function (error, response, body) {
      if (!error && response.statusCode == 200) {
       return done(body);
      }
      return done(error);
  });
}

exports.register_actuator_method = function(actuator_id, description, done) {
  var options = {
      uri: databox_directory_url+'/actuator_method/register',
      method: 'POST',
      json: 
      {
        "actuator_id" : actuator_id,
        "description": description  
      }
  };

  request(options, function (error, response, body) {
      if (!error && response.statusCode == 200) {
       return done(body);
      }
      return done(error);
  });
}

exports.register_actuator = function(driver_id, actuator_type_id, controller_id, vendor_id, vendor_actuator_id, description, location, done) {
  var options = {
      uri: databox_directory_url+'/actuator/register',
      method: 'POST',
      json: 
      {
        "description" : description, 
            "driver_id": driver_id, 
            "actuator_type_id" : actuator_type_id, 
            "controller_id" : controller_id, 
            "vendor_id" : vendor_id, 
            "vendor_actuator_id" : vendor_actuator_id, 
            "location" : location 
      }
  };

  request(options, function (error, response, body) {
      if (error) {
       return done(error,null);
      }
      return done(null,body);
  });
}

exports.get_my_registered_sensors = function(vendor_id, done) {
  var options = {
      uri: databox_directory_url+'/vendor/'+vendor_id+'/sensor',
      method: 'GET',
  };

  request(options, function (error, response, body) {
      if (!error && response.statusCode == 200) {
       return done(body);
      }
      return done(error);
  });
}

exports.get_datastore_id = function(hostname, done) {
  
  return new Promise((resolve, reject) => {
    var options = {
        uri: databox_directory_url+'/datastore/get_id',
        method: 'POST',
        json:
        {
          "hostname": hostname
        }
    };
    
    var datastoreCallback = function (error, response, body) {
        if(error) {
          console.log("Can not get datastore id! waiting 5s before retrying");
          setTimeout(request,5000,options,datastoreCallback);
          return;
        }
        if(typeof body != 'undefined' && 'id' in body) {
          resolve(body['id']);
        } else {
          console.log("Can not get datastore id! waiting 5s before retrying");
          setTimeout(request,5000,options,datastoreCallback);
          return;
        }

    };

    request(options,datastoreCallback);
  });
}

exports.get_registered_sensor_types = function(done) { // takes in 

}

exports.get_registered_actuator_types = function(done) { // takes in 

}

exports.get_my_registered_actuators = function(vendor_id, done) {

}

exports.check_sensor_id = function(sensor_id, done) { // requires a description which is most liekely the vendor name and must be unique, will return databox global vendor id
  var options = {
      uri: databox_directory_url+'/sensor/check_id',
      method: 'POST',
      json: 
      {
        "sensor_id": sensor_id
      }
  };

  request(options, function (error, response, body) {
      if (!error && response.statusCode == 200) {
       return done(body);
      }
      return done(error);
  });
}
