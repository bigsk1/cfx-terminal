from fastapi import FastAPI, HTTPException, Depends, UploadFile, File, Request, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel
import os
from dotenv import load_dotenv
import requests
from requests_oauthlib import OAuth1
from openai import OpenAI
from typing import List, Optional, Tuple, Dict, Any
import base64
import json
import re
import uuid
from pathlib import Path
import logging
import time
import tweepy
from datetime import datetime, timedelta

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

# Initialize FastAPI
app = FastAPI(title="CFX-Terminal API")

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Twitter API credentials
twitter_credentials = {
    "consumer_key": os.getenv("X_CONSUMER_KEY"),
    "consumer_secret": os.getenv("X_CONSUMER_SECRET"),
    "access_token": os.getenv("X_ACCESS_TOKEN"),
    "access_token_secret": os.getenv("X_ACCESS_TOKEN_SECRET")
}

# OpenAI credentials and configuration
openai_api_key = os.getenv("OPENAI_API_KEY")
if not openai_api_key:
    raise ValueError("OPENAI_API_KEY environment variable is not set")

# xAI credentials and configuration
xai_api_key = os.getenv("XAI_API_KEY")
xai_base_url = "https://api.x.ai/v1"

# Get model names from environment variables
OPENAI_TEXT_MODEL = os.getenv("OPENAI_TEXT_MODEL", "gpt-4o")
OPENAI_IMAGE_MODEL = os.getenv("OPENAI_IMAGE_MODEL", "dall-e-3")
XAI_TEXT_MODEL = os.getenv("XAI_MODEL", "grok-2-1212")

# Initialize OpenAI client
openai_client = OpenAI(api_key=openai_api_key)

# Initialize xAI client if API key is available
xai_client = None
if xai_api_key:
    xai_client = OpenAI(api_key=xai_api_key, base_url=xai_base_url)

# Cloudflare credentials
cloudflare_account_id = os.getenv("CLOUDFLARE_ACCOUNT_ID")
cloudflare_api_token = os.getenv("CLOUDFLARE_API_TOKEN")

# Create a directory for temporary images if it doesn't exist
TEMP_IMAGE_DIR = Path("temp_images")
TEMP_IMAGE_DIR.mkdir(exist_ok=True)

# Twitter API cache and rate limit tracking
twitter_cache = {
    "home_timeline": {
        "data": None,
        "last_updated": None,
        "expires_at": None
    }
}

twitter_rate_limits = {
    "home_timeline": {
        "limit": 15,  # Default limit per 15 minutes
        "remaining": 15,
        "reset_time": None,
        "last_checked": None
    }
}

# Cache expiration time (in seconds)
TIMELINE_CACHE_EXPIRY = 300  # 5 minutes cache for timeline

# Data models
class TweetRequest(BaseModel):
    prompt: str
    include_image: bool = False
    image_prompt: Optional[str] = None
    wide_image: bool = False
    userName: Optional[str] = None
    model: Optional[str] = None  # Allow specifying which model to use

class TweetResponse(BaseModel):
    text: str
    threads: List[str] = []
    image_url: Optional[str] = None

class PostTweetRequest(BaseModel):
    text: str
    threads: List[str] = []
    thread_images: List[Optional[str]] = []
    image_url: Optional[str] = None
    reply_to: Optional[str] = None

class DeleteTweetRequest(BaseModel):
    tweet_id: str

class CloudflareUploadRequest(BaseModel):
    image_url: str
    expiration: Optional[str] = "never"  # Options: "never", "24h", "30d"

class ModelInfoResponse(BaseModel):
    text_model: str
    image_model: str
    available_models: List[str]
    default_model: str
    xai_available: bool

class CloudflareImageCheckRequest(BaseModel):
    image_url: str

class ChatRequest(BaseModel):
    message: str
    userName: Optional[str] = None
    model: Optional[str] = None  # Allow specifying which model to use

class TimelineRequest(BaseModel):
    count: int = 20
    include_replies: bool = True
    include_retweets: bool = True
    cursor: Optional[str] = None

class TweetActionRequest(BaseModel):
    tweet_id: str
    action: str  # "like", "retweet", "unretweet", "unlike"

class ReplyTweetRequest(BaseModel):
    tweet_id: str
    text: str
    image_url: Optional[str] = None

class ImageGenerationRequest(BaseModel):
    prompt: str
    wide: bool = False
    model: Optional[str] = None

class ImageGenerationResponse(BaseModel):
    url: str
    model: str

# Helper function to get the appropriate client and model based on the request
def get_client_and_model(model_name: Optional[str] = None):
    """
    Returns the appropriate client and model based on the requested model name.
    If no model is specified or the specified model is not available, falls back to default.
    """
    # If a model is specified and it's a Grok model, use xAI client
    if model_name and model_name.startswith('grok') and xai_client:
        return xai_client, model_name
    # If a model is specified and it's not a Grok model, use OpenAI client
    elif model_name:
        return openai_client, model_name
    # If no model is specified, use the default model
    else:
        return openai_client, OPENAI_TEXT_MODEL

# Routes
@app.get("/api/model-info", response_model=ModelInfoResponse)
async def get_model_info():
    """Get information about the currently configured AI models"""
    try:
        # Log the environment variables being used
        logger.info(f"Using text model from env: {OPENAI_TEXT_MODEL}")
        logger.info(f"Using image model from env: {OPENAI_IMAGE_MODEL}")
        if xai_client:
            logger.info(f"Using xAI model from env: {XAI_TEXT_MODEL}")
        
        # Start with OpenAI models
        available_models = [OPENAI_TEXT_MODEL]
        
        # Add other common OpenAI models if different from the default
        common_openai_models = ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "gpt-3.5-turbo"]
        for model in common_openai_models:
            if model != OPENAI_TEXT_MODEL and model not in available_models:
                available_models.append(model)
        
        # Add xAI model if available
        xai_available = xai_client is not None
        if xai_available:
            available_models.append(XAI_TEXT_MODEL)
        
        # Check if OpenAI client is properly initialized
        if not openai_client:
            logger.error("OpenAI client is not properly initialized")
            raise ValueError("OpenAI client is not properly initialized")
        
        response = ModelInfoResponse(
            text_model=OPENAI_TEXT_MODEL,
            image_model=OPENAI_IMAGE_MODEL,
            available_models=available_models,
            default_model=OPENAI_TEXT_MODEL,
            xai_available=xai_available
        )
        
        logger.info(f"Model info response: {response}")
        return response
        
    except Exception as e:
        logger.error(f"Error getting model info: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Error getting model info: {str(e)}"
        )

