from fastapi import FastAPI, HTTPException, Depends, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os
from dotenv import load_dotenv
import requests
from requests_oauthlib import OAuth1
from openai import OpenAI
from typing import List, Optional
import base64
import json

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
# Initialize the OpenAI client with just the API key
api_key = os.getenv("OPENAI_API_KEY")
if not api_key:
    raise ValueError("OPENAI_API_KEY environment variable is not set")

client = OpenAI(api_key=api_key)
OPENAI_TEXT_MODEL = os.getenv("OPENAI_TEXT_MODEL", "gpt-4-turbo")
OPENAI_IMAGE_MODEL = os.getenv("OPENAI_IMAGE_MODEL", "dall-e-3") 