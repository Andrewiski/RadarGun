

let locationUtcTime = new Date(1651110073000);

let now = new Date();

console.log(new Date().getTimezoneOffset()/60)

// const moment = require('moment');

// let locationUtcTime = moment.unix( 1651110073);


// //let utcTime = moment.unix(( 1651110073 -25200));
// let utcTime = locationUtcTime.add(-25200,'s');

console.log(locationUtcTime.toLocaleString());

// console.log(utcTime.format());