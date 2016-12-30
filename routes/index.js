var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function (req, res) {
    req.sendfile(path.join(__dirname, 'public/index.htm'));
});
router.get('/scoreboard', function (req, res) {
    req.sendfile(path.join(__dirname, 'public/index.htm'));
});

module.exports = router;