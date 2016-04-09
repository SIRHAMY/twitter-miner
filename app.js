//This is the App's entry
var Twitter = require('twitter');
var MongoClient = require('mongodb').MongoClient;
var assert = require('assert');
require('./environment.js');

console.log("I'm ALIVE");
console.log(process.env.TESTING);

var client = new Twitter({
  consumer_key: process.env.TWITTER_CONSUMER_KEY,
  consumer_secret: process.env.TWITTER_CONSUMER_SECRET,
  access_token_key: process.env.TWITTER_ACCESS_TOKEN_KEY,
  access_token_secret: process.env.TWITTER_ACCESS_TOKEN_SECRET,
});

var url = 'mongodb://localhost:27017/' + process.env.TWITTER_HANDLE;

MongoClient.connect(url, function(err, db) {
	assert.equal(null, err);
	console.log("Connected to server successfully");
	insertTwitterFollowers(db, function() {
		db.close();
	});
});

var insertTwitterFollowers = function(db, callback) {
  // Get the documents collection 
  var collection = db.collection('documents');
  // Insert some documents 
  collection.insert([
    {prevCursor: 1, nextCursor: 1, followers: 'ayo'}
  ], function(err, result) {
    if(err) console.log("Issue");
    console.log(result);
    console.log("Test insert");
    callback(result);
  });
}

/*
client.get('followers/list', function(error, tweets, response){
  if(error) console.log(error);
  console.log(tweets);  // The favorites. 
  console.log(response);  // Raw response object. 
});
*/

/*
client.get('followers/ids', {screen_name: process.env.TWITTER_HANDLE}, function(error, tweets, response){
  if(error) console.log(error);
  console.log(tweets);  // The favorites. 
  console.log(response);  // Raw response object. 
});
*/