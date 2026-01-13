
from dotenv import load_dotenv
import os
from appwrite.client import Client
from appwrite.services.databases import Databases

load_dotenv()

# Setup Client
client = Client()
endpoint = os.getenv('APPWRITE_ENDPOINT') or os.getenv('NEXT_PUBLIC_APPWRITE_ENDPOINT')
if not endpoint:
    # Fallback to default commonly used in code
    endpoint = "https://cloud.appwrite.io/v1"

client.set_endpoint(endpoint)
client.set_project(os.getenv('APPWRITE_PROJECT_ID'))
client.set_key(os.getenv('APPWRITE_API_KEY'))

databases = Databases(client)

# Configuration from env or defaults
db_id = os.getenv('APPWRITE_DATABASE_ID', 'ColdCalls')
team_members_id = os.getenv('APPWRITE_TEAM_MEMBERS_COLLECTION_ID', 'team_members')

def fix_permissions():
    print(f"Updating permissions for TeamMembers ({team_members_id}) in Database ({db_id})...")
    try:
        # Add read("users") to permissions
        # Note: existing permissions might be [] or have logic. 
        # But for TeamMembers lookup, 'read("users")' is required.
        databases.update_collection(
            database_id=db_id,
            collection_id=team_members_id,
            name="TeamMembers",
            permissions=['read("users")']
        )
        print("Success: Added read(\"users\") permission to TeamMembers collection.")
    except Exception as e:
        print(f"Error updating permissions: {e}")

if __name__ == "__main__":
    fix_permissions()
