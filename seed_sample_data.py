"""
Seed Sample Data for Cold Calls Dashboard

Populates Appwrite database with realistic sample data for testing.
Follows normalized Schema.dbml structure (companies, transcripts, coldcalls).

Usage:
    python seed_sample_data.py
"""

import json
import os
import random
import time
from datetime import datetime, timedelta

from dotenv import load_dotenv
from appwrite.client import Client
from appwrite.services.tables_db import TablesDB
from appwrite.id import ID
from appwrite.exception import AppwriteException

load_dotenv()

# Import setup from appwrite_service
from appwrite_service import AppwriteService, init_appwrite

# Sample data for realistic cold calls
COMPANIES = [
    {"name": "TechCorp Solutions", "location": "San Francisco, CA", "owner": "Michael Chen"},
    {"name": "Global Industries Inc", "location": "New York, NY", "owner": "Sarah Johnson"},
    {"name": "Midwest Manufacturing", "location": "Chicago, IL", "owner": "David Wilson"},
    {"name": "Pacific Retail Group", "location": "Seattle, WA", "owner": "Emily Davis"},
    {"name": "Southern Healthcare", "location": "Atlanta, GA", "owner": "Robert Taylor"},
    {"name": "Mountain View Consulting", "location": "Denver, CO", "owner": "Lisa Anderson"},
    {"name": "Coastal Logistics", "location": "Miami, FL", "owner": "James Martinez"},
    {"name": "Prairie Tech Innovations", "location": "Austin, TX", "owner": "Amanda Thompson"},
    {"name": "Riverdale Financial", "location": "Boston, MA", "owner": "Christopher Lee"},
    {"name": "Sunrise Energy Co", "location": "Phoenix, AZ", "owner": "Michelle Garcia"},
    {"name": "Blue Ocean Ventures", "location": "San Diego, CA", "owner": "Daniel Rodriguez"},
    {"name": "Metro Construction LLC", "location": "Dallas, TX", "owner": "Stephanie White"},
    {"name": "Harbor Shipping Inc", "location": "Los Angeles, CA", "owner": "Matthew Harris"},
    {"name": "Valley Software Group", "location": "Portland, OR", "owner": "Nicole Clark"},
    {"name": "Crown Hospitality", "location": "Las Vegas, NV", "owner": "John Smith"},
]

RECIPIENTS = [
    "John Smith", "Sarah Johnson", "Michael Chen", "Emily Davis",
    "David Wilson", "Jennifer Brown", "Robert Taylor", "Lisa Anderson",
    "James Martinez", "Amanda Thompson", "Christopher Lee", "Michelle Garcia",
    "Daniel Rodriguez", "Stephanie White", "Matthew Harris", "Nicole Clark",
]

CALLERS = ["Alex", "Jordan", "Sam", "Taylor", "Casey"]

CALL_OUTCOMES = [
    "Interested", "Not Interested", "Callback", "No Answer", "Wrong Number", "Other"
]

OBJECTIONS = [
    "Too expensive",
    "Already have a solution",
    "Not the right time",
    "Need to consult with team",
    "Budget constraints",
    "Happy with current provider",
    "Not a priority right now",
    "Need more information",
    "Decision maker not available",
    "Company policy restrictions",
]

PAIN_POINTS = [
    "Manual processes taking too long",
    "Lack of real-time visibility",
    "Integration issues with existing systems",
    "High operational costs",
    "Poor customer experience",
    "Data silos across departments",
    "Compliance challenges",
    "Scalability limitations",
    "Staff training difficulties",
    "Reporting inefficiencies",
]

FOLLOW_UP_ACTIONS = [
    "Send product brochure",
    "Schedule demo call",
    "Follow up in 2 weeks",
    "Connect with technical team",
    "Send pricing proposal",
    "Arrange site visit",
    "Send case studies",
    "Schedule meeting with decision maker",
    "Provide ROI analysis",
    "Send trial access",
]

