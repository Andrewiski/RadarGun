var express = require('express');
var router = express.Router();
var path = require('path');

/* GET home page. */
router.get('/', function (req, res) {
    req.sendfile(path.join(__dirname, 'public/index.htm'));
});



module.exports = router;