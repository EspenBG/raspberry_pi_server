/*********************************************************************
 * IMPORTS AND CONSTANTS
 *********************************************************************/

// TODO Add some of the options to the server-config
const app = require('express')();
const server = require('http').createServer(app);
const io = require('socket.io').listen(server);
const _ = require('underscore');
const fs = require('fs');
//const jQuery = require('jQuery') // NOT USED ANYMORE
const sensorDatabase = 'database/sensor-data.json'; // This is the path to the sensor database //TODO move to server-config
let newSensorData = {SensorID: {}};  // Make the SensorID object where each sensor has there own object, see README for structure.

const roomForAuthentication = 'unsafeClients';
let unusedPasscodes = [123456789, 123456788];
const serverPort = 3000;

const adminNamespace = io.of('/admin');
// TODO add the ability to logg other datasets

/*********************************************************************
 * MAIN PROGRAM
 *********************************************************************/

adminNamespace.use((socket, next) => {
    // ensure the user has sufficient rights
    // TODO add logic to check if the admin has the correct rights
    console.log("Admin Logged in")
    next();
});


// If there is an connection from an admin this runs
adminNamespace.on('connection', socket => {
    socket.on('getData', settings => {
        addDataToDB(sensorDatabase, newSensorData);
        console.log('Data request received from admin')
        let timeInterval = [0];   // is an array containing the start time and stop time
        let unitIDs = [0];        // is an array containing all the unitIDs to get sensor data for
        let sensorIDs = [0];      // is an array containing all the sensorIDs to get data for
        let parsedSettings = JSON.parse(settings)


        if (parsedSettings.hasOwnProperty('timeInterval')) {
            timeInterval = parsedSettings.timeInterval;
        }
        if (parsedSettings.hasOwnProperty('unitIDs')) {
            unitIDs = parsedSettings.unitIDs;
        }
        if (parsedSettings.hasOwnProperty('sensorIDs')) {
            sensorIDs = parsedSettings.sensorIDs;
        }

        let sensorData = getData(timeInterval, unitIDs, sensorIDs);
        socket.emit('dataResponse', sensorData);
    });
});


// This is what runs on all the connections that is NOT in the admin namespace
io.on('connection', socket => {
    // TODO: Make the logic for authentication of the clients i.e use passcodes

    // When a client connects to the server it gets sent to the room for unsafe clients
    let clientID = socket.id;
    let client = io.sockets.connected[clientID];
    console.log("Client connected with ID: " + clientID)
    //client.join(roomForAuthentication);
    //socket.emit('connected', true);
    //client.emit('test', 'test text');
    io.on('test', data => {
        console.log(data);

    });
    // TODO: Change the structure of the event, to make i more uniform
    socket.on('temperature', (data) => {
        // TODO: format print
        console.log("Received data from: " + clientID);
        // The data from the unit get parsed from JSON to a JS object
        let parsedData = JSON.parse(data);

        let sensorID = parsedData.sensorID;
        // the data to add is temperature and timestamp
        let dataObject = {
            value: parsedData.temperature,
            time: Date.now(),
        };
        let sensorData = {};
        sensorData[sensorID] = dataObject;

        // TODO: format the measurement in a cleaner way
        console.log(sensorData);
        // Creates the sensor name object in the new sensor array if it doesn't exist, and adds the new measurement
        newSensorData.SensorID[sensorID] = newSensorData.SensorID[sensorID] || [];
        newSensorData.SensorID[sensorID].push(dataObject);

        //TODO 2: Make function for sending of the data to the database
        //console.log(parsedData.temperature);
    });
});

// Write new sensor data to the database every 60 seconds
let var1 = setInterval(addSensorsToDB, 60000);
// Start the server on port specified in the server-config
// TODO: Add port to server-config
server.listen(3000);


/*********************************************************************
 * PROGRAM FUNCTIONS
 *********************************************************************/

/**
 * Function to add sensor data to the database
 */
