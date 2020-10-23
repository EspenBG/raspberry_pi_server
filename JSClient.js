const io = require('socket.io-client')

const socket = io('http://localhost:3000', {
    reconnectionDelayMax: 10000,
    //namespace: '/admin',
});

socket.on('connect', () => {
    console.log(socket.id); // 'G5p5...'
    let myVar = setInterval(alertFunc, 3000);

    //console.log('temperature');

    });

function myFunction() {
}

function alertFunc() {
    console.log("Hello!");
    socket.emit('temperature', '{ "unitId": "001", "sensorId": "001", "temperature": 25}');

}

socket.on('connected', () => {
    socket.emit('changeDriveState', true);

});


socket.on('clientConnected', (data, tefdg) => {
    console.log(data +" " + tefdg); // 'G5p5...'
})
