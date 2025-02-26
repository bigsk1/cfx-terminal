# CFX-Terminal: Project Documentation

This document provides detailed technical information about the CFX-Terminal project, including its architecture, API integrations, and codebase structure. It serves as a reference for developers working on the project.

## Table of Contents

1. [Project Overview](#project-overview)
2. [Architecture](#architecture)
3. [Project Structure](#project-structure)
4. [Twitter API Integration](#twitter-api-integration)
5. [OpenAI Integration](#openai-integration)
6. [Cloudflare Images Integration](#cloudflare-images-integration)
7. [Development Guidelines](#development-guidelines)
8. [Troubleshooting](#troubleshooting)

## Project Overview

CFX-Terminal is an AI-powered Twitter client that combines AI capabilities with Twitter functionality. It allows users to:

- Generate tweet content using AI
- Create images for tweets using DALL-E
- Post tweets, threads, and media to Twitter
- View and interact with the Twitter timeline
- Store and manage images using Cloudflare Images

The application is built with a modern tech stack:
- **Frontend**: Next.js with Chakra UI
- **Backend**: Python FastAPI
- **APIs**: Twitter API, OpenAI API, Cloudflare Images API

## Architecture

The application follows a client-server architecture:

```
┌─────────────┐      ┌─────────────┐      ┌─────────────────┐
│             │      │             │      │                 │
│  Next.js    │◄────►│  FastAPI    │◄────►│  External APIs  │
│  Frontend   │      │  Backend    │      │  (Twitter,      │
│             │      │             │      │   OpenAI, etc.) │
└─────────────┘      └─────────────┘      └─────────────────┘
```

- **Frontend**: Handles UI rendering, user interactions, and state management
- **Backend**: Processes requests, interacts with external APIs, and handles business logic
- **External APIs**: Provide functionality for tweets, AI generation, and image storage

## Project Structure

### Root Directory

```
/
├── backend/             # Python FastAPI backend
├── frontend/            # Next.js frontend
├── docker/              # Docker configuration
├── .env                 # Environment variables
├── .env.sample          # Sample environment variables
├── start.sh             # Script to start both frontend and backend
└── README.md            # Project documentation
```

### Backend Structure

```
backend/
├── main.py              # Main FastAPI application
├── requirements.txt     # Python dependencies
├── temp_images/         # Temporary storage for image uploads
└── test_*.py            # Test scripts for various components
```

### Frontend Structure

```
frontend/
├── public/              # Static assets
├── src/                 # Source code
│   ├── app/             # Next.js app directory
│   │   ├── components/  # React components
│   │   │   ├── twitter/ # Twitter-specific components
│   │   │   └── ...      # Other components
│   │   ├── hooks/       # Custom React hooks
│   │   ├── page.tsx     # Main page component
│   │   ├── layout.tsx   # Root layout component
│   │   ├── globals.css  # Global styles
│   │   └── theme.ts     # Chakra UI theme
│   └── ...
├── package.json         # Node.js dependencies
└── next.config.js       # Next.js configuration
```

## Twitter API Integration

### API Access Requirements

CFX-Terminal uses both Twitter API v2 and v1.1 endpoints:

- **API v2 endpoints**: For posting tweets, viewing timeline, and tweet interactions
- **API v1.1 endpoints**: For media uploads and OAuth authentication

The application is designed to work with the free tier of Twitter API access, but some features may be limited based on your access level.

### Tweepy Integration

The backend uses Tweepy, a Python library for accessing the Twitter API. Two main client types are used:

1. **Tweepy Client (v2 API)**:
   ```python
   client = tweepy.Client(
       consumer_key=twitter_api_key,
       consumer_secret=twitter_api_secret,
       access_token=twitter_access_token,
       access_token_secret=twitter_access_token_secret
   )
   ```

2. **Tweepy API (v1.1 API)**:
   ```python
   auth = tweepy.OAuth1UserHandler(
       twitter_api_key,
       twitter_api_secret,
       twitter_access_token,
       twitter_access_token_secret
   )
   twitter_client = tweepy.API(auth)
   ```

### Key Twitter Endpoints

The backend implements several Twitter API endpoints:

1. **Home Timeline**: Fetches the user's home timeline
   - Endpoint: `/api/twitter/home-timeline`
   - Method: GET
   - Uses: Twitter API v2 with direct HTTP requests

2. **Post Tweet**: Posts a new tweet with optional media
   - Endpoints: 
     - `/api/post-tweet` (JSON body)
     - `/api/twitter/post-tweet` (Form data)
   - Method: POST
   - Uses: Twitter API v2 for posting tweets, v1.1 for media uploads

3. **Reply to Tweet**: Replies to an existing tweet
   - Endpoint: `/api/twitter/reply`
   - Method: POST
   - Uses: Twitter API v2 for posting replies, v1.1 for media uploads

4. **Tweet Actions**: Like, unlike, retweet, or unretweet a tweet
   - Endpoint: `/api/twitter/tweet-action`
   - Method: POST
   - Uses: Twitter API v2

5. **Delete Tweet**: Deletes a tweet
   - Endpoint: `/api/delete-tweet`
   - Method: POST
   - Uses: Twitter API v2

### Media Upload Process

Media uploads use a multi-step process:

1. The frontend sends the image data to the backend
2. The backend saves the image to a temporary file in the `temp_images` directory
3. The image is uploaded to Twitter using the v1.1 API's `media_upload` method
4. The temporary file is deleted after the upload
5. The media ID is included when posting the tweet

## OpenAI Integration

The application integrates with OpenAI for text and image generation:

### Text Generation

- Uses OpenAI's Chat Completions API
- Configurable model via environment variables (default: `gpt-4o`)
- Endpoints:
  - `/api/craft-tweet`: Generates tweet content based on a prompt
  - `/api/chat`: General chat functionality

### Image Generation

- Uses DALL-E 3 for image generation
- Configurable via environment variables
- Endpoint: `/api/generate-image`

### XAI Integration (Optional)

The application also supports XAI's Grok model as an alternative to OpenAI:

- Configurable via environment variables
- Uses the same endpoints as OpenAI

## Cloudflare Images Integration

Cloudflare Images is used for persistent storage of generated images:

- **Upload**: `/api/upload-to-cloudflare`
- **List Images**: `/api/cloudflare-images`
- **Check Image**: `/api/check-cloudflare-image`

The integration requires Cloudflare account credentials in the `.env` file.

## Development Guidelines

### Environment Setup

1. Create a `.env` file based on `.env.sample`
2. Obtain API keys for Twitter, OpenAI, and Cloudflare (if needed)
3. Install dependencies for both frontend and backend

### Running the Application

Use the provided `start.sh` script to run both frontend and backend:

```bash
./start.sh
```

Or run them separately:

```bash
# Backend
cd backend
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000

# Frontend
cd frontend
npm run dev
```

### Docker Deployment

For containerized deployment:

```bash
./docker/docker-start.sh
```

## Troubleshooting

### Twitter API Issues

1. **Rate Limiting**: The application includes rate limit handling with caching for the timeline
2. **API Access Levels**: Different features require different access levels
   - Basic access allows posting tweets and viewing timeline
   - Elevated access provides better rate limits
3. **Media Upload Errors**: Check that the `temp_images` directory exists and has proper permissions

### Common Errors

1. **"OAuth1UserHandler object is not callable"**: Incorrect OAuth initialization
2. **"You currently have access to a subset of X API V2 endpoints"**: Limited API access level
3. **"'bytes' object has no attribute 'tell'"**: Incorrect handling of file uploads

### Debugging

The backend includes several test scripts for debugging:

- `test_twitter.py`: Tests Twitter API credentials
- `test_openai.py`: Tests OpenAI API integration
- `test_home_timeline.py`: Tests the home timeline endpoint
- `test_tweet_id.py`: Tests tweet ID handling

Run these scripts to diagnose specific issues:

```bash
cd backend
python test_twitter.py
``` 