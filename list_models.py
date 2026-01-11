import os
from google import genai
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

def list_gemini_models():
    """
    Lists the available models from the Gemini API using the google-genai SDK.
    """
    try:
        client = genai.Client()
        print("Fetching available models...\n")
        
        # List models
        models = client.models.list()
        
        print(f"{ 'Model Name':<40} {'Display Name':<30}")
        print("-" * 80)
        
        for model in models:
            # Using common attributes found in the GenAI Model object
            name = getattr(model, 'name', 'N/A')
            display_name = getattr(model, 'display_name', 'N/A')
            
            print(f"{name:<40} {display_name:<30}")

    except Exception as e:
        print(f"An error occurred: {e}")

if __name__ == "__main__":
    list_gemini_models()