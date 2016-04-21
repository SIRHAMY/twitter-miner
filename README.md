# Twitter Miner

## What it Does
Twitter Miner mines the followers and subsequent tweets of a given user. 

## Dependencies
 * [Python 2.7](http://www.liquidweb.com/kb/how-to-install-pip-on-ubuntu-14-04-lts/)
 * [TweetPony](https://github.com/Mezgrman/TweetPony)



## Usage

### Environment Variables
This project relies on environment variables to run. This is to help ensure you aren't publishing your API keys to a public repo. 

An example environment variable file, `environmentExample.py`, is included in the repo for your convenience. In order to use it, replace each string with its corresponding value. 

**Before Running:** You must create an `environment.py` file in order for the files to run. As mentioned above, you should use the same format as `environmentExample.py`.

 * **TWITTER_HANDLE** - Handle of the Twitter profile you are mining
 * **TWITTER_CONSUMER_KEY** - Get this from the Twitter app page. Credentials to allow your app to access the Twitter API.
 * **TWITTER_CONSUMER_SECRET** - Same as above. Keep this *secret*. Authenticates your app with the API.
 * **TWITTER_ACCESS_TOKEN_KEY** - Get this from your user profile. Credentials allowing you to access more functionality from the API.
 * **TWITTER_ACCESS_TOKEN_SECRET** - Same as above. Again, keep this *secret*. This authenticates your user token with the API.

### Initiate Mining
To start the mining process:

#### Mine Followers

`python followerScraper.py`

This will begin grabbing all the followers from the `TWITTER_HANDLE` provided in environment.py. 

**Note:** that on startup, it will search for a pre-existing output file (with the form below) and attempt to continue mining from the last position.

It will continue grabbing until it hits a rate limit, try again every three minutes, then continue until it gets a nextCursor == 0 - Twitter's way of saying you hit the last page.

**Output File:** `TWITTER_HANDLE`Followers.json

#### Mine Feeds

`python feedScraper.py`

This will begin grabbing all the feeds from the followers scraped in the first process. As such, followerScraper.py must have run on the same `TWITTER_HANDLE` or it won't know which feeds to pull.

**Note:** feedScraper.py will first check to see if a followers file exists in the correct format. If that succeeds, it will search for an existing feed-mining session. If it finds one, it will parse through the file in an attempt to figure out where the last one left off. If this succeeds, feedScraper.py will resume the mining operation where the last one stopped.

**Required Input Files:** `TWITTER_HANDLE`Followers.json

**Output File:** `TWITTER_HANDLE`Feeds.json