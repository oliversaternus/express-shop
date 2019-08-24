const hashJS = require('hash.js');
const data = 'dubadubadu';
console.log(hashJS.sha256().update(data).digest('hex'));