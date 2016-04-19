import environment as env
import json
import tweetpony
import time
import timeit

class FollowerScraper():

	def __init__(self):
		self.twitAPI = tweetpony.API(consumer_key = env.TWITTER_CONSUMER_KEY,
								consumer_secret = env.TWITTER_CONSUMER_SECRET,
								access_token = env.TWITTER_ACCESS_TOKEN_KEY, 
								access_token_secret = env.TWITTER_ACCESS_TOKEN_SECRET)

		user = self.twitAPI.user
		print ("Hello " + user.screen_name)

	def mine(self):
		nextMiningIndex = -1
		try:
			print("Searching for existing mining operation...")
			with open(env.TWITTER_HANDLE + "Followers.json", 'rb') as followers:
				print("Existing mining operation found.")
				line = None
				for line in followers:
					pass
				if(line):
					nextMiningIndex = line['nextMiningIndex']
				if(nextMiningIndex == 0):
					sys.exit("Existing mining operation was already completed. Exiting...")
		except IOError as err:
			print("No pre-existing mining operation found.")
			print("Beginning new expedition...")
		except Exception as err:
			print("ERROR: Couldn't open file")
			print(str(err))

		self.beginMining(nextMiningIndex)

	def beginMining(self, nextMiningIndex):

		outfile = open(env.TWITTER_HANDLE + "Followers.json", 'wb')

		while(nextMiningIndex != 0):
			#HAMYChange
			print nextMiningIndex

			fBucket = self.fetchFollowers(nextMiningIndex)

			#Check if fBucket is None
			if(fBucket):
				nextMiningIndex = fBucket['next_cursor']

				self.storeFollowers(outfile, fBucket)

	def fetchFollowers(self, nextMiningIndex):
		try:
			followerBucket = self.twitAPI.followers_ids(screen_name=env.TWITTER_HANDLE, cursor=nextMiningIndex)
		except Exception as err:
			if('88' in str(err)):
				print("Mining Suspended: Reached Twitter rate limit")
				print("Waiting 3 minutes then retrying...")
				time.sleep(180)
				self.fetchFollowers( nextMiningIndex )
			else:
				print("ERROR: Something broke when fetching followers")
				print str(err)
		else: 
			return followerBucket

	def storeFollowers(self, outfile, toStore):
		print("Iamablock")

		try:
			toWrite = {"nextCursor": toStore['next_cursor_str'], "twitterIDs": toStore['ids']}
			jsonOut = json.dumps(toWrite, separators=(',',':'))
			outfile.write(jsonOut + '\n')
		except Exception as err:
			print("ERROR: Couldn't write results")
		else:
			print("Stored followers successfully")


	def finishMining(self, outfile):
		outfile.close()


if __name__ == "__main__":

	timeStart = timeit.default_timer()
	print("Operation started at: " + repr(timeStart))

	scraper = FollowerScraper()
	scraper.mine()

	writer = open(env.TWITTER_HANDLE + "Followers.json", 'wb')

	print("Operation finished")

	timeEnd = timeit.default_timer()
	print("Elapsed Time: " + repr(timeEnd - timeStart) + "s")