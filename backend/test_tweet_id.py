import os
import tweepy
from dotenv import load_dotenv

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
    
    # Get home timeline
    print("\nFetching home timeline...")
    timeline = client.get_home_timeline(max_results=5)
    
    if timeline.data:
        print(f"Successfully retrieved {len(timeline.data)} tweets")
        
        # Test with a real tweet ID from the timeline
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
        
        # Now test with a tweet ID that ends with '00'
        for tweet in timeline.data:
            if str(tweet.id).endswith('00'):
                print(f"\nFound a tweet with ID ending in '00': {tweet.id}")
                
                # Try to like the tweet directly
                try:
                    like_response = client.like(tweet.id)
                    print(f"Successfully liked tweet with ID: {tweet.id}")
                    print(f"Like response: {like_response}")
                    
                    # Try to unlike it to reset state
                    unlike_response = client.unlike(tweet.id)
                    print(f"Successfully unliked tweet with ID: {tweet.id}")
                    print(f"Unlike response: {unlike_response}")
                except Exception as e:
                    print(f"Error liking/unliking tweet: {str(e)}")
                
                # Try with corrected ID
                corrected_id = str(tweet.id)[:-2] + '50'
                print(f"Testing with corrected ID: {corrected_id}")
                
                try:
                    like_response = client.like(corrected_id)
                    print(f"Successfully liked tweet with corrected ID: {corrected_id}")
                    print(f"Like response: {like_response}")
                    
                    # Try to unlike it to reset state
                    unlike_response = client.unlike(corrected_id)
                    print(f"Successfully unliked tweet with corrected ID: {corrected_id}")
                    print(f"Unlike response: {unlike_response}")
                except Exception as e:
                    print(f"Error with corrected ID: {str(e)}")
                
                break
        else:
            print("\nNo tweets with IDs ending in '00' found in timeline")
        
        # Now test the problematic ID
        print("\nTesting problematic ID...")
        original_id = '1894731861693280800'
        corrected_id = original_id[:-2] + '50'

        print(f'Original ID: {original_id}')
        print(f'Corrected ID: {corrected_id}')

        # Try to like the tweet directly with corrected ID
        try:
            like_response = client.like(corrected_id)
            print(f'Successfully liked tweet with corrected ID: {corrected_id}')
            print(f'Like response: {like_response}')
            
            # Try to unlike it to reset state
            unlike_response = client.unlike(corrected_id)
            print(f'Successfully unliked tweet with corrected ID: {corrected_id}')
        except Exception as e:
            print(f'Error with corrected ID: {str(e)}')
            
            # Try with original ID
            try:
                like_response = client.like(original_id)
                print(f'Successfully liked tweet with original ID: {original_id}')
                print(f'Like response: {like_response}')
                
                # Try to unlike it to reset state
                unlike_response = client.unlike(original_id)
                print(f'Successfully unliked tweet with original ID: {original_id}')
            except Exception as e:
                print(f'Error with original ID: {str(e)}')
    else:
        print("No tweets found in timeline")
            
except Exception as e:
    print(f"Error: {str(e)}") 