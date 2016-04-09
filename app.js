//This is the App's entry
var Twitter = require('twitter');
var MongoClient = require('mongodb').MongoClient;
var assert = require('assert');
require('./environment.js');

console.log("I'm ALIVE");
console.log(process.env.TESTING);

var twitClient = new Twitter({
  consumer_key: process.env.TWITTER_CONSUMER_KEY,
  consumer_secret: process.env.TWITTER_CONSUMER_SECRET,
  access_token_key: process.env.TWITTER_ACCESS_TOKEN_KEY,
  access_token_secret: process.env.TWITTER_ACCESS_TOKEN_SECRET,
});

var url = 'mongodb://localhost:27017/' + process.env.TWITTER_HANDLE;

MongoClient.connect(url, function(err, db) {
	assert.equal(null, err);
	console.log("Connected to db successfully");
	
	if(process.env.MINE_PROCESS.toLowerCase() == 'followers') {
		mineTwitterFollowers(db, function() {
			console.log("Closing db");
			db.close();
		});
	}
});

var mineTwitterFollowers = function(db, callback) {
	console.log("Mining followers...");

	fetchTwitterFollowers(db, function(fetchResult) {
		insertTwitterFollowers(db, fetchResult, function(insertResult) {
			console.log("In insertTwitterFollowers");
			console.log("Result obj: ");
			console.log(insertResult);

			// If last page reached, stop mining
			if( insertResult.nextCursor != null && parseInt(insertResult.nextCursor) == 0 )
				callback();
			//else mineTwitterFollowers(db, callback);
			//HAMYChange: Add for mining loop
		});
	});
}

var fetchTwitterFollowers = function(db, callback) {
	console.log("Fetching followers...");

	var collection = db.collection('followers');

	var cursor = collection.find().sort( {_id: -1}).limit(1);
	//function(error, cursor) {

		//if(error) console.log(error);

		console.log("This is the last cursor I found");
		console.log(cursor);

		cursor.toArray( function(error, data) {

			if(error) console.log(error);

			console.log("This is the piece of data I got");
			console.log(data);

			var nextCursor = -1;

			if(data[0] != null) nextCursor = data[0].nextCursor;

			twitClient.get('followers/ids', {screen_name: process.env.TWITTER_HANDLE, cursor: nextCursor}, function(error, tweets, response){

			  if(error) {
			  	console.log("ERROR: fetchTwitterFollowers");

			  	if(error[0].code == 88) {
			  		console.log("Rate limit hit: followers/ids");
			  		console.log(error);
			  		setTimeout(function() {
			  			fetchTwitterFollowers(db, callback);
			  		}, 180000 ); //Waits 3 mins
			  		console.log("Set timeout to retry");
			  	} else {
			  		console.log(error);
			  	}
			  } else {
		  			console.log(error);
				  //console.log(tweets);  // The payload 
				  //console.log(response);  // Raw response object.
				  callback(tweets); //Move this somewhere useful 
			  }

			});

		});

	//});

}

var insertTwitterFollowers = function(db, toInsert, callback) {
	console.log("Inserting follower results...");

	// Get the documents collection 
	  var collection = db.collection('followers');
	  // Insert some documents 
	  collection.insert([
	    {
	    	prevCursor: toInsert.previous_cursor, 
	    	nextCursor: toInsert.next_cursor, 
	    	followers: toInsert.ids,
	    	myTest: 'bitchboi2'
	    }
	  ], function(err, result) {
	    if(err) {
	    	console.log("Issue");
	    	console.log(err.toString());
	    } else {
	    	//console.log(result);
	    	console.log("Insertion Successful");
	    }
	    callback(result);
	    //callback("Rezz");
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