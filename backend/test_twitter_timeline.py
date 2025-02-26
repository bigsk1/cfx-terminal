import os
import logging
import time
import json
from dotenv import load_dotenv
import requests
from requests_oauthlib import OAuth1
import tweepy

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

def test_twitter_timeline_api():
    """Test Twitter API timeline endpoints and check rate limits"""
    try:
        # Get Twitter credentials
        twitter_api_key = os.environ.get("X_CONSUMER_KEY")
        twitter_api_secret = os.environ.get("X_CONSUMER_SECRET")
        twitter_access_token = os.environ.get("X_ACCESS_TOKEN")
        twitter_access_token_secret = os.environ.get("X_ACCESS_TOKEN_SECRET")
        
        if not all([twitter_api_key, twitter_api_secret, twitter_access_token, twitter_access_token_secret]):
            logger.error("Twitter API credentials not configured")
            return False
        
        # Initialize Twitter client with OAuth 1.0a
        auth = tweepy.OAuth1UserHandler(
            twitter_api_key,
            twitter_api_secret,
            twitter_access_token,
            twitter_access_token_secret
        )
        twitter_client = tweepy.API(auth)
        
        # Initialize Twitter client with OAuth 2.0 for API v2
        client = tweepy.Client(
            consumer_key=twitter_api_key,
            consumer_secret=twitter_api_secret,
            access_token=twitter_access_token,
            access_token_secret=twitter_access_token_secret
        )
        
        # Get the authenticated user's ID
        me = client.get_me()
        user_id = me.data.id
        logger.info(f"Authenticated as user ID: {user_id}")
        
        # Test 1: Using tweepy's get_home_timeline method
        logger.info("\n--- TEST 1: Using tweepy's get_home_timeline method ---")
        try:
            response = client.get_home_timeline(
                max_results=10,
                tweet_fields=["created_at", "public_metrics"],
                user_fields=["username", "profile_image_url"],
                expansions=["author_id"]
            )
            
            # Check if we have data
            if response.data:
                logger.info(f"Successfully fetched {len(response.data)} tweets")
            else:
                logger.info("No tweets found in timeline")
            
            # Check rate limit info
            if hasattr(response, "_headers") and response._headers:
                headers = response._headers
                logger.info("Rate limit information:")
                logger.info(f"Limit: {headers.get('x-rate-limit-limit', 'N/A')}")
                logger.info(f"Remaining: {headers.get('x-rate-limit-remaining', 'N/A')}")
                logger.info(f"Reset: {headers.get('x-rate-limit-reset', 'N/A')}")
                
                # If reset time is available, convert to human-readable format
                if 'x-rate-limit-reset' in headers:
                    reset_time = int(headers['x-rate-limit-reset'])
                    current_time = int(time.time())
                    seconds_until_reset = reset_time - current_time
                    minutes_until_reset = max(1, int(seconds_until_reset / 60))
                    logger.info(f"Reset in approximately {minutes_until_reset} minutes")
            else:
                logger.info("No rate limit headers found")
                
        except Exception as e:
            logger.error(f"Error with tweepy get_home_timeline: {str(e)}")
        
        # Test 2: Using direct API call to reverse_chronological endpoint
        logger.info("\n--- TEST 2: Using direct API call to reverse_chronological endpoint ---")
        try:
            # Create OAuth1 session
            oauth = OAuth1(
                twitter_api_key,
                twitter_api_secret,
                twitter_access_token,
                twitter_access_token_secret
            )
            
            # Construct the URL
            url = f"https://api.twitter.com/2/users/{user_id}/timelines/reverse_chronological"
            
            # Set up parameters
            params = {
                "max_results": 10,
                "tweet.fields": "created_at,public_metrics,author_id",
                "user.fields": "username,profile_image_url",
                "expansions": "author_id"
            }
            
            # Make the request
            response = requests.get(url, auth=oauth, params=params)
            
            # Check if request was successful
            if response.status_code == 200:
                data = response.json()
                tweet_count = len(data.get("data", []))
                logger.info(f"Successfully fetched {tweet_count} tweets")
                
                # Print first tweet text if available
                if tweet_count > 0:
                    first_tweet = data["data"][0]
                    logger.info(f"First tweet: {first_tweet.get('text', '')[:50]}...")
            else:
                logger.error(f"API request failed with status code {response.status_code}")
                logger.error(f"Response: {response.text}")
            
            # Check rate limit headers
            logger.info("Rate limit information:")
            logger.info(f"Limit: {response.headers.get('x-rate-limit-limit', 'N/A')}")
            logger.info(f"Remaining: {response.headers.get('x-rate-limit-remaining', 'N/A')}")
            logger.info(f"Reset: {response.headers.get('x-rate-limit-reset', 'N/A')}")
            
            # If reset time is available, convert to human-readable format
            if 'x-rate-limit-reset' in response.headers:
                reset_time = int(response.headers['x-rate-limit-reset'])
                current_time = int(time.time())
                seconds_until_reset = reset_time - current_time
                minutes_until_reset = max(1, int(seconds_until_reset / 60))
                logger.info(f"Reset in approximately {minutes_until_reset} minutes")
                
        except Exception as e:
            logger.error(f"Error with direct API call: {str(e)}")
        
        # Test 3: Using v1.1 home_timeline endpoint
        logger.info("\n--- TEST 3: Using v1.1 home_timeline endpoint ---")
        try:
            # Make request to v1.1 endpoint
            timeline = twitter_client.home_timeline(count=10)
            logger.info(f"Successfully fetched {len(timeline)} tweets")
            
            # Check rate limit info
            rate_limit_status = twitter_client.rate_limit_status()
            if 'resources' in rate_limit_status and 'statuses' in rate_limit_status['resources']:
                home_timeline_limits = rate_limit_status['resources']['statuses'].get('/statuses/home_timeline')
                if home_timeline_limits:
                    logger.info("Rate limit information for v1.1 home_timeline:")
                    logger.info(f"Limit: {home_timeline_limits.get('limit', 'N/A')}")
                    logger.info(f"Remaining: {home_timeline_limits.get('remaining', 'N/A')}")
                    logger.info(f"Reset: {home_timeline_limits.get('reset', 'N/A')}")
                    
                    # Convert reset time to human-readable format
                    if 'reset' in home_timeline_limits:
                        reset_time = home_timeline_limits['reset']
                        current_time = int(time.time())
                        seconds_until_reset = reset_time - current_time
                        minutes_until_reset = max(1, int(seconds_until_reset / 60))
                        logger.info(f"Reset in approximately {minutes_until_reset} minutes")
            else:
                logger.info("No rate limit information found for v1.1 home_timeline")
                
        except Exception as e:
            logger.error(f"Error with v1.1 home_timeline: {str(e)}")
        
        return True
        
    except Exception as e:
        logger.error(f"Unexpected error: {str(e)}")
        return False

if __name__ == "__main__":
    print("Testing Twitter API timeline endpoints and rate limits...")
    success = test_twitter_timeline_api()
    if success:
        print("✅ Tests completed. Check the logs for details.")
    else:
        print("❌ Tests failed. Check the logs for errors.") 