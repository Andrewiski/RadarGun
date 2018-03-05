var express = require('express');
var router = express.Router();
var path = require('path');

/* GET home page. */
router.get('/', function (req, res) {
    req.sendfile(path.join(__dirname, 'public/index.htm'));
});

router.get('/data/team', function (req, res) {
    res.json
});

router.get('/data/player', function (req, res) {
    req.sendfile(path.join(__dirname, 'public/index.htm'));
});

module.exports = router;