import os
import logging
import time
import json
from dotenv import load_dotenv
import requests
from requests_oauthlib import OAuth1

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

def test_reverse_chronological_timeline():
    """Test the Twitter API reverse_chronological endpoint directly"""
    try:
        # Get Twitter credentials
        twitter_api_key = os.environ.get("X_CONSUMER_KEY")
        twitter_api_secret = os.environ.get("X_CONSUMER_SECRET")
        twitter_access_token = os.environ.get("X_ACCESS_TOKEN")
        twitter_access_token_secret = os.environ.get("X_ACCESS_TOKEN_SECRET")
        
        if not all([twitter_api_key, twitter_api_secret, twitter_access_token, twitter_access_token_secret]):
            logger.error("Twitter API credentials not configured")
            return False
        
        # Initialize OAuth1 for API requests
        auth = OAuth1(
            twitter_api_key,
            twitter_api_secret,
            twitter_access_token,
            twitter_access_token_secret
        )
        
        # First, get the authenticated user's ID
        logger.info("Getting authenticated user's ID...")
        user_response = requests.get(
            "https://api.twitter.com/2/users/me",
            auth=auth
        )
        user_response.raise_for_status()
        user_data = user_response.json()
        
        if "data" not in user_data or "id" not in user_data["data"]:
            logger.error("Failed to get authenticated user ID")
            return False
        
        user_id = user_data["data"]["id"]
        logger.info(f"Authenticated as user ID: {user_id}")
        
        # Now, get the reverse chronological timeline
        logger.info("Fetching reverse chronological timeline...")
        
        # Set up parameters
        params = {
            "max_results": 10,
            "tweet.fields": "created_at,public_metrics,entities,referenced_tweets,attachments,edit_history_tweet_ids",
            "user.fields": "profile_image_url,verified",
            "media.fields": "url,preview_image_url,type,duration_ms,height,width,alt_text,variants",
            "expansions": "author_id,referenced_tweets.id,referenced_tweets.id.author_id,attachments.media_keys"
        }
        
        # Make the request
        timeline_url = f"https://api.twitter.com/2/users/{user_id}/timelines/reverse_chronological"
        logger.info(f"Making request to: {timeline_url}")
        
        timeline_response = requests.get(
            timeline_url,
            auth=auth,
            params=params
        )
        timeline_response.raise_for_status()
        
        # Process the response
        response_data = timeline_response.json()
        
        # Check if we have data
        if "data" in response_data and response_data["data"]:
            tweet_count = len(response_data["data"])
            logger.info(f"Successfully fetched {tweet_count} tweets")
            
            # Print details about the first few tweets
            for i, tweet in enumerate(response_data["data"][:3]):
                logger.info(f"\nTweet {i+1}:")
                logger.info(f"ID: {tweet.get('id')}")
                logger.info(f"Text: {tweet.get('text', '')[:50]}...")
                
                # Check for edit history
                if "edit_history_tweet_ids" in tweet:
                    logger.info(f"Edit history: {tweet['edit_history_tweet_ids']}")
                
                # Check for referenced tweets
                if "referenced_tweets" in tweet:
                    logger.info(f"Referenced tweets: {tweet['referenced_tweets']}")
        else:
            logger.warning("No tweets found in timeline")
        
        # Check rate limit headers
        headers = timeline_response.headers
        logger.info("\nRate limit information:")
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
        
        # Try to like the first tweet
        if "data" in response_data and response_data["data"]:
            first_tweet = response_data["data"][0]
            tweet_id = first_tweet.get("id")
            
            if tweet_id:
                logger.info(f"\nTrying to like tweet with ID: {tweet_id}")
                
                # Like the tweet
                like_url = f"https://api.twitter.com/2/users/{user_id}/likes"
                like_data = {"tweet_id": tweet_id}
                
                like_response = requests.post(
                    like_url,
                    auth=auth,
                    json=like_data
                )
                
                if like_response.status_code == 200:
                    logger.info(f"Successfully liked tweet with ID: {tweet_id}")
                    
                    # Unlike the tweet to reset state
                    unlike_url = f"https://api.twitter.com/2/users/{user_id}/likes/{tweet_id}"
                    unlike_response = requests.delete(
                        unlike_url,
                        auth=auth
                    )
                    
                    if unlike_response.status_code == 200:
                        logger.info(f"Successfully unliked tweet with ID: {tweet_id}")
                    else:
                        logger.error(f"Error unliking tweet: {unlike_response.status_code} - {unlike_response.text}")
                else:
                    logger.error(f"Error liking tweet: {like_response.status_code} - {like_response.text}")
                    
                    # We no longer need to check edit history as we're using the correct API endpoint
                    # that already provides the correct IDs
                    logger.info("Skipping edit history check as it's no longer needed")
        
        return True
        
    except requests.exceptions.HTTPError as e:
        logger.error(f"HTTP error: {str(e)}")
        if hasattr(e, "response") and e.response:
            logger.error(f"Response: {e.response.text}")
        return False
    except Exception as e:
        logger.error(f"Unexpected error: {str(e)}")
        return False

if __name__ == "__main__":
    success = test_reverse_chronological_timeline()
    if success:
        print("✅ Test completed successfully")
    else:
        print("❌ Test failed") 