function addSensorsToDB() {
    addDataToDB(sensorDatabase, newSensorData, (numberOfRecords) => {
        // Get how many measurements that was added to the database

        Object.keys(numberOfRecords).map((sensor, index) => {
            // Cycle thru every sensor with measurements that was added
            let numberToDelete = numberOfRecords[sensor];
            // Delete the same number of records that was added to the database (deletes from first)
            newSensorData.SensorID[sensor].splice(0, numberToDelete)
        });
    });
}


/**
 * Prints all the connected sockets in the room
 * @param roomName
 */
function printRoomClients(roomName) {
    let clients = io.in(roomName).connected;
    for (const socket in clients) {
        console.log(socket);
    }
}


/**
 * Function to get data from the database, and returns the data as a JSON file
 * The data that is returned is controlled by the parameters. If there are any missing parameters
 * or is invalid (i.e. the stop time is before start time) the default values are used.
 * @param timeInterval  array containing the start time and the stop time
 * @param unitIDs       array containing the unitIDs
 * @param sensorIDs     array containing the sensorIDs
 * @returns {string}    the encoded JSON string
 */
function getData(timeInterval, unitIDs, sensorIDs) {
    //TODO: set default parameters
    //TODO: add logic to get data form database
    //TODO 3: Get stored data from JSON file and return the correct data
    // Error if there are no sensor data
    let lastSensorReading = Object.keys(newSensorData.SensorID['#####2']).length - 1;
    let lastSensorValue = newSensorData.SensorID['#####2'];
    let test = {
        SensorID:
            {
                '#####2': [
                    lastSensorValue[lastSensorReading]
                ]
            }

    };

    let encodedData = JSON.stringify(test);
    return encodedData
}


/**
 * Function that retrieves a JSON database from a file path.
 * This is an asynchronous function, and executes the callback after loading and parsing the database.
 * @param pathToDb
 * @param callback
 * @param error Runs if there is an error on reading the database
 */
function getDatabase(pathToDb, callback, error) {
    // Read the database and parse it from JSON format to JS object.
    fs.readFile(pathToDb, (err, dataBuffer) => {
        if (err) throw err;
        try {
            const database = JSON.parse(dataBuffer);

            console.log(database);
            if (callback) callback(database);
        } catch (SyntaxError) {
            //Run error code if there is a SyntaxError in the DB. E.g. DB is not in JSON format
            console.error('Error loading database. No changes has been made to the file.');
            if (error) error();
        } finally {

        }
    });
}


/**
 * Function that first reads the database stored on the supplied path and add the data supplied to the database.
 * The function assumes there is only one type of data that is going to be added to the database.
 * You need to delete the data after it is added to the database, the callback function can be used for this.
 * @param databasePath
 * @param newData  - Object contains all the sensor data the first object is the same as the parent object in the database.
 * @param callback  - The callback function supplies the number of records that is deleted
 */
function addDataToDB(databasePath, newData, callback) {
    // Assumes there is only one type of data,
    // Variable to store the sensor name and how many records to delete after import to the database
    let deletedRecords = {};

    // First object is always the dataID, e.g. SensorID
    let dataName = Object.keys(newData)[0];

    // Read the newest version of the database.
    getDatabase(databasePath, (database) => {
        // Merge the new data one sensor at the time
        Object.keys(newData[dataName]).map((sensor, index) => {
            deletedRecords[sensor] = 0;

            //Create the data type in the database if it is not there
            database[dataName] = database[dataName] || {};
            console.log('Adding data form sensor: ' + sensor);

            // Create the sensor name in the database if it is not there
            database[dataName][sensor] = database[dataName][sensor] || [];

            // Add every measurement to the database
            newData[dataName][sensor].forEach((measurement) => {
                database[dataName][sensor].push(measurement);

                // Count how many records that is added
                deletedRecords[sensor]++;
            });
        });

        //Convert the new database to JSON
        const jsonDatabase = JSON.stringify(database, null, 2);
        // Write the new database to the path
        fs.writeFile(databasePath, jsonDatabase, (err) => {
            if (err) throw err;
            console.log('Data written to file');
        });

        // Callback after the database has been updated, if it is in use
        if (callback) callback(deletedRecords);
    });
}
