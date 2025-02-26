import os
import logging
from dotenv import load_dotenv
import tweepy

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

def test_twitter_credentials():
    """Test Twitter API credentials"""
    try:
        # Get Twitter credentials
        twitter_api_key = os.environ.get("X_CONSUMER_KEY")
        twitter_api_secret = os.environ.get("X_CONSUMER_SECRET")
        twitter_access_token = os.environ.get("X_ACCESS_TOKEN")
        twitter_access_secret = os.environ.get("X_ACCESS_TOKEN_SECRET")
        
        # Log the credentials (masked for security)
        logger.info(f"API Key: {twitter_api_key[:4]}...{twitter_api_key[-4:] if twitter_api_key else None}")
        logger.info(f"API Secret: {twitter_api_secret[:4]}...{twitter_api_secret[-4:] if twitter_api_secret else None}")
        logger.info(f"Access Token: {twitter_access_token[:4]}...{twitter_access_token[-4:] if twitter_access_token else None}")
        logger.info(f"Access Secret: {twitter_access_secret[:4]}...{twitter_access_secret[-4:] if twitter_access_secret else None}")
        
        if not all([twitter_api_key, twitter_api_secret, twitter_access_token, twitter_access_secret]):
            logger.error("Twitter API credentials not configured")
            return False
        
        # Initialize Twitter client with OAuth 1.0a for API v1.1
        auth = tweepy.OAuth1UserHandler(
            twitter_api_key,
            twitter_api_secret,
            twitter_access_token,
            twitter_access_secret
        )
        twitter_client = tweepy.API(auth)
        
        # Test the credentials by getting the user's profile
        user = twitter_client.verify_credentials()
        logger.info(f"Successfully authenticated as: @{user.screen_name}")
        
        # Initialize Twitter client with OAuth 2.0 for API v2
        client = tweepy.Client(
            consumer_key=twitter_api_key,
            consumer_secret=twitter_api_secret,
            access_token=twitter_access_token,
            access_token_secret=twitter_access_secret
        )
        
        # Test the v2 client
        me = client.get_me()
        logger.info(f"V2 API authenticated as: @{me.data.username}")
        
        # Try to get home timeline
        logger.info("Attempting to fetch home timeline...")
        
        # Try v1.1 API first
        try:
            timeline_v1 = twitter_client.home_timeline(count=5)
            logger.info(f"V1.1 API: Successfully fetched {len(timeline_v1)} tweets")
            for tweet in timeline_v1[:2]:  # Show first 2 tweets
                logger.info(f"- Tweet from @{tweet.user.screen_name}: {tweet.text[:50]}...")
        except Exception as e:
            logger.error(f"V1.1 API timeline error: {str(e)}")
        
        # Try v2 API
        try:
            timeline_v2 = client.get_home_timeline(
                max_results=5,
                tweet_fields=["created_at", "author_id"],
                user_fields=["username"],
                expansions=["author_id"]
            )
            logger.info(f"V2 API: Successfully fetched timeline")
            if timeline_v2.data:
                logger.info(f"V2 API: Found {len(timeline_v2.data)} tweets")
            else:
                logger.info("V2 API: No tweets found in timeline")
        except Exception as e:
            logger.error(f"V2 API timeline error: {str(e)}")
        
        return True
        
    except tweepy.TweepyException as e:
        logger.error(f"Twitter API authentication error: {str(e)}")
        return False
    except Exception as e:
        logger.error(f"Unexpected error: {str(e)}")
        return False

if __name__ == "__main__":
    success = test_twitter_credentials()
    if success:
        print("✅ Twitter API credentials are valid")
    else:
        print("❌ Twitter API credentials are invalid or there was an error") 