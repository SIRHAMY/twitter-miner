import environment as env 
import json
import time
import timeit
import tweetpony

class FeedScraper():

	def __init__(self):
		self.twitAPI = tweetpony.API(consumer_key = env.TWITTER_CONSUMER_KEY,
								consumer_secret = env.TWITTER_CONSUMER_SECRET,
								access_token = env.TWITTER_ACCESS_TOKEN_KEY, 
								access_token_secret = env.TWITTER_ACCESS_TOKEN_SECRET)

		user = self.twitAPI.user
		print ("Hello " + user.screen_name)

	#Perform ze mining
	def mine(self):

		try:
			print("Searching for raw followers...")
			followers = 

		if( ( self.mongoUserIDs.count() == 0 ) ):
			print("ABORTED OPERATION: Couldn't locate UserID list")
			print("--Suggested actions: Ensure mongodb " + env.TWITTER_HANDLE + ".followers exists")
			print("--Suggested actions: Ensure mongodb TWITTER_HANDLE.followers is populated")
			return
		else:
			print "Found deposit of user IDs..."

			#Have followers list, need to check if we have started already
			lastMiningIndex = -1
			lastTwitterID = -1
			if( self.mongoUserFeeds.count() > 0 ):
				print("Existing mining operation found")

				#Attempt to figure out where mining stopped
				print("Attempting to retrace steps...")
				try:
					cursor = self.mongoUserFeeds.find().sort( [ ["_id", -1] ] ).limit(1)
					lastMiningIndex = cursor[0]['userPageID']
					lastTwitterID = cursor[0]['twitterID']
				except Exception as e:
					print("Error retracing steps")
					print str(e)
					return

			else:
				print("No existing mining data found")
				print("Initializing new expedition...")

			self.mineProcess(lastMiningIndex, lastTwitterID)

	def mineProcess(self, lastMiningIndex=-1, lastTwitterID=-1):
		print("Feeding earth benders...")

		try:
			mineCursor = None

			if(lastMiningIndex == -1):
				mineCursor = self.mongoUserIDs.find().sort( [ ["_id", 1] ] )
			else:
				mineCursor = self.mongoUserIDs.find( {'_id': {'$gte': lastMiningIndex } }).sort( [ ["_id", 1] ] )

			newProcess = (lastTwitterID == -1)

			#HAMYChange
			print("MineProcess cursor length: ")
			print mineCursor.count()
			print mineCursor[0]['_id']
			print lastMiningIndex

			for idStash in mineCursor:
				print "Iterate cursor"

				twitterIDs = idStash['followers']
				for twitterID in twitterIDs:
					print("Looking for twitterID")

					if(not newProcess):
						print(int(twitterID))
						#print( int(lastTwitterID) )
						if( int(twitterID) == int(lastTwitterID) ): 
							print("Found last Twitter ID")
							newProcess = True
					else:
						self.fetchFeed(int(twitterID), idStash['_id'])

			print("Reached end of mining cursor")

		except Exception as err:
			print "ERROR: Issue in mine process"
			print str(err)



	def fetchFeed(self, twitterID, userPageID):
		print("Fetching feed...")

		try:
			userFeed = self.twitAPI.user_timeline(user_id=str(int(twitterID)), exclude_replies="true", include_rts="false" )

			self.insertFeed(twitterID, userFeed, userPageID)
		except Exception as err:
			if('88' in str(err)):
				print("Mining Suspended: Reached Twitter rate limit")
				print("Waiting 3 minutes then retrying...")
				time.sleep(180)
				self.fetchFeed( twitterID, userPageID)
			else:
				print("ERROR: Something broke when fetching the feed")
				print str(err)
		else:
			print("Fetch sucessful.")

	def insertFeed(self, twitterID, userFeed, userPageID):
		print("Inserting feed...")

		try:
			if(userFeed[1] is not None):
				self.mongoUserFeeds.insert_one(
					{
						"twitterID": twitterID,
						"userPageID": userPageID,
						"userInfo": userFeed[0],
						"feed": userFeed[1:]
					})

			#HAMYChange
			#print("userID: " + str(userFeed[0]['id']) )
			#print("userPageID: " + str(userPageID) )
		except Exception as err:
			print "ERROR: Problem with insertion"
			error = str(err)
			if("list index out of range" in error):
				print("User had no tweets fitting the search criteria")
		else:
			print("Successfully inserted: " + str(userFeed[0]['id']) )




#Run the class holmes				

if __name__ == '__main__':
	scraper = FeedScraper()
	scraper.mine()


	