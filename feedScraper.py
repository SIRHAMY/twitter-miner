import environment as env 
import json
import time
import timeit
import tweetpony

class JSONFetcher():
	def __init__(self, fileName):
		self.fileName = fileName + '.json'

	def fetch(self):
		print("fetching...")

		with open(self.fileName, 'rb') as f:
			for line in f:
				yield json.loads(line)

class FeedScraper():

	def __init__(self):
		self.twitAPI = tweetpony.API(consumer_key = env.TWITTER_CONSUMER_KEY,
								consumer_secret = env.TWITTER_CONSUMER_SECRET,
								access_token = env.TWITTER_ACCESS_TOKEN_KEY, 
								access_token_secret = env.TWITTER_ACCESS_TOKEN_SECRET)

		user = self.twitAPI.user
		print ("Hello " + user.screen_name)

		self.stats = {
			'tweetsProcessed': 0,
			'feedsProcessed': 0,
		}

	#Perform ze mining
	def mine(self):

		#Ensure followers file exists
		try:
			print("Searching for raw followers...")
			self.followers = JSONFetcher(env.TWITTER_HANDLE + "Followers")
			print("Raw followers found.")
		except IOError as err:
			print("No raw followers found...")
			print("Disbanding expedition.")
			sys.exit("No follower file found for " + env.TWITTER_HANDLE)
		except Exception as err:
			print("ERROR: Couldn't open file")
			print(str(err))

		lastMiningIndex = -1
		lastTwitterID = -1

		try:
			print("Searching for existing feed expedition...")
			
			testFile = open(env.TWITTER_HANDLE + "Feeds.json", "rb")
			print("Expedition found.")
			testFile.close()

			self.feeds = JSONFetcher(env.TWITTER_HANDLE + "Feeds")
		except IOError as err:
			print("No expedition found...")
			print("Starting new expedition.")
		except Exception as err:
			print("ERROR: Problem finding existing feed mining expedition")
			print(str(err))
		else:
			line = None
			for line in self.feeds.fetch():
				pass
			if(line):
				lastMiningIndex = line['nextCursor']
				lastTwitterID = line['twitterID']

		self.mineProcess(lastMiningIndex, lastTwitterID)

	def mineProcess(self, lastMiningIndex=-1, lastTwitterID=-1):
		print("Prepping earth benders...")

		existingOperation = False 
		if(lastMiningIndex != -1):
			existingOperation = True 

		try:
			#TODO: Does this need to change?
			self.writeFeeds = open(env.TWITTER_HANDLE + "Feeds.json", 'ab')

			for record in self.followers.fetch():
				if(existingOperation and record['nextCursor'] != lastMiningIndex):
					pass
				else:
					for follower in record['twitterIDs']:
						if(existingOperation):
							if(follower != lastTwitterID):
								pass
							else:
								print("Found previous mining endpoint.")
								existingOperation = False
						else:
							newFeed = self.mineFeed(follower, record['nextCursor'])
							self.stats['feedsProcessed'] += 1
							if(self.stats['feedsProcessed'] % 1000 == 0):
								print("Feeds processed: " + str(self.stats['feedsProcessed']))
		except Exception as err:
			print("ERROR: Mining disaster")
			print(str(err))
		else:
			print("OPERATION ENDED: Mining complete")
			self.writeFeeds.close()

	def mineFeed(self, twitterID, srcPageID):
		print("Fetching feed...")

		try:
			userFeed = self.twitAPI.user_timeline(user_id=str(int(twitterID)), exclude_replies="true", include_rts="false" )
			self.storeFeed(twitterID, userFeed, srcPageID)
		except Exception as err:
			if('88' in str(err)):
				print("Mining Suspended: Reached Twitter rate limit")
				print("Waiting 3 minutes then retrying...")
				time.sleep(180)
				self.fetchFeed( twitterID, srcPageID)
			else:
				print("ERROR: Something broke when fetching the feed")
				print str(err)
		else:
			print("Fetch sucessful.")

	def storeFeed(self, twitterID, userFeed, srcPageID):
		print("Inserting feed...")
		print(userFeed)

		try:
			if(userFeed[0] is not None):
				tweetList = []
				for tweet in userFeed:
					tweetList.append(tweet['text'])
					self.stats['tweetsProcessed'] += 1

				toWrite = {"twitterID": twitterID, "nextCursor": srcPageID, 
							"feed": tweetList}
				jsonOut = json.dumps(toWrite, separators=(',',':'))

				self.writeFeeds.write(jsonOut + '\n')

			#HAMYChange
			#print("userID: " + str(userFeed[0]['id']) )
			#print("userPageID: " + str(userPageID) )
		except Exception as err:
			print "ERROR: Problem with insertion"
			print str(err)
			error = str(err)
			if("list index out of range" in error):
				print("User had no tweets fitting the search criteria")
		else:
			print("Successfully inserted: " + str(userFeed[0]['id']) )

	def printStats(self):
		print( "Tweets processed: " + str(self.stats['tweetsProcessed']) )
		print( "Feeds Processed: " + str(self.stats['feedsProcessed']) )




#Run the class holmes				
if __name__ == '__main__':

	timeStart = timeit.default_timer()
	print("Operation started at: " + repr(timeStart))

	scraper = FeedScraper()
	scraper.mine()

	timeEnd = timeit.default_timer()
	print("Elapsed Time: " + repr(timeEnd - timeStart) + "s")

	scraper.printStats()


	