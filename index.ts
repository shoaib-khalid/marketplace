const express = require('express');
const app = express();
const path = require('path');
const PORT = 3000;
const isbot = require('isbot');


let isBot = false;

const human = express.static(__dirname + '/public');
const bot = (req, res, next) => {
    next();
};


app.use((req, res, next) => {
    if (isbot(req.header('User-Agent'))) {
        console.log('isBot yes');
        isBot = true;
        bot(req, res, next);
    } else {
        console.log('isBot no');
        isBot = false;
        human(req, res, next);
    }
});

app.get('*', (req, res) => {
    const hostUrl = req.protocol + '://' + req.get('Host');
    // check whether User-Agent is bot
    if (isBot) {
        res.send('HAHAHA BOT');
    } else {
        res.sendFile(path.resolve(__dirname + '/dist/fuse', 'index.html'));
    }
});

app.listen(PORT, () => console.log(`Server listening on port: ${PORT}`));