@app.post("/api/craft-tweet", response_model=TweetResponse)
async def craft_tweet(request: TweetRequest):
    """Craft a tweet using AI"""
    try:
        # Determine which model to use for text generation
        model = request.model if request.model else OPENAI_TEXT_MODEL
        
        # Create a system message that personalizes the tweet crafting
        system_message = f"You are a helpful AI assistant that crafts engaging tweets. IMPORTANT:Don't use hashtags or sound like an AI. Do not wrap youtube urls in a link tag like this [Link](...) but instead just provide the youtube url."
        if request.userName:
            system_message += f"You are helping {request.userName} create a tweet. "
        
        # Add image generation instructions if needed
        if request.include_image and request.image_prompt:
            system_message += "The user wants to include an image with their tweet. "
            system_message += "Craft a tweet that would pair well with an image described as: " + request.image_prompt
        
        # Create the user message with the prompt
        user_message = f"Craft a tweet about: {request.prompt}"
        if request.prompt:
            user_message += f"\nPrompt: {request.prompt}"
        
        # Determine which client to use based on the model
        if model.startswith("grok") and xai_client:
            # Use xAI client
            response = xai_client.chat.completions.create(
                model=model,
                messages=[
                    {"role": "system", "content": system_message},
                    {"role": "user", "content": user_message}
                ],
                max_tokens=1000
            )
            text = response.choices[0].message.content
        else:
            # Use OpenAI client
            response = openai_client.chat.completions.create(
                model=model,
                messages=[
                    {"role": "system", "content": system_message},
                    {"role": "user", "content": user_message}
                ],
                max_tokens=1000
            )
            text = response.choices[0].message.content
        
        # Process the response to extract tweet and threads
        text, threads = parse_tweet_thread(text)
        
        # Generate image if requested
        if request.include_image and request.image_prompt:
            # Always use DALL-E for image generation
            image_response = await generate_image(
                ImageGenerationRequest(
                    prompt=request.image_prompt,
                    wide=request.wide_image
                )
            )
            
            # Return both the tweet text and image URL
            return TweetResponse(
                text=text,
                threads=threads,
                image_url=image_response.url
            )
        else:
            # Return just the tweet text
            return TweetResponse(
                text=text,
                threads=threads
            )
    except Exception as e:
        logger.error(f"Error crafting tweet: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to craft tweet: {str(e)}")

@app.post("/api/chat")
async def chat(request: ChatRequest):
    try:
        # Get the appropriate client and model
        client, model = get_client_and_model(request.model)
        
        # Prepare system prompt with personalization if username is provided
        system_prompt = "You are a helpful assistant specializing in social media management and content creation."
        
        if request.userName:
            system_prompt += f" You are currently assisting {request.userName}."
        
        # Call AI API
        response = client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": request.message}
            ],
            temperature=0.7,
        )
        
        # Extract response
        ai_response = response.choices[0].message.content
        
        return {
            "response": ai_response
        }
    except Exception as e:
        print(f"Error in chat: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get chat response: {str(e)}")

