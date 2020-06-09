var express = require('express');
var router = express.Router();
var ejs=require('ejs');
/* GET home page. */
router.get('/', function(req, res, next) {
  res.send("cool")
});
module.exports = router;
