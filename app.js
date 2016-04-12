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
	} else if(process.env.MINE_PROCESS.toLowerCase() == "feeds") {
		mineUserFeeds(db, function() {
			console.log("Closing db");
			db.close();
		})
	}
});

//*****Follower Mining*****

var mineTwitterFollowers = function(db, callback) {
	console.log("Mining " + process.env.TWITTER_HANDLE + "'s followers...");

	fetchTwitterFollowers(db, function(fetchResult) {
		if(fetchResult !== 'OPEND') {
			insertTwitterFollowers(db, fetchResult, function(insertResult) {
				console.log("In insertTwitterFollowers");
				console.log("Result obj: ");
				console.log(insertResult);

				//TODO: Figure out how to access ops in insertResult
				// If last page reached, stop mining
				//if( insertResult != null && insertResult.ops[0].nextCursor != null && parseInt(insertResult.nextCursor.ops[0].nextCursor) == 0 ) {
				//	console.log("OPERATION ENDED: Last page reached");
				//	callback();
				//}
				mineTwitterFollowers(db, callback);
				//HAMYChange: Add for mining loop
			});
		} else {
			callback();
		}
	});
}

var fetchTwitterFollowers = function(db, callback) {
	console.log("Fetching followers...");

	var collection = db.collection('followers');

	var cursor = collection.find().sort( {_id: -1}).limit(1);

	cursor.toArray( function(error, data) {

		if(error) console.log(error);

		var nextCursor = -1;

		if(data[0] != null) nextCursor = data[0].nextCursor;

		console.log("CurrentCursor = " + nextCursor);

		if(nextCursor==0) {
			console.log("OPERATION ENDED: Follower-mining complete in given collection");
			callback('OPEND');
		} else {

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

		}

	});

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

//*****End Follower Mining*****

//****Follower Feed Mining*****

var mineUserFeeds = function(db, callback) {
	console.log("Mining User feeds...");

	var userIDs = db.collection('followers');
	var userFeeds = db.collection('feeds');

	//var fake = db.collection('fake');

	//Check if we've started mining yet or not
	userFeeds.count(function(err, feedCount) {
		var startIndex;
		var lastTwitterID = -1;
		if(feedCount == 0) {
			startIndex = -1;
		} else {
			var lastMinedCursor = collection.find().sort( {_id: -1}).limit(1);
			startIndex = new ObjectId(lastMinedCursor.minedPageSource); // TODO: Make sure this doesn't crap out
			lastTwitterID = lastMinedCursor.twitterID;
		}

		console.log("StartIndex = " + startIndex );	

		userIDs.count(function(err, userPages) {
			if(err) console.log(err);
			console.log('Debug: db.followers.count() = ' );
			console.log(userPages);

			//If 0, doesn't exist - or no data
			if(userPages == 0) {
				console.log("OPERATION ENDED: No Follower IDs found in " + 
					process.env.TWITTER_HANDLE + ".followers");
				console.log("    Suggested Action: Ensure collection exists/is populated");
				callback();
			} else {
				console.log("Found follower IDs...");

				if(startIndex === -1) {
					console.log("Debug: startIndex - 1");

					userIDs.find().sort( {_id: -1}, function(error, userPageCursor) {
						if(error) console.log(error);

						while(userPageCursor != null) {
							userFeedMiner(db, userPageCursor, function() {
								console.log("UserFeedMiner returned - from scratch");
							});

							if(userPageCursor.hasNext()) {
								userPageCursor.next();
								continue;
							}
							else break;
						}

						callback();
					});

				} else {
					console.log("Debug: startIndex ! - 1");

					//Begin mine code
					userIDs.find({_id: {$gte: { startIndex } } }, function(error, userPageCursor) {
						if(error) console.log(error);

						console.log("Debug: userPageID: " + userPageCursor._id);
						while(userPageCursor != null) {
							userFeedMiner(db, userPageCursor, function() {
								console.log("UserFeedMiner returned");
							});

							if(userPageCursor.hasNext()) {
								userPageCursor.next();
								continue;
							}
							else break;
						}

						callback();
					});
				}
			}
		});
	});

	/* Returned 0 if nothing there, no collection
	fake.count(function(err, response) {
		if(err) console.log(err);
		console.log('Debug: Fake.count');
		console.log(response);
	});
	*/

}

var userFeedMiner = function(db, userPageCursor, callback) {
	userPageCursor.toArray(function(err, item) {
		if(item == null) callback();

		fetchUserFeed(twitterID, function(payload) {
			console.log("Fetched Twitter ID: " + twitterID);
			
			insertUserFeed(db, payload, function() {
				console.log("Inserted User Feed");
			});

		});

	});
}

var fetchUserFeed = function(twitterID, callback) {
	console.log("Fetching user feed...");
}

var insertUserFeed = function(db, toInsert, callback) {
	console.log("Inserting user feed...");
}

//*****End Feed Mining*****

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