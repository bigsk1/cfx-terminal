import os
from dotenv import load_dotenv
from openai import OpenAI

# Load environment variables
load_dotenv()

# Get API key
api_key = os.getenv("OPENAI_API_KEY")
if not api_key:
    raise ValueError("OPENAI_API_KEY environment variable is not set")

# Try to initialize the client with minimal parameters
try:
    # Create a simple client with only the API key
    client = OpenAI(api_key=api_key)
    print("OpenAI client initialized successfully!")
    
    # Try a simple API call
    completion = client.chat.completions.create(
        model="gpt-3.5-turbo",
        messages=[
            {"role": "system", "content": "You are a helpful assistant."},
            {"role": "user", "content": "Hello!"}
        ]
    )
    print(f"API call successful! Response: {completion.choices[0].message.content}")
    
except Exception as e:
    print(f"Error: {e}")
    print(f"Error type: {type(e)}") 