"""
Quick script to add 1 sample cold call entry to Appwrite database.
"""

import os
from dotenv import load_dotenv

load_dotenv()

from appwrite.client import Client
from appwrite.services.tables_db import TablesDB
from appwrite.id import ID

# Initialize client
client = Client()
client.set_endpoint(os.getenv("APPWRITE_ENDPOINT", "https://cloud.appwrite.io/v1"))
client.set_project(os.getenv("APPWRITE_PROJECT_ID"))
client.set_key(os.getenv("APPWRITE_API_KEY"))

databases = TablesDB(client)

database_id = os.getenv("APPWRITE_DATABASE_ID", "ColdCalls")
collection_id = os.getenv("APPWRITE_COLLECTION_ID", "coldcalls")

# Sample data matching Schema.dbml
sample_data = {
    "transcript": """Hello, this is John from ABC Solutions calling. Am I speaking with the decision maker for IT services?
    
Yes, this is Sarah speaking.

Great Sarah! I'm reaching out because we've helped companies like yours reduce their IT costs by up to 40% while improving system reliability. Would you have 15 minutes this week to discuss how we might help your organization?

Actually, that sounds interesting. We've been having some issues with our current provider.

I understand completely. Many of our clients came to us with similar frustrations. What specific challenges are you facing?

Mainly downtime and slow response times when we have issues.

Those are exactly the pain points we address. Our average response time is under 30 minutes and we guarantee 99.9% uptime. Can I schedule a brief demo for you?

Yes, let's do that. How about Thursday at 2pm?

Perfect! I'll send you a calendar invite. Thank you for your time, Sarah!""",
    "caller_name": "John Smith",
    "recipients": "Sarah Johnson",
    "owner_name": "ABC Solutions Sales Team",
    "company_name": "TechCorp Industries",
    "company_location": "Lahore, Pakistan",
    "call_outcome": "demo_scheduled",
    "interest_level": 8,
    "objections": '["Current provider issues", "Need to verify pricing"]',
    "pain_points": '["System downtime", "Slow IT support response times"]',
    "follow_up_actions": '["Send calendar invite for Thursday 2pm demo", "Prepare custom proposal", "Research their current IT setup"]',
    "call_summary": "Successful cold call with Sarah Johnson from TechCorp Industries. Prospect expressed strong interest due to frustrations with current IT provider (downtime, slow response). Scheduled demo for Thursday 2pm. High conversion potential.",
    "model_used": "gemini-2.0-flash-exp",
    "input_tokens": 1250,
    "output_tokens": 420,
    "total_tokens": 1670
}

print("Adding sample entry to Appwrite...")
print(f"Database: {database_id}")
print(f"Collection: {collection_id}")

try:
    result = databases.create_row(
        database_id=database_id,
        table_id=collection_id,
        row_id=ID.unique(),
        data=sample_data
    )
    print(f"\n✓ Successfully added sample entry!")
    print(f"  Document ID: {result['$id']}")
    print(f"  Company: {sample_data['company_name']}")
    print(f"  Caller: {sample_data['caller_name']}")
    print(f"  Outcome: {sample_data['call_outcome']}")
    print(f"  Interest Level: {sample_data['interest_level']}/10")
except Exception as e:
    print(f"\n❌ Failed to add entry: {e}")
