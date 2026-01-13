
from dotenv import load_dotenv
from appwrite_service import AppwriteService
import logging

# Load environment variables first
load_dotenv()


# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def update_schema():
    print("Initializing Appwrite Service...")
    service = AppwriteService()
    
    print("Running setup_database to update schema...")
    service.setup_database()
    
    print("Schema update complete.")

if __name__ == "__main__":
    update_schema()