@app.post("/api/upload-to-cloudflare")
async def upload_to_cloudflare(request: CloudflareUploadRequest):
    """Upload an image to Cloudflare Images"""
    try:
        if not cloudflare_account_id or not cloudflare_api_token:
            raise HTTPException(status_code=400, detail="Cloudflare credentials not configured")
            
        # Download the image from the URL
        image_response = requests.get(request.image_url)
        image_response.raise_for_status()
        image_data = image_response.content
        
        # Upload to Cloudflare Images
        headers = {
            "Authorization": f"Bearer {cloudflare_api_token}"
        }
        
        # Create form data with the image
        files = {
            'file': ('image.jpg', image_data, 'image/jpeg')
        }
        
        # Add metadata for expiration if needed
        metadata = {}
        if request.expiration != "never":
            metadata["expiry"] = request.expiration
        
        # Make the upload request
        upload_url = f"https://api.cloudflare.com/client/v4/accounts/{cloudflare_account_id}/images/v1"
        
        # Add metadata if present
        data = None
        if metadata:
            data = {"metadata": json.dumps(metadata)}
            
        response = requests.post(upload_url, headers=headers, files=files, data=data)
        response.raise_for_status()
        
        # Extract the image URL from the response
        result = response.json()
        if not result.get('success'):
            raise Exception(f"Cloudflare upload failed: {result.get('errors')}")
            
        image_id = result['result']['id']
        cloudflare_url = result['result']['variants'][0]
        
        return {"cloudflare_url": cloudflare_url, "image_id": image_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error uploading to Cloudflare: {str(e)}")

@app.get("/api/cloudflare-images")
async def get_cloudflare_images(limit: int = 40, page: int = 1):
    """Get images from Cloudflare Images with pagination"""
    try:
        if not cloudflare_account_id or not cloudflare_api_token:
            raise HTTPException(status_code=400, detail="Cloudflare credentials not configured")
            
        # Make the request to get images
        headers = {
            "Authorization": f"Bearer {cloudflare_api_token}"
        }
        
        url = f"https://api.cloudflare.com/client/v4/accounts/{cloudflare_account_id}/images/v1"
        response = requests.get(url, headers=headers)
        response.raise_for_status()
        
        # Extract the images from the response
        result = response.json()
        if not result.get('success'):
            raise Exception(f"Cloudflare get images failed: {result.get('errors')}")
            
        images = result['result']['images']
        
        # Sort images by upload date (newest first)
        images.sort(key=lambda x: x.get('uploaded', ''), reverse=True)
        
        # Calculate pagination
        total_images = len(images)
        start_idx = (page - 1) * limit
        end_idx = min(start_idx + limit, total_images)
        
        # Get the paginated subset of images
        paginated_images = images[start_idx:end_idx]
        
        # Format the response
        formatted_images = []
        for image in paginated_images:
            # Get the delivery URL from the variants array if available, otherwise construct it
            image_url = image.get('variants', [])[0] if image.get('variants') else f"https://imagedelivery.net/{image['id']}/public"
            
            formatted_images.append({
                "id": image['id'],
                "url": image_url,
                "uploaded": image['uploaded'],
                "metadata": image.get('meta', {})
            })
        
        return {
            "images": formatted_images,
            "pagination": {
                "total": total_images,
                "page": page,
                "limit": limit,
                "has_more": end_idx < total_images
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting Cloudflare images: {str(e)}")

@app.post("/api/post-tweet")
async def post_tweet(request: PostTweetRequest):
    """Post tweet to Twitter"""
    try:
        if not all([twitter_credentials["consumer_key"], 
                   twitter_credentials["consumer_secret"],
                   twitter_credentials["access_token"],
                   twitter_credentials["access_token_secret"]]):
            raise HTTPException(status_code=400, detail="Twitter API credentials not configured")
            
        # Initialize Twitter client for Tweepy API v1.1 (for media upload)
        auth = tweepy.OAuth1UserHandler(
            twitter_credentials["consumer_key"],
            twitter_credentials["consumer_secret"],
            twitter_credentials["access_token"],
            twitter_credentials["access_token_secret"]
        )
        twitter_client = tweepy.API(auth)
        
        # Initialize Twitter client with OAuth 2.0 for API v2 (for posting tweets)
        client = tweepy.Client(
            consumer_key=twitter_credentials["consumer_key"],
            consumer_secret=twitter_credentials["consumer_secret"],
            access_token=twitter_credentials["access_token"],
            access_token_secret=twitter_credentials["access_token_secret"]
        )
        
        # Handle media upload if provided
        media_id = None
        if request.image_url:
            try:
                # Download the image
                image_response = requests.get(request.image_url)
                image_response.raise_for_status()
                image_data = image_response.content
                
                # Save the image temporarily
                temp_image_path = f"temp_images/tweet_{uuid.uuid4()}.jpg"
                os.makedirs("temp_images", exist_ok=True)  # Ensure directory exists
                with open(temp_image_path, "wb") as f:
                    f.write(image_data)
                
                # Upload media to Twitter using Tweepy's API v1.1
                media_upload = twitter_client.media_upload(filename=temp_image_path)
                media_id = media_upload.media_id_string
                
                # Clean up the temporary file
                os.remove(temp_image_path)
                
                logger.info(f"Successfully uploaded media with ID: {media_id}")
                
            except Exception as e:
                logger.error(f"Error uploading media: {str(e)}")
                raise HTTPException(status_code=500, detail=f"Error uploading image: {str(e)}")
        
        # Post the main tweet
        tweet_ids = []
        previous_id = request.reply_to
        
        # Post the tweet using Tweepy's v2 API
        try:
            if media_id:
                response = client.create_tweet(
                    text=request.text,
                    media_ids=[media_id],
                    in_reply_to_tweet_id=previous_id
                )
            else:
                response = client.create_tweet(
                    text=request.text,
                    in_reply_to_tweet_id=previous_id
                )
            
            tweet_id = response.data["id"]
            tweet_ids.append(tweet_id)
            previous_id = tweet_id
            
        except tweepy.TweepyException as e:
            logger.error(f"Error posting tweet: {str(e)}")
            raise HTTPException(status_code=400, detail=f"Twitter API error: {str(e)}")
        
        # Post thread tweets if any
        for i, thread_text in enumerate(request.threads):
            thread_media_id = None
            if i < len(request.thread_images) and request.thread_images[i]:
                try:
                    # Download the thread image
                    thread_image_response = requests.get(request.thread_images[i])
                    thread_image_response.raise_for_status()
                    thread_image_data = thread_image_response.content
                    
                    # Save the image temporarily
                    thread_image_path = f"temp_images/thread_{uuid.uuid4()}.jpg"
                    os.makedirs("temp_images", exist_ok=True)  # Ensure directory exists
                    with open(thread_image_path, "wb") as f:
                        f.write(thread_image_data)
                    
                    # Upload media to Twitter using Tweepy's API v1.1
                    thread_media_upload = twitter_client.media_upload(filename=thread_image_path)
                    thread_media_id = thread_media_upload.media_id_string
                    
                    # Clean up the temporary file
                    os.remove(thread_image_path)
                    
                    logger.info(f"Successfully uploaded thread media with ID: {thread_media_id}")
                    
                except Exception as e:
                    logger.error(f"Error uploading thread media: {str(e)}")
                    # Continue without the image if there's an error
            
            # Post the thread tweet using Tweepy's v2 API
            try:
                if thread_media_id:
                    thread_response = client.create_tweet(
                        text=thread_text,
                        media_ids=[thread_media_id],
                        in_reply_to_tweet_id=previous_id
                    )
                else:
                    thread_response = client.create_tweet(
                        text=thread_text,
                        in_reply_to_tweet_id=previous_id
                    )
                
                thread_id = thread_response.data["id"]
                tweet_ids.append(thread_id)
                previous_id = thread_id
                
            except tweepy.TweepyException as e:
                logger.error(f"Error posting thread tweet: {str(e)}")
                # Continue with the next thread tweet if there's an error
        
        return {"success": True, "tweet_ids": tweet_ids}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error posting tweet: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error posting tweet: {str(e)}")

@app.post("/api/delete-tweet")
async def delete_tweet(request: DeleteTweetRequest):
    """Delete a tweet by ID"""
    try:
        if not all([twitter_credentials["consumer_key"], 
                   twitter_credentials["consumer_secret"],
                   twitter_credentials["access_token"],
                   twitter_credentials["access_token_secret"]]):
            raise HTTPException(status_code=400, detail="Twitter API credentials not configured")
            
        auth = OAuth1(
            twitter_credentials["consumer_key"],
            twitter_credentials["consumer_secret"],
            twitter_credentials["access_token"],
            twitter_credentials["access_token_secret"]
        )
        
        # Delete the tweet
        response = requests.delete(
            f"https://api.twitter.com/2/tweets/{request.tweet_id}",
            auth=auth
        )
        response.raise_for_status()
        
        return {"success": True, "message": f"Tweet {request.tweet_id} deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting tweet: {str(e)}")

@app.post("/api/upload-image", response_model=dict)
async def upload_image(file: UploadFile = File(...)):
    """Upload an image file for use in tweets"""
    try:
        # Read the file content
        image_data = await file.read()
        
        # Save the file temporarily (optional)
        temp_path = f"temp_{file.filename}"
        with open(temp_path, "wb") as f:
            f.write(image_data)
        
        # Return the path to the saved file
        return {
            "filename": file.filename,
            "content_type": file.content_type,
            "temp_path": temp_path
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error uploading image: {str(e)}")

@app.post("/api/check-cloudflare-image")
async def check_cloudflare_image(request: CloudflareImageCheckRequest):
    """Check if a Cloudflare image exists and is accessible"""
    try:
        # Log the URL being checked
        print(f"Checking image URL: {request.image_url}")
        
        # Try to access the image with a longer timeout and proper headers
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
            "Accept": "image/webp,image/apng,image/*,*/*;q=0.8",
            "Cache-Control": "no-cache",
            "Pragma": "no-cache"
        }
        
        # First try a HEAD request which is faster
        try:
            head_response = requests.head(
                request.image_url, 
                timeout=10,
                headers=headers,
                allow_redirects=True
            )
            
            # If HEAD request is successful, check content type
            if head_response.status_code == 200:
                content_type = head_response.headers.get('content-type', '')
                is_image = content_type.startswith('image/')
                
                if is_image:
                    return {
                        "exists": True,
                        "content_type": content_type,
                        "is_image": True,
                        "method": "HEAD"
                    }
        except Exception as head_error:
            print(f"HEAD request failed: {str(head_error)}")
            # Continue to GET request if HEAD fails
            pass
        
        # If HEAD request fails or content type is not an image, try a GET request
        # Some servers don't properly respond to HEAD requests
        try:
            get_response = requests.get(
                request.image_url, 
                timeout=10,
                headers=headers,
                allow_redirects=True,
                stream=True  # Stream to avoid downloading the entire image
            )
            
            # Check if the GET request is successful
            if get_response.status_code == 200:
                content_type = get_response.headers.get('content-type', '')
                is_image = content_type.startswith('image/')
                
                # Read a small chunk to verify it's an image
                chunk = next(get_response.iter_content(1024), None)
                
                # Close the connection to avoid downloading the entire image
                get_response.close()
                
                if chunk and is_image:
                    return {
                        "exists": True,
                        "content_type": content_type,
                        "is_image": True,
                        "method": "GET"
                    }
                else:
                    return {
                        "exists": True,
                        "content_type": content_type,
                        "is_image": False,
                        "method": "GET",
                        "reason": "Content doesn't appear to be a valid image"
                    }
            else:
                return {
                    "exists": False,
                    "status_code": get_response.status_code,
                    "method": "GET",
                    "reason": f"HTTP status {get_response.status_code}"
                }
        except Exception as get_error:
            print(f"GET request failed: {str(get_error)}")
            return {
                "exists": False,
                "error": str(get_error),
                "method": "GET"
            }
            
    except Exception as e:
        print(f"Image validation error: {str(e)}")
        return {
            "exists": False,
            "error": str(e),
            "reason": "General exception during validation"
        }

@app.post("/api/generate-image", response_model=ImageGenerationResponse)
async def generate_image(request: ImageGenerationRequest):
    """Generate an image using DALL-E"""
    try:
        # Log the request
        logger.info(f"Image generation request received: {request.prompt[:50]}...")
        
        # Set the size based on whether a wide image was requested
        size = "1792x1024" if request.wide else "1024x1024"
        
        # Generate the image with DALL-E
        logger.info(f"Generating image with DALL-E model: {OPENAI_IMAGE_MODEL}")
        response = openai_client.images.generate(
            model=OPENAI_IMAGE_MODEL,
            prompt=request.prompt,
            n=1,
            size=size
        )
        
        # Return the image URL
        image_url = response.data[0].url
        logger.info(f"Image generated successfully with URL: {image_url[:50]}...")
        
        return ImageGenerationResponse(
            url=image_url,
            model=OPENAI_IMAGE_MODEL
        )
    
    except Exception as e:
        logger.error(f"Error generating image: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to generate image: {str(e)}")

# Grok currently not in use
@app.get("/api/temp-images/{image_name}")
async def get_temp_image(image_name: str):
    """Serve temporary images generated by Grok"""
    image_path = TEMP_IMAGE_DIR / image_name
    if not image_path.exists():
        raise HTTPException(status_code=404, detail="Image not found")
    return FileResponse(str(image_path))

# Helper functions
def split_into_threads(text, limit=280):
    """Split text into tweet-sized chunks for threads"""
    words = text.split()
    chunks = []
    current_chunk = []
    current_length = 0

    for word in words:
        word_length = len(word) + (1 if current_length > 0 else 0)
        
        if current_length + word_length <= limit:
            if current_length > 0:
                current_chunk.append(" ")
            current_chunk.append(word)
            current_length += word_length
        else:
            chunks.append("".join(current_chunk))
            current_chunk = [word]
            current_length = len(word)

    if current_chunk:
        chunks.append("".join(current_chunk))

    return chunks

# Improved function to parse tweet thread from AI response
def parse_tweet_thread(response: str) -> Tuple[str, List[str]]:
    # Check if the response contains numbered tweets
    numbered_pattern = re.compile(r'(?:^|\n)(\d+\/\d+|\d+\.|\(\d+\)|\d+\)|\d+\:)\s*(.*?)(?=(?:\n\d+\/\d+|\n\d+\.|\n\(\d+\)|\n\d+\)|\n\d+\:|\Z))', re.DOTALL)
    numbered_matches = numbered_pattern.findall(response)
    
    if numbered_matches and len(numbered_matches) > 1:
        # Extract the first tweet and the rest as thread
        main_tweet = numbered_matches[0][1].strip()
        threads = [match[1].strip() for match in numbered_matches[1:]]
        return main_tweet, threads
    
    # Check for "Thread:" or "Thread" marker
    thread_pattern = re.compile(r'(?:^|\n)(?:Thread:|Thread)(?:\s*\n+)(.*)', re.DOTALL)
    thread_match = thread_pattern.search(response)
    
    if thread_match:
        # Split the thread part by newlines and process
        thread_text = thread_match.group(1)
        
        # Try to find the main tweet (before Thread:)
        main_tweet_match = re.search(r'^(.*?)(?:\n+(?:Thread:|Thread))', response, re.DOTALL)
        main_tweet = main_tweet_match.group(1).strip() if main_tweet_match else ""
        
        # Split the thread into individual tweets
        # Look for tweet separators like multiple newlines, dashes, or numbered markers
        tweet_separators = re.compile(r'\n\s*\n+|\n---+\n|\n\d+\/\d+\s*\n|\n\d+\.\s*\n')
        threads = [tweet.strip() for tweet in tweet_separators.split(thread_text) if tweet.strip()]
        
        return main_tweet, threads
    
    # If no thread markers found, check if the text is too long for a single tweet
    if len(response) > 280:
        # Split by double newlines first
        paragraphs = [p.strip() for p in response.split('\n\n') if p.strip()]
        
        if paragraphs:
            # Use the first paragraph as the main tweet
            main_tweet = paragraphs[0]
            
            # If the main tweet is still too long, truncate it
            if len(main_tweet) > 280:
                main_tweet = main_tweet[:277] + "..."
            
            # Use the rest as thread tweets
            threads = paragraphs[1:] if len(paragraphs) > 1 else []
            
            # Make sure each thread tweet is under 280 characters
            formatted_threads = []
            for thread in threads:
                if len(thread) <= 280:
                    formatted_threads.append(thread)
                else:
                    # Split long threads by sentences
                    sentences = re.findall(r'[^.!?]+[.!?]+', thread)
                    current_thread = ""
                    
                    for sentence in sentences:
                        if len(current_thread) + len(sentence) <= 280:
                            current_thread += sentence
                        else:
                            if current_thread:
                                formatted_threads.append(current_thread.strip())
                            current_thread = sentence
                    
                    if current_thread:
                        formatted_threads.append(current_thread.strip())
            
            return main_tweet, formatted_threads
    
    # Default case: treat the entire response as a single tweet
    return response.strip(), []

# Helper function to upload to Cloudflare
def upload_to_cloudflare_helper(file_data, filename="image", expiration="24h"):
    """Upload a file to Cloudflare Images and return the response"""
    if not cloudflare_account_id or not cloudflare_api_token:
        raise ValueError("Cloudflare credentials not configured")
        
    # Upload to Cloudflare Images
    headers = {
        "Authorization": f"Bearer {cloudflare_api_token}"
    }
    
    # Create form data with the image
    files = {
        'file': (f'{filename}.jpg', file_data, 'image/jpeg')
    }
    
    # Add metadata for expiration if needed
    metadata = {}
    if expiration != "never":
        metadata["expiry"] = expiration
    
    # Make the upload request
    upload_url = f"https://api.cloudflare.com/client/v4/accounts/{cloudflare_account_id}/images/v1"
    
    # Add metadata if present
    data = None
    if metadata:
        data = {"metadata": json.dumps(metadata)}
        
    response = requests.post(upload_url, headers=headers, files=files, data=data)
    response.raise_for_status()
    
    # Return the response JSON
    return response.json()

@app.get("/api/twitter/home-timeline")
async def get_home_timeline(count: int = 20, cursor: str = None):
    """
    Get the home timeline for the authenticated user using the correct Twitter API v2 endpoint:
    /2/users/{id}/timelines/reverse_chronological
    """
    # Check if Twitter credentials are available
    twitter_credentials = {
        "consumer_key": os.environ.get("X_CONSUMER_KEY"),
        "consumer_secret": os.environ.get("X_CONSUMER_SECRET"),
        "access_token": os.environ.get("X_ACCESS_TOKEN"),
        "access_token_secret": os.environ.get("X_ACCESS_TOKEN_SECRET")
    }
    
    if not all([
        twitter_credentials["consumer_key"],
        twitter_credentials["consumer_secret"],
        twitter_credentials["access_token"],
        twitter_credentials["access_token_secret"]
    ]):
        logger.error("Twitter API credentials not configured")
        raise HTTPException(
            status_code=500,
            detail="Twitter API credentials not configured"
        )
    
    # Check if we're rate limited
    rate_limit_info = twitter_rate_limits["home_timeline"]
    current_time = time.time()
    
    if (rate_limit_info["remaining"] == 0 and 
        rate_limit_info["reset_time"] and 
        current_time < rate_limit_info["reset_time"]):
        
        # Calculate time until reset
        reset_time = format_time_until(rate_limit_info["reset_time"])
        logger.warning(f"Twitter API rate limit exceeded. Reset in {reset_time}")
        
        # Check if we have cached data
        cache_data = twitter_cache["home_timeline"]
        
        # If we have cached data, return it with a warning
        if cache_data["data"]:
            cached_data = cache_data["data"]
            # Add a warning to the response
            if "meta" not in cached_data:
                cached_data["meta"] = {}
            cached_data["meta"]["warning"] = f"Rate limit exceeded. Reset in {reset_time}. Showing cached data."
            cached_data["meta"]["cached"] = True
            cached_data["meta"]["cache_time"] = cache_data["last_updated"]
            
            # Add rate limit info to the response
            cached_data["meta"]["rate_limit"] = {
                "limit": rate_limit_info["limit"],
                "remaining": rate_limit_info["remaining"],
                "reset_time": rate_limit_info["reset_time"]
            }
            
            return cached_data
        
        # No cached data available
        error_message = f"Twitter API rate limit exceeded. Please try again in {reset_time}."
        raise HTTPException(status_code=429, detail=error_message)
    
    # Check if we have cached data that's still valid
    cache_data = twitter_cache["home_timeline"]
    
    if (not cursor and 
        cache_data["data"] and 
        cache_data["expires_at"] and 
        current_time < cache_data["expires_at"]):
        
        logger.info("Returning cached timeline data")
        cached_data = cache_data["data"]
        # Add cache info to the response
        if "meta" not in cached_data:
            cached_data["meta"] = {}
        cached_data["meta"]["cached"] = True
        cached_data["meta"]["cache_time"] = cache_data["last_updated"]
        
        # Add rate limit info to the response
        cached_data["meta"]["rate_limit"] = {
            "limit": rate_limit_info["limit"],
            "remaining": rate_limit_info["remaining"],
            "reset_time": rate_limit_info["reset_time"] if rate_limit_info["reset_time"] else None
        }
        
        return cached_data
    
    try:
        # Initialize OAuth1 for API requests
        auth = OAuth1(
            twitter_credentials["consumer_key"],
            twitter_credentials["consumer_secret"],
            twitter_credentials["access_token"],
            twitter_credentials["access_token_secret"]
        )
        
        # First, get the authenticated user's ID
        user_response = requests.get(
            "https://api.twitter.com/2/users/me",
            auth=auth
        )
        user_response.raise_for_status()
        user_data = user_response.json()
        
        if "data" not in user_data or "id" not in user_data["data"]:
            raise Exception("Failed to get authenticated user ID")
        
        user_id = user_data["data"]["id"]
        logger.info(f"Authenticated as user ID: {user_id}")
        
        # Prepare parameters for the request to the correct endpoint
        params = {
            "max_results": count,
            "tweet.fields": "created_at,public_metrics,entities,referenced_tweets,attachments,edit_history_tweet_ids",
            "user.fields": "profile_image_url,verified",
            "media.fields": "url,preview_image_url,type,duration_ms,height,width,alt_text,variants",
            "expansions": "author_id,referenced_tweets.id,referenced_tweets.id.author_id,attachments.media_keys"
        }
        
        if cursor:
            params["pagination_token"] = cursor
        
        # Make the request to the correct Twitter API endpoint
        timeline_url = f"https://api.twitter.com/2/users/{user_id}/timelines/reverse_chronological"
        logger.info(f"Making Twitter API request to {timeline_url} with params: {params}")
        
        timeline_response = requests.get(
            timeline_url,
            auth=auth,
            params=params
        )
        timeline_response.raise_for_status()
        
        # Process the response
        response_data = timeline_response.json()
        
        # Update cache if this is the first page (no cursor)
        if not cursor:
            twitter_cache["home_timeline"] = {
                "data": response_data,
                "last_updated": int(current_time),
                "expires_at": int(current_time) + TIMELINE_CACHE_EXPIRY
            }
        
        # Update rate limit information from headers
        headers = timeline_response.headers
        if "x-rate-limit-limit" in headers:
            twitter_rate_limits["home_timeline"]["limit"] = int(headers["x-rate-limit-limit"])
        if "x-rate-limit-remaining" in headers:
            twitter_rate_limits["home_timeline"]["remaining"] = int(headers["x-rate-limit-remaining"])
        if "x-rate-limit-reset" in headers:
            twitter_rate_limits["home_timeline"]["reset_time"] = int(headers["x-rate-limit-reset"])
        twitter_rate_limits["home_timeline"]["last_checked"] = int(current_time)
        
        logger.info(f"Updated rate limits: {twitter_rate_limits['home_timeline']}")
        
        # Add rate limit info to the response
        if "meta" not in response_data:
            response_data["meta"] = {}
        response_data["meta"]["rate_limit"] = {
            "limit": twitter_rate_limits["home_timeline"]["limit"],
            "remaining": twitter_rate_limits["home_timeline"]["remaining"],
            "reset_time": twitter_rate_limits["home_timeline"]["reset_time"]
        }
        
        return response_data
        
    except requests.exceptions.HTTPError as e:
        # Handle HTTP errors
        logger.error(f"HTTP error fetching Twitter timeline: {str(e)}")
        
        # Check if it's a rate limit error (429)
        if e.response.status_code == 429:
            # Extract rate limit headers
            headers = e.response.headers
            if "x-rate-limit-limit" in headers:
                twitter_rate_limits["home_timeline"]["limit"] = int(headers["x-rate-limit-limit"])
            if "x-rate-limit-remaining" in headers:
                twitter_rate_limits["home_timeline"]["remaining"] = 0
            if "x-rate-limit-reset" in headers:
                twitter_rate_limits["home_timeline"]["reset_time"] = int(headers["x-rate-limit-reset"])
            
            # Calculate time until reset
            reset_time = None
            if twitter_rate_limits["home_timeline"]["reset_time"]:
                reset_time = format_time_until(twitter_rate_limits["home_timeline"]["reset_time"])
            
            # If we have cached data, return it with a warning
            if twitter_cache["home_timeline"]["data"]:
                cached_data = twitter_cache["home_timeline"]["data"]
                # Add a warning to the response
                if "meta" not in cached_data:
                    cached_data["meta"] = {}
                cached_data["meta"]["warning"] = f"Rate limit exceeded. Reset in {reset_time if reset_time else 'unknown time'}. Showing cached data."
                cached_data["meta"]["cached"] = True
                cached_data["meta"]["cache_time"] = twitter_cache["home_timeline"]["last_updated"]
                
                # Add rate limit info to the response
                cached_data["meta"]["rate_limit"] = {
                    "limit": twitter_rate_limits["home_timeline"]["limit"],
                    "remaining": 0,
                    "reset_time": twitter_rate_limits["home_timeline"]["reset_time"]
                }
                
                return cached_data
            
            # No cached data available
            error_message = f"Twitter API rate limit exceeded. Please try again in {reset_time if reset_time else '15 minutes'}."
            raise HTTPException(status_code=429, detail=error_message)
        
        # Handle unauthorized access (401)
        elif e.response.status_code == 401:
            logger.error(f"Twitter API unauthorized: {str(e)}")
            raise HTTPException(status_code=401, detail="Twitter API unauthorized. Please check your credentials.")
        
        # Handle other HTTP errors
        else:
            # If we have cached data, return it with a warning
            if twitter_cache["home_timeline"]["data"]:
                cached_data = twitter_cache["home_timeline"]["data"]
                # Add a warning to the response
                if "meta" not in cached_data:
                    cached_data["meta"] = {}
                cached_data["meta"]["warning"] = f"Error fetching timeline: {str(e)}. Showing cached data."
                cached_data["meta"]["cached"] = True
                cached_data["meta"]["cache_time"] = twitter_cache["home_timeline"]["last_updated"]
                
                return cached_data
            
            raise HTTPException(status_code=e.response.status_code, detail=f"Twitter API error: {str(e)}")
        
    except Exception as e:
        # Handle other exceptions
        logger.error(f"Error fetching Twitter timeline: {str(e)}")
        
        # If we have cached data, return it with a warning
        if twitter_cache["home_timeline"]["data"]:
            cached_data = twitter_cache["home_timeline"]["data"]
            # Add a warning to the response
            if "meta" not in cached_data:
                cached_data["meta"] = {}
            cached_data["meta"]["warning"] = f"Error fetching timeline: {str(e)}. Showing cached data."
            cached_data["meta"]["cached"] = True
            cached_data["meta"]["cache_time"] = twitter_cache["home_timeline"]["last_updated"]
            
            # Add rate limit info to the response
            cached_data["meta"]["rate_limit"] = {
                "limit": twitter_rate_limits["home_timeline"]["limit"],
                "remaining": twitter_rate_limits["home_timeline"]["remaining"],
                "reset_time": twitter_rate_limits["home_timeline"]["reset_time"] if twitter_rate_limits["home_timeline"]["reset_time"] else None
            }
            
            return cached_data
            
        raise HTTPException(status_code=500, detail=f"Error fetching Twitter timeline: {str(e)}")

@app.post("/api/twitter/post-tweet")
async def post_tweet(
    request: Request,
    text: str = Form(...),
    media: UploadFile = None,
    reply_to_tweet_id: str = Form(None),
):
    """Post tweet to Twitter using v2 API"""
    try:
        # Log the request
        logger.info(f"Received post_tweet request: text={text}, media={media}, reply_to_tweet_id={reply_to_tweet_id}")
        
        # Get Twitter credentials
        twitter_api_key = os.environ.get("X_CONSUMER_KEY")
        twitter_api_secret = os.environ.get("X_CONSUMER_SECRET")
        twitter_access_token = os.environ.get("X_ACCESS_TOKEN")
        twitter_access_token_secret = os.environ.get("X_ACCESS_TOKEN_SECRET")
        
        if not all([twitter_api_key, twitter_api_secret, twitter_access_token, twitter_access_token_secret]):
            raise HTTPException(
                status_code=400,
                detail="Twitter API credentials not configured"
            )
        
        # Initialize Twitter client for Tweepy API
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
        
        # Handle media upload if provided
        media_id = None
        if media:
            try:
                # Read the file content
                file_content = await media.read()
                
                # Create a temporary file to handle the upload
                temp_file_path = f"temp_images/upload_{uuid.uuid4()}.jpg"
                os.makedirs("temp_images", exist_ok=True)  # Ensure directory exists
                
                # Save to a temporary file
                with open(temp_file_path, "wb") as f:
                    f.write(file_content)
                
                # Upload media to Twitter using Tweepy's API v1.1
                media_upload = twitter_client.media_upload(filename=temp_file_path)
                media_id = media_upload.media_id_string
                
                # Clean up the temporary file
                os.remove(temp_file_path)
                
                logger.info(f"Successfully uploaded media with ID: {media_id}")
                
            except Exception as e:
                logger.error(f"Error uploading media: {str(e)}")
                # Continue without the image if there's an error
                raise HTTPException(
                    status_code=500,
                    detail=f"Error uploading image: {str(e)}"
                )
        
        # Post the tweet using Tweepy's v2 API
        if media_id:
            response = client.create_tweet(
                text=text,
                media_ids=[media_id],
                in_reply_to_tweet_id=reply_to_tweet_id
            )
        else:
            response = client.create_tweet(
                text=text,
                in_reply_to_tweet_id=reply_to_tweet_id
            )
        
        # Return the tweet ID
        return {"tweet_id": response.data["id"]}
    
    except tweepy.TweepyException as e:
        logger.error(f"Twitter API error: {str(e)}")
        raise HTTPException(
            status_code=400,
            detail=f"Twitter API error: {str(e)}"
        )
    except Exception as e:
        logger.error(f"Error posting tweet: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Error posting tweet: {str(e)}"
        )

@app.post("/api/twitter/reply")
async def reply_to_tweet(request: Request):
    """Reply to a tweet using v2 API"""
    try:
        # Parse the request body
        body = await request.json()
        tweet_id = body.get("tweet_id")
        text = body.get("text")
        image_url = body.get("image_url")
        
        # Check required parameters
        if not tweet_id or not text:
            raise HTTPException(status_code=400, detail="tweet_id and text are required")
        
        # Log the request
        logger.info(f"Received reply request: tweet_id={tweet_id}, text={text}, image_url={image_url}")
        
        # Get Twitter credentials
        twitter_api_key = os.environ.get("X_CONSUMER_KEY")
        twitter_api_secret = os.environ.get("X_CONSUMER_SECRET")
        twitter_access_token = os.environ.get("X_ACCESS_TOKEN")
        twitter_access_token_secret = os.environ.get("X_ACCESS_TOKEN_SECRET")
        
        if not all([twitter_api_key, twitter_api_secret, twitter_access_token, twitter_access_token_secret]):
            raise HTTPException(status_code=400, detail="Twitter API credentials not configured")
        
        # Initialize Twitter client with OAuth 2.0 for API v2 (for posting tweets)
        client = tweepy.Client(
            consumer_key=twitter_api_key,
            consumer_secret=twitter_api_secret,
            access_token=twitter_access_token,
            access_token_secret=twitter_access_token_secret
        )
        
        # Get the correct tweet ID (checking edit history if needed)
        tweet_id = find_correct_tweet_id(tweet_id, client)
        
        # Handle image upload if provided
        media_id = None
        if image_url:
            try:
                # Download the image
                image_response = requests.get(image_url)
                if image_response.status_code != 200:
                    raise Exception(f"Failed to download image: {image_response.status_code}")
                
                # Save the image temporarily
                temp_image_path = f"temp_images/reply_{uuid.uuid4()}.jpg"
                os.makedirs("temp_images", exist_ok=True)  # Ensure directory exists
                with open(temp_image_path, "wb") as f:
                    f.write(image_response.content)
                
                # Upload the image using Tweepy's API v1.1
                media_upload = twitter_client.media_upload(filename=temp_image_path)
                media_id = media_upload.media_id
                
                # Clean up the temporary file
                os.remove(temp_image_path)
                
            except Exception as e:
                logger.error(f"Error uploading image: {str(e)}")
                # Continue without the image if there's an error
        
        # Reply to the tweet using Tweepy's v2 API
        if media_id:
            response = client.create_tweet(
                text=text,
                media_ids=[media_id],
                in_reply_to_tweet_id=tweet_id
            )
        else:
            response = client.create_tweet(
                text=text,
                in_reply_to_tweet_id=tweet_id
            )
        
        return {"status": "success", "message": "Reply sent successfully", "data": response.data}
        
    except tweepy.TweepyException as e:
        logger.error(f"Twitter API error: {str(e)}")
        raise HTTPException(status_code=400, detail=f"Twitter API error: {str(e)}")
        
    except Exception as e:
        logger.error(f"Error replying to tweet: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error replying to tweet: {str(e)}")

def find_correct_tweet_id(tweet_id: str, client=None) -> str:
    """
    Ensure the tweet ID is a string.
    
    Args:
        tweet_id: The tweet ID to check
        client: Optional tweepy client (kept for backward compatibility)
        
    Returns:
        The tweet ID as a string
    """
    # Ensure the tweet ID is a string
    tweet_id = str(tweet_id)
    logger.info(f"Using tweet ID: {tweet_id}")
    
    # We no longer need to check edit history as we're using the correct API endpoint
    # that already provides the correct IDs
    
    return tweet_id

@app.post("/api/twitter/tweet-action")
async def tweet_action(request: Request):
    """
    Perform an action on a tweet (like, unlike, retweet, unretweet)
    """
    try:
        # Parse the request body
        body = await request.json()
        tweet_id = body.get("tweet_id")
        action = body.get("action")
        
        logger.info(f"Tweet action request: {action} for tweet {tweet_id}")
        
        # Check for required parameters
        if not tweet_id or not action:
            raise HTTPException(status_code=400, detail="Missing required parameters")
        
        # Check for Twitter API credentials
        twitter_api_key = os.environ.get("X_CONSUMER_KEY")
        twitter_api_secret = os.environ.get("X_CONSUMER_SECRET")
        twitter_access_token = os.environ.get("X_ACCESS_TOKEN")
        twitter_access_secret = os.environ.get("X_ACCESS_TOKEN_SECRET")
        
        if not all([twitter_api_key, twitter_api_secret, twitter_access_token, twitter_access_secret]):
            raise HTTPException(status_code=400, detail="Twitter API credentials not configured")
        
        # Initialize Twitter client
        client = tweepy.Client(
            consumer_key=twitter_api_key,
            consumer_secret=twitter_api_secret,
            access_token=twitter_access_token,
            access_token_secret=twitter_access_secret
        )
        
        # Get the correct tweet ID (checking edit history if needed)
        tweet_id = find_correct_tweet_id(tweet_id, client)
        
        # Perform the action
        try:
            if action == "like":
                response = client.like(tweet_id)
                return {"status": "success", "message": "Tweet liked successfully", "data": response}
            elif action == "unlike":
                response = client.unlike(tweet_id)
                return {"status": "success", "message": "Tweet unliked successfully", "data": response}
            elif action == "retweet":
                response = client.retweet(tweet_id)
                return {"status": "success", "message": "Tweet retweeted successfully", "data": response}
            elif action == "unretweet":
                response = client.unretweet(tweet_id)
                return {"status": "success", "message": "Tweet unretweeted successfully", "data": response}
            else:
                raise HTTPException(status_code=400, detail=f"Unsupported action: {action}")
        except tweepy.TweepyException as e:
            error_message = str(e)
            logger.error(f"Twitter API error: {error_message}")
            raise HTTPException(status_code=400, detail=f"Twitter API error: {error_message}")
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in tweet_action: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

def format_time_until(timestamp):
    """
    Format the time until a given timestamp in a human-readable format.
    
    Args:
        timestamp: Unix timestamp
        
    Returns:
        String like "5 minutes" or "30 seconds"
    """
    seconds_until = max(0, int(timestamp - time.time()))
    
    if seconds_until < 60:
        return f"{seconds_until} second{'s' if seconds_until != 1 else ''}"
    else:
        minutes_until = max(1, int(seconds_until / 60))
        return f"{minutes_until} minute{'s' if minutes_until != 1 else ''}"

@app.get("/api/twitter/user/me")
async def get_current_user():
    """
    Get information about the authenticated Twitter user.
    Returns username, profile image URL, and other basic information.
    """
    try:
        # Check if Twitter credentials are available
        twitter_api_key = os.environ.get("X_CONSUMER_KEY")
        twitter_api_secret = os.environ.get("X_CONSUMER_SECRET")
        twitter_access_token = os.environ.get("X_ACCESS_TOKEN")
        twitter_access_secret = os.environ.get("X_ACCESS_TOKEN_SECRET")
        
        if not all([twitter_api_key, twitter_api_secret, twitter_access_token, twitter_access_secret]):
            raise HTTPException(
                status_code=400,
                detail="Twitter API credentials not configured"
            )
        
        # Initialize OAuth1 for API requests
        auth = OAuth1(
            twitter_api_key,
            twitter_api_secret,
            twitter_access_token,
            twitter_access_secret
        )
        
        # Get the authenticated user's information
        user_response = requests.get(
            "https://api.twitter.com/2/users/me",
            auth=auth,
            params={
                "user.fields": "profile_image_url,username,name,verified"
            }
        )
        user_response.raise_for_status()
        user_data = user_response.json()
        
        if "data" not in user_data:
            raise HTTPException(
                status_code=500,
                detail="Failed to get authenticated user information"
            )
        
        # Return the user data
        return user_data
        
    except requests.exceptions.RequestException as e:
        logger.error(f"Twitter API error: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Twitter API error: {str(e)}"
        )
    except Exception as e:
        logger.error(f"Unexpected error: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Unexpected error: {str(e)}"
        )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 