
/*
 * GET home page.
 */

exports.index = function(req, res){
    res.sendFile(path.join(__dirname, 'public/index.html'));
};