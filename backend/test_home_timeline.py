import os
import tweepy
from dotenv import load_dotenv
import json

# Load environment variables
load_dotenv()

# Get Twitter credentials
twitter_api_key = os.environ.get('X_CONSUMER_KEY')
twitter_api_secret = os.environ.get('X_CONSUMER_SECRET')
twitter_access_token = os.environ.get('X_ACCESS_TOKEN')
twitter_access_secret = os.environ.get('X_ACCESS_TOKEN_SECRET')

print(f"API Key exists: {bool(twitter_api_key)}")
print(f"API Secret exists: {bool(twitter_api_secret)}")
print(f"Access Token exists: {bool(twitter_access_token)}")
print(f"Access Secret exists: {bool(twitter_access_secret)}")

# Initialize Twitter client
client = tweepy.Client(
    consumer_key=twitter_api_key,
    consumer_secret=twitter_api_secret,
    access_token=twitter_access_token,
    access_token_secret=twitter_access_secret
)

# First, try to get the authenticated user's information
try:
    me = client.get_me()
    print(f"Authenticated as: {me.data.username}")
    print(f"User ID: {me.data.id}")
    
    # Get home timeline with the CORRECT parameter names for Tweepy
    print("\nFetching home timeline with correct parameter names...")
    timeline = client.get_home_timeline(
        max_results=5,
        tweet_fields="created_at,public_metrics,entities,referenced_tweets,attachments",
        user_fields="profile_image_url,verified",
        media_fields="url,preview_image_url,type,duration_ms,height,width,alt_text,variants",
        expansions="author_id,referenced_tweets.id,referenced_tweets.id.author_id,attachments.media_keys"
    )
    
    if timeline.data:
        print(f"Successfully retrieved {len(timeline.data)} tweets")
        
        # Print detailed information about each tweet
        for i, tweet in enumerate(timeline.data):
            print(f"\nTweet {i+1}:")
            print(f"ID: {tweet.id}")
            print(f"Text: {tweet.text[:50]}...")
            
            # Check if the ID ends with '00'
            if str(tweet.id).endswith('00'):
                print(f"NOTE: This tweet ID ends with '00'")
            
            # Check for edit history
            if hasattr(tweet, 'edit_history_tweet_ids'):
                print(f"Edit history: {tweet.edit_history_tweet_ids}")
            
            # Check for referenced tweets
            if hasattr(tweet, 'referenced_tweets') and tweet.referenced_tweets:
                print(f"Referenced tweets: {tweet.referenced_tweets}")
                
                # Try to get the referenced tweet
                for ref_tweet in tweet.referenced_tweets:
                    ref_type = ref_tweet.type
                    ref_id = ref_tweet.id
                    print(f"Referenced tweet type: {ref_type}, ID: {ref_id}")
                    
                    # Try to find this tweet in the includes
                    if timeline.includes and 'tweets' in timeline.includes:
                        for included_tweet in timeline.includes['tweets']:
                            if included_tweet.id == ref_id:
                                print(f"Found referenced tweet in includes: {included_tweet.text[:50]}...")
                                break
        
        # Try to like the first tweet
        test_tweet = timeline.data[0]
        test_id = test_tweet.id
        print(f"\nTesting with real tweet ID: {test_id}")
        
        # Try to like the tweet directly
        try:
            like_response = client.like(test_id)
            print(f"Successfully liked tweet with ID: {test_id}")
            print(f"Like response: {like_response}")
            
            # Try to unlike it to reset state
            unlike_response = client.unlike(test_id)
            print(f"Successfully unliked tweet with ID: {test_id}")
            print(f"Unlike response: {unlike_response}")
        except Exception as e:
            print(f"Error liking/unliking tweet: {str(e)}")
    else:
        print("No tweets found in timeline")
            
except Exception as e:
    print(f"Error: {str(e)}") 