# Sample transcript templates
TRANSCRIPT_TEMPLATES = [
    """Caller: Hi, this is {caller} from SalesForce Pro. Am I speaking with {recipient}?
Recipient: Yes, this is {recipient}.
Caller: Great! I'm reaching out because we help companies like {company} streamline their sales operations. Do you have a few minutes?
Recipient: {response1}
Caller: I understand. {follow_up}
Recipient: {response2}
Caller: {closing}
Recipient: {final_response}
Caller: Thank you for your time, {recipient}. Have a great day!""",

    """Caller: Good {time_of_day}, may I speak with {recipient} please?
Recipient: Speaking.
Caller: Hi {recipient}, this is {caller} calling from SalesForce Pro. We specialize in helping {industry} companies improve their productivity.
Recipient: {response1}
Caller: {pitch}
Recipient: {response2}
Caller: {closing}""",

    """Caller: Hello, is this {company}?
Recipient: Yes it is, how can I help you?
Caller: I'm {caller} from SalesForce Pro. I was hoping to speak with someone in charge of {department}. Would that be you?
Recipient: {response1}
Caller: Perfect. The reason for my call is {reason}. {pitch}
Recipient: {response2}
Caller: {follow_up}
Recipient: {final_response}""",
]

RESPONSES = {
    "positive": [
        "That sounds interesting, tell me more.",
        "Yes, we've been looking into solutions like that.",
        "Sure, I can spare a few minutes.",
        "Actually, we were just discussing this internally.",
    ],
    "negative": [
        "We're not interested right now.",
        "We already have a solution in place.",
        "This isn't a good time.",
        "I'm happy with our current setup.",
    ],
    "neutral": [
        "Can you send me some information?",
        "Let me think about it.",
        "I'd need to discuss this with my team.",
        "What's the pricing like?",
    ],
}

TEAM_MEMBERS = [
    {"name": "Alice Johnson", "email": "alice@company.com", "role": "admin"},
    {"name": "Bob Smith", "email": "bob@company.com", "role": "member"},
    {"name": "Carol Williams", "email": "carol@company.com", "role": "member"},
    {"name": "David Brown", "email": "david@company.com", "role": "member"},
]


def generate_transcript(company: dict, recipient: str, caller: str, outcome: str) -> str:
    """Generate a realistic call transcript."""
    template = random.choice(TRANSCRIPT_TEMPLATES)

    # Select responses based on outcome
    if outcome in ["Interested", "Callback"]:
        response_pool = RESPONSES["positive"] + RESPONSES["neutral"]
    elif outcome in ["Not Interested", "Wrong Number"]:
        response_pool = RESPONSES["negative"]
    else:
        response_pool = RESPONSES["neutral"]

    replacements = {
        "{caller}": caller,
        "{recipient}": recipient,
        "{company}": company["name"],
        "{response1}": random.choice(response_pool),
        "{response2}": random.choice(response_pool),
        "{follow_up}": random.choice([
            "I completely understand.",
            "That makes sense.",
            "I hear that a lot actually.",
            "That's fair.",
        ]),
        "{closing}": random.choice([
            "Would it be okay if I followed up in a couple of weeks?",
            "Can I send you some information via email?",
            "Should I schedule a demo for your team?",
            "Would next week work for a quick call?",
        ]),
        "{final_response}": random.choice([
            "Sure, that works.",
            "Okay, send it over.",
            "Let me check my calendar.",
            "I'll think about it.",
        ]),
        "{time_of_day}": random.choice(["morning", "afternoon"]),
        "{industry}": random.choice(["technology", "healthcare", "manufacturing", "retail"]),
        "{pitch}": random.choice([
            "We've helped similar companies reduce costs by 30%.",
            "Our platform integrates seamlessly with existing systems.",
            "We offer a free trial so you can see the value firsthand.",
        ]),
        "{department}": random.choice(["sales", "operations", "IT", "procurement"]),
        "{reason}": random.choice([
            "we're launching a new product",
            "I noticed your company is growing",
            "we have a special offer this month",
        ]),
    }

    transcript = template
    for key, value in replacements.items():
        transcript = transcript.replace(key, value)

    return transcript


def generate_call_summary(company: str, outcome: str, interest: int) -> str:
    """Generate a brief call summary."""
    summaries = {
        "Interested": f"Positive call with {company}. Prospect showed genuine interest and agreed to next steps.",
        "Not Interested": f"Call with {company} did not result in interest. Prospect declined offer.",
        "Callback": f"Good conversation with {company}. Scheduled callback for follow-up discussion.",
        "No Answer": f"Attempted to reach {company} but no answer. Will retry.",
        "Wrong Number": f"Contact at {company} was incorrect. Need to update records.",
        "Other": f"Call with {company} concluded. Requires further qualification.",
    }

    base = summaries.get(outcome, f"Call with {company} completed.")
    if interest >= 7:
        base += " High priority lead."
    elif interest <= 3:
        base += " Low priority."

    return base


