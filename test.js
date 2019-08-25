const mongo = require('./dist/mongo');

async function run() {
    await mongo.initialize();
    console.log('initialized');
}

run();