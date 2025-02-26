from fastapi import FastAPI, HTTPException, Depends, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel
import os
from dotenv import load_dotenv
import requests
from requests_oauthlib import OAuth1
from openai import OpenAI
from typing import List, Optional, Tuple
import base64
import json
import re
import uuid
from pathlib import Path
import logging
import time

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
    
    return ModelInfoResponse(
        text_model=OPENAI_TEXT_MODEL,
        image_model=OPENAI_IMAGE_MODEL,
        available_models=available_models,
        default_model=OPENAI_TEXT_MODEL,
        xai_available=xai_available
    )

@app.post("/api/craft-tweet", response_model=TweetResponse)
async def craft_tweet(request: TweetRequest):
    """Craft a tweet using AI"""
    try:
        # Determine which model to use for text generation
        model = request.model if request.model else OPENAI_TEXT_MODEL
        
        # Create a system message that personalizes the tweet crafting
        system_message = f"You are a helpful AI assistant that crafts engaging tweets. "
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
            
        auth = OAuth1(
            twitter_credentials["consumer_key"],
            twitter_credentials["consumer_secret"],
            twitter_credentials["access_token"],
            twitter_credentials["access_token_secret"]
        )
        
        # Upload image for main tweet if provided (unchanged)
        media_id = None
        if request.image_url:
            image_response = requests.get(request.image_url)
            image_response.raise_for_status()
            image_data = image_response.content
            files = {"media": ("image.jpg", image_data)}
            upload_response = requests.post(
                "https://upload.twitter.com/1.1/media/upload.json",
                auth=auth,
                files=files
            )
            upload_response.raise_for_status()
            media_id = upload_response.json().get("media_id_string")
        
        # Post the main tweet with rate limit debug
        tweet_ids = []
        previous_id = request.reply_to
        # Pre-POST check
        logger.info("Checking rate limits before POST...")
        test_response = requests.get(
            "https://api.twitter.com/2/users/me",
            auth=auth
        )
        logger.info(f"Pre-POST GET Headers: Total={test_response.headers.get('x-rate-limit-limit')}, "
                    f"Remaining={test_response.headers.get('x-rate-limit-remaining')}, "
                    f"Reset={test_response.headers.get('x-rate-limit-reset')}")
        logger.info(f"Pre-POST Response: {test_response.text}")

        # Main POST
        payload = {"text": request.text}
        if previous_id:
            payload["reply"] = {"in_reply_to_tweet_id": previous_id}
        if media_id:
            payload["media"] = {"media_ids": [media_id]}

        response = requests.post(
            "https://api.twitter.com/2/tweets",
            auth=auth,
            json=payload
        )
        try:
            response.raise_for_status()
        except requests.exceptions.HTTPError as e:
            if response.status_code == 429:
                logger.info(f"Rate Limit Headers for /2/tweets at {time.strftime('%Y-%m-%d %H:%M:%S')}:")
                logger.info(f"Total Limit: {response.headers.get('x-rate-limit-limit')}")
                logger.info(f"Remaining: {response.headers.get('x-rate-limit-remaining')}")
                reset_time = response.headers.get('x-rate-limit-reset')
                if reset_time:
                    logger.info(f"Reset Time (UTC): {time.strftime('%Y-%m-%d %H:%M:%S', time.gmtime(int(reset_time)))}")
                logger.info(f"Response Body: {response.text}")
            raise HTTPException(status_code=500, detail=f"Error posting tweet: {str(e)}")
        
        tweet_id = response.json()["data"]["id"]
        tweet_ids.append(tweet_id)
        previous_id = tweet_id
        
        # Post thread tweets if any (unchanged for brevity)
        for i, thread_text in enumerate(request.threads):
            thread_media_id = None
            if i < len(request.thread_images) and request.thread_images[i]:
                thread_image_response = requests.get(request.thread_images[i])
                thread_image_response.raise_for_status()
                thread_image_data = thread_image_response.content
                thread_files = {"media": ("thread_image.jpg", thread_image_data)}
                thread_upload_response = requests.post(
                    "https://upload.twitter.com/1.1/media/upload.json",
                    auth=auth,
                    files=thread_files
                )
                thread_upload_response.raise_for_status()
                thread_media_id = thread_upload_response.json().get("media_id_string")
            
            thread_payload = {
                "text": thread_text,
                "reply": {"in_reply_to_tweet_id": previous_id}
            }
            if thread_media_id:
                thread_payload["media"] = {"media_ids": [thread_media_id]}
            
            thread_response = requests.post(
                "https://api.twitter.com/2/tweets",
                auth=auth,
                json=thread_payload
            )
            thread_response.raise_for_status()
            thread_id = thread_response.json()["data"]["id"]
            tweet_ids.append(thread_id)
            previous_id = thread_id
            
        return {"success": True, "tweet_ids": tweet_ids}
    except Exception as e:
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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 