def seed_data():
    """Main function to seed sample data into Appwrite using normalized schema."""

    print("=" * 60)
    print("Cold Calls Dashboard - Sample Data Seeder (Normalized Schema)")
    print("=" * 60)

    # Initialize Appwrite service and setup database schema
    print("\n[0/5] Setting up database schema...")
    service = init_appwrite()
    if not service:
        print("  ! Failed to initialize Appwrite. Check your .env credentials.")
        return

    if service.setup_database():
        print("  + Database schema ready!")
        # Wait a moment for Appwrite to process attribute creation
        print("  Waiting for attributes to be indexed...")
        time.sleep(3)
    else:
        print("  ! Failed to setup database schema")
        return

    # Use the service's client and settings
    databases = service.databases
    database_id = service.database_id
    companies_collection = service.companies_collection_id
    transcripts_collection = service.transcripts_collection_id
    coldcalls_collection = service.coldcalls_collection_id
    team_members_collection = service.team_members_collection_id
    alerts_collection = service.alerts_collection_id

    # ========================================
    # Seed Team Members
    # ========================================
    print("\n[1/5] Seeding Team Members...")
    team_member_ids = []

    for member in TEAM_MEMBERS:
        try:
            doc_id = ID.unique()
            result = databases.create_row(
                database_id=database_id,
                table_id=team_members_collection,
                row_id=doc_id,
                data={
                    "name": member["name"],
                    "email": member["email"],
                    "role": member["role"],
                }
            )
            team_member_ids.append(result["$id"])
            print(f"  + Created team member: {member['name']} ({result['$id']})")
        except AppwriteException as e:
            print(f"  ! Failed to create team member {member['name']}: {e.message}")

    if not team_member_ids:
        print("  ! No team members created. Trying to fetch existing ones...")
        try:
            result = databases.list_rows(
                database_id=database_id,
                table_id=team_members_collection
            )
            docs = result.get("documents", result.get("rows", []))
            team_member_ids = [doc["$id"] for doc in docs]
            print(f"  Found {len(team_member_ids)} existing team members")
        except AppwriteException as e:
            print(f"  ! Could not fetch team members: {e.message}")

    # ========================================
    # Seed Companies
    # ========================================
    print("\n[2/5] Seeding Companies...")
    company_id_map = {}  # Maps company name to $id

    for company in COMPANIES:
        try:
            data = {
                "company_name": company["name"],
                "company_location": company["location"],
                "owner_name": company.get("owner"),
                "google_maps_link": f"https://maps.google.com/?q={company['location'].replace(' ', '+')}",
            }
            # Remove None values
            data = {k: v for k, v in data.items() if v is not None}

            result = databases.create_row(
                database_id=database_id,
                table_id=companies_collection,
                row_id=ID.unique(),
                data=data
            )
            company_id_map[company["name"]] = result["$id"]
            print(f"  + Created company: {company['name']} ({result['$id']})")
        except AppwriteException as e:
            print(f"  ! Failed to create company {company['name']}: {e.message}")

    # ========================================
    # Seed Cold Calls + Transcripts
    # ========================================
    print("\n[3/5] Seeding Cold Calls & Transcripts...")
    cold_call_ids = []

    num_calls = 25  # Number of sample calls to create

    for i in range(num_calls):
        company = random.choice(COMPANIES)
        recipient = random.choice(RECIPIENTS)
        caller = random.choice(CALLERS)
        outcome = random.choice(CALL_OUTCOMES)

        # Interest level correlates somewhat with outcome
        if outcome == "Interested":
            interest = random.randint(7, 10)
        elif outcome == "Callback":
            interest = random.randint(5, 8)
        elif outcome == "Not Interested":
            interest = random.randint(1, 4)
        else:
            interest = random.randint(3, 7)

        # Generate transcript
        transcript = generate_transcript(company, recipient, caller, outcome)

        # Generate JSON arrays for list fields
        num_objections = random.randint(0, 3) if outcome in ["Not Interested", "Callback"] else 0
        num_pain_points = random.randint(1, 3) if outcome in ["Interested", "Callback"] else random.randint(0, 1)
        num_follow_ups = random.randint(1, 3) if outcome in ["Interested", "Callback"] else random.randint(0, 1)

        objections = json.dumps(random.sample(OBJECTIONS, min(num_objections, len(OBJECTIONS))))
        pain_points = json.dumps(random.sample(PAIN_POINTS, min(num_pain_points, len(PAIN_POINTS))))
        follow_up_actions = json.dumps(random.sample(FOLLOW_UP_ACTIONS, min(num_follow_ups, len(FOLLOW_UP_ACTIONS))))

        # Random claimed_by (some calls are unclaimed)
        claimed_by = random.choice(team_member_ids + [None, None]) if team_member_ids else None

        # Random duration
        duration_mins = random.randint(1, 15)

        # Get company_id from our created companies
        company_id = company_id_map.get(company["name"])

        # Build cold call data (normalized - no company fields or transcript)
        data = {
            "caller_name": caller,
            "recipients": recipient,
            "call_outcome": outcome,
            "interest_level": interest,
            "objections": objections,
            "pain_points": pain_points,
            "follow_up_actions": follow_up_actions,
            "call_summary": generate_call_summary(company["name"], outcome, interest)[:2000],
            "call_duration_estimate": f"{duration_mins} minute{'s' if duration_mins > 1 else ''}",
            "model_used": "gemini-2.5-flash",
        }

        # Add company reference if available
        if company_id:
            data["company_id"] = company_id

        # Only add claimed_by if not None
        if claimed_by:
            data["claimed_by"] = claimed_by

        # Remove None values
        data = {k: v for k, v in data.items() if v is not None}

        try:
            # Create cold call
            call_result = databases.create_row(
                database_id=database_id,
                table_id=coldcalls_collection,
                row_id=ID.unique(),
                data=data
            )
            call_id = call_result["$id"]
            cold_call_ids.append(call_id)

            # Create transcript in separate table
            databases.create_row(
                database_id=database_id,
                table_id=transcripts_collection,
                row_id=ID.unique(),
                data={
                    "call_id": call_id,
                    "transcript": transcript[:16000],  # 16KB limit
                }
            )

            print(f"  + Created call #{i+1}: {company['name']} - {outcome} (Interest: {interest})")
        except AppwriteException as e:
            print(f"  ! Failed to create call #{i+1}: {e.message}")

    # ========================================
    # Seed Alerts
    # ========================================
    print("\n[4/5] Seeding Alerts...")
    alerts_created = 0

    if team_member_ids and cold_call_ids:
        # Create some sample alerts
        num_alerts_to_create = min(8, len(cold_call_ids))
        sample_calls = random.sample(cold_call_ids, num_alerts_to_create)

        alert_messages = [
            "Follow up with this lead ASAP",
            "Scheduled callback - don't forget!",
            "High priority - CEO interested",
            "Needs technical demo",
            "Send pricing proposal",
            "Waiting on decision maker",
            "Re-engage after budget cycle",
            "Hot lead - close this week",
        ]

        for i, call_id in enumerate(sample_calls):
            creator = random.choice(team_member_ids)
            target = random.choice(team_member_ids)

            # Some alerts are instant, some are scheduled
            if random.random() > 0.5:
                # Scheduled alert (1-7 days from now)
                alert_time = (datetime.now() + timedelta(days=random.randint(1, 7))).isoformat()
            else:
                alert_time = None

            data = {
                "created_by": creator,
                "target_user": target,
                "entity_type": "cold_call",
                "entity_id": call_id,
                "entity_label": f"Call #{i+1}",
                "message": alert_messages[i % len(alert_messages)],
                "is_dismissed": random.choice([True, False, False, False]),  # 25% dismissed
            }

            if alert_time:
                data["alert_time"] = alert_time

            try:
                result = databases.create_row(
                    database_id=database_id,
                    table_id=alerts_collection,
                    row_id=ID.unique(),
                    data=data
                )
                alerts_created += 1
                print(f"  + Created alert: {data['message'][:40]}...")
            except AppwriteException as e:
                print(f"  ! Failed to create alert: {e.message}")
    else:
        print("  ! Skipping alerts - need team members and calls first")

    # ========================================
    # Summary
    # ========================================
    print("\n[5/5] Summary")
    print("=" * 60)
    print("Seeding Complete!")
    print("=" * 60)
    print(f"  Companies:     {len(company_id_map)}")
    print(f"  Team Members:  {len(team_member_ids)}")
    print(f"  Cold Calls:    {len(cold_call_ids)}")
    print(f"  Transcripts:   {len(cold_call_ids)}")
    print(f"  Alerts:        {alerts_created}")
    print("=" * 60)


if __name__ == "__main__":
    seed_data()

