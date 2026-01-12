"""
Appwrite Database Service for Cold Call Transcripts

Handles storing transcription outputs to Appwrite database.
"""

import json
import logging
import os
from dataclasses import asdict
from typing import Optional

from appwrite.client import Client
from appwrite.services.tables_db import TablesDB
from appwrite.id import ID
from appwrite.exception import AppwriteException

logger = logging.getLogger(__name__)

# Collection schema definition - matches Schema.dbml
# Normalized schema: companies and transcripts in separate tables

# Companies table - stores company information
COMPANIES_ATTRIBUTES = [
    {"key": "owner_name", "type": "string", "size": 100, "required": False},
    {"key": "company_name", "type": "string", "size": 100, "required": True},
    {"key": "company_location", "type": "string", "size": 200, "required": False},
    {"key": "google_maps_link", "type": "string", "size": 500, "required": False},
]

# Transcripts table - stores call transcripts (one-to-one with ColdCalls)
TRANSCRIPTS_ATTRIBUTES = [
    {"key": "call_id", "type": "string", "size": 36, "required": True},  # References ColdCalls.$id
    {"key": "transcript", "type": "string", "size": 16000, "required": True},  # 16KB max for transcript
]

# ColdCalls table - main call metadata (normalized)
COLDCALLS_ATTRIBUTES = [
    {"key": "company_id", "type": "string", "size": 36, "required": False},  # References companies.$id
    {"key": "caller_name", "type": "string", "size": 100, "required": False},
    {"key": "recipients", "type": "string", "size": 200, "required": False},
    {"key": "call_outcome", "type": "string", "size": 30, "required": False},
    {"key": "interest_level", "type": "integer", "required": False, "min": 1, "max": 10},
    {"key": "objections", "type": "string", "size": 2000, "required": False},
    {"key": "pain_points", "type": "string", "size": 2000, "required": False},
    {"key": "follow_up_actions", "type": "string", "size": 2000, "required": False},
    {"key": "call_summary", "type": "string", "size": 2000, "required": False},
    {"key": "call_duration_estimate", "type": "string", "size": 30, "required": False},
    {"key": "model_used", "type": "string", "size": 50, "required": False},
    {"key": "claimed_by", "type": "string", "size": 36, "required": False},
]

TEAM_MEMBERS_ATTRIBUTES = [
    {"key": "name", "type": "string", "size": 100, "required": True},
    {"key": "email", "type": "string", "size": 100, "required": True},
    {"key": "role", "type": "string", "size": 20, "required": True},  # 'admin' or 'member'
]

ALERTS_ATTRIBUTES = [
    {"key": "created_by", "type": "string", "size": 36, "required": True},
    {"key": "target_user", "type": "string", "size": 36, "required": True},
    {"key": "entity_type", "type": "string", "size": 50, "required": True},
    {"key": "entity_id", "type": "string", "size": 36, "required": True},
    {"key": "entity_label", "type": "string", "size": 100, "required": False},
    {"key": "alert_time", "type": "string", "size": 30, "required": False},  # ISO datetime
    {"key": "message", "type": "string", "size": 500, "required": False},
    {"key": "is_dismissed", "type": "boolean", "required": False, "default": False},
]

class AppwriteService:
    """Service for interacting with Appwrite database."""

    def __init__(self):
        self.endpoint = os.getenv("APPWRITE_ENDPOINT", "https://cloud.appwrite.io/v1")
        self.project_id = os.getenv("APPWRITE_PROJECT_ID")
        self.api_key = os.getenv("APPWRITE_API_KEY")
        self.database_id = os.getenv("APPWRITE_DATABASE_ID", "ColdCalls")
        self.coldcalls_collection_id = os.getenv("APPWRITE_COLDCALLS_COLLECTION_ID", "coldcalls")
        self.companies_collection_id = os.getenv("APPWRITE_COMPANIES_COLLECTION_ID", "companies")
        self.transcripts_collection_id = os.getenv("APPWRITE_TRANSCRIPTS_COLLECTION_ID", "transcripts")
        self.team_members_collection_id = os.getenv("APPWRITE_TEAM_MEMBERS_COLLECTION_ID", "team_members")
        self.alerts_collection_id = os.getenv("APPWRITE_ALERTS_COLLECTION_ID", "alerts")

        if not self.project_id or not self.api_key:
            raise ValueError(
                "Missing Appwrite credentials. Set APPWRITE_PROJECT_ID and APPWRITE_API_KEY in .env"
            )

        self.client = Client()
        self.client.set_endpoint(self.endpoint)
        self.client.set_project(self.project_id)
        self.client.set_key(self.api_key)

        # Use TablesDB API (1.8.0+) for all database operations
        self.databases = TablesDB(self.client)

    def setup_database(self) -> bool:
        """Checks for database/collections and creates them if missing. Returns True if successful."""
        try:
            # Check/Create Database
            try:
                self.databases.get(database_id=self.database_id)
                logger.info(f"Using existing database: {self.database_id}")
            except AppwriteException as e:
                if e.code == 404:
                    self.databases.create(
                        database_id=self.database_id,
                        name="Cold Calls Database"
                    )
                    logger.info(f"Created new database: {self.database_id}")
                else:
                    raise

            # Setup Collections (normalized schema)
            self._setup_collection(self.companies_collection_id, "Companies", COMPANIES_ATTRIBUTES)
            self._setup_collection(self.transcripts_collection_id, "Transcripts", TRANSCRIPTS_ATTRIBUTES)
            self._setup_collection(self.coldcalls_collection_id, "ColdCalls", COLDCALLS_ATTRIBUTES)
            self._setup_collection(self.team_members_collection_id, "TeamMembers", TEAM_MEMBERS_ATTRIBUTES)
            self._setup_collection(self.alerts_collection_id, "Alerts", ALERTS_ATTRIBUTES)

            return True

        except AppwriteException as e:
            logger.error(f"Failed to setup database: {e.message}")
            return False

    def _setup_collection(self, collection_id: str, name: str, attributes: list):
        """Helper to check/create a collection and its attributes."""
        try:
            try:
                self.databases.get_table(
                    database_id=self.database_id,
                    table_id=collection_id
                )
                logger.debug(f"Using existing collection: {name} ({collection_id})")
            except AppwriteException as e:
                if e.code == 404:
                    self.databases.create_table(
                        database_id=self.database_id,
                        table_id=collection_id,
                        name=name,
                        permissions=[] # Default permissions, should be configured in Console for security
                    )
                    logger.info(f"Created collection: {name} ({collection_id})")
                else:
                    raise

            # Ensure attributes exist
            self._create_attributes(collection_id, attributes)

        except AppwriteException as e:
            logger.error(f"Failed to setup collection {name}: {e.message}")
            raise e

    def _create_attributes(self, collection_id: str, attributes: list):
        """Creates collection attributes based on schema."""
        for attr in attributes:
            try:
                if attr["type"] == "string":
                    self.databases.create_string_column(
                        database_id=self.database_id,
                        table_id=collection_id,
                        key=attr["key"],
                        size=attr["size"],
                        required=attr["required"]
                    )
                elif attr["type"] == "integer":
                    kwargs = {
                        "database_id": self.database_id,
                        "table_id": collection_id,
                        "key": attr["key"],
                        "required": attr["required"]
                    }
                    if "min" in attr:
                        kwargs["min"] = attr["min"]
                    if "max" in attr:
                        kwargs["max"] = attr["max"]
                    self.databases.create_integer_column(**kwargs)
                elif attr["type"] == "boolean":
                    self.databases.create_boolean_column(
                        database_id=self.database_id,
                        table_id=collection_id,
                        key=attr["key"],
                        required=attr["required"],
                        default=attr.get("default", None)
                    )

                logger.debug(f"Created attribute: {attr['key']}")
            except AppwriteException as e:
                if e.code == 409:  # Already exists
                    logger.debug(f"Attribute already exists: {attr['key']}")
                else:
                    logger.warning(f"Failed to create attribute {attr['key']}: {e.message}")

    def save_call_analysis(self, analysis) -> Optional[str]:
        """
        Saves a CallAnalysis to the database using normalized schema.
        Creates entries in both coldcalls and transcripts tables.

        Args:
            analysis: CallAnalysis dataclass instance or dict with call data

        Returns:
            ColdCall document ID if successful, None otherwise
        """
        try:
            # Convert dataclass to dict if needed
            if hasattr(analysis, '__dataclass_fields__'):
                data = asdict(analysis)
            else:
                data = dict(analysis)

            # Extract transcript for separate table
            transcript_text = data.pop("transcript", "")

            # Handle company data - create or find company if company_name provided
            company_id = None
            company_fields = ["owner_name", "company_name", "company_location", "google_maps_link"]
            company_data = {k: data.pop(k, None) for k in company_fields}
            company_data = {k: v for k, v in company_data.items() if v is not None}
            
            if company_data.get("company_name"):
                company_id = self.save_company(company_data)
            
            if company_id:
                data["company_id"] = company_id

            # Convert list fields to JSON strings
            for field in ["objections", "pain_points", "follow_up_actions"]:
                if data.get(field) and isinstance(data[field], list):
                    data[field] = json.dumps(data[field])
                elif not data.get(field):
                    data[field] = "[]"

            # Only keep fields that are defined in the coldcalls schema
            valid_keys = {attr["key"] for attr in COLDCALLS_ATTRIBUTES}
            data = {k: v for k, v in data.items() if k in valid_keys}

            # Remove None values
            data = {k: v for k, v in data.items() if v is not None}

            # Create coldcall document
            call_result = self.databases.create_row(
                database_id=self.database_id,
                table_id=self.coldcalls_collection_id,
                row_id=ID.unique(),
                data=data
            )
            call_id = call_result["$id"]

            # Create transcript document linked to the call
            if transcript_text:
                self.databases.create_row(
                    database_id=self.database_id,
                    table_id=self.transcripts_collection_id,
                    row_id=ID.unique(),
                    data={
                        "call_id": call_id,
                        "transcript": transcript_text
                    }
                )

            logger.info(f"Saved call to Appwrite: {call_id}")
            return call_id

        except AppwriteException as e:
            logger.error(f"Failed to save call analysis: {e.message}")
            return None

    # Alias for backwards compatibility
    def save_transcript(self, analysis) -> Optional[str]:
        """Deprecated: Use save_call_analysis instead."""
        return self.save_call_analysis(analysis)

    def save_company(self, company_data: dict) -> Optional[str]:
        """
        Creates a new company record.
        
        Args:
            company_data: Dict with company_name (required), owner_name, company_location, google_maps_link
            
        Returns:
            Company document ID if successful, None otherwise
        """
        try:
            valid_keys = {attr["key"] for attr in COMPANIES_ATTRIBUTES}
            data = {k: v for k, v in company_data.items() if k in valid_keys and v is not None}
            
            result = self.databases.create_row(
                database_id=self.database_id,
                table_id=self.companies_collection_id,
                row_id=ID.unique(),
                data=data
            )
            logger.info(f"Saved company: {result['$id']}")
            return result["$id"]
        except AppwriteException as e:
            logger.error(f"Failed to save company: {e.message}")
            return None

    def get_company(self, company_id: str) -> Optional[dict]:
        """Retrieves a company by document ID."""
        try:
            return self.databases.get_row(
                database_id=self.database_id,
                table_id=self.companies_collection_id,
                row_id=company_id
            )
        except AppwriteException as e:
            logger.error(f"Failed to get company: {e.message}")
            return None

    def get_transcript_for_call(self, call_id: str) -> Optional[str]:
        """Retrieves the transcript text for a given call ID."""
        try:
            from appwrite.query import Query
            result = self.databases.list_rows(
                database_id=self.database_id,
                table_id=self.transcripts_collection_id,
                queries=[Query.equal("call_id", call_id)]
            )
            rows = result.get("documents", result.get("rows", []))
            if rows:
                return rows[0].get("transcript")
            return None
        except AppwriteException as e:
            logger.error(f"Failed to get transcript: {e.message}")
            return None

    def get_cold_call(self, document_id: str, include_transcript: bool = True) -> Optional[dict]:
        """
        Retrieves a cold call by document ID, optionally including transcript.
        """
        try:
            doc = self.databases.get_row(
                database_id=self.database_id,
                table_id=self.coldcalls_collection_id,
                row_id=document_id
            )

            # Parse JSON string fields back to lists
            for field in ["objections", "pain_points", "follow_up_actions"]:
                if doc.get(field):
                    doc[field] = json.loads(doc[field])

            # Fetch company info if company_id exists
            if doc.get("company_id"):
                company = self.get_company(doc["company_id"])
                if company:
                    doc["company"] = company

            # Fetch transcript if requested
            if include_transcript:
                doc["transcript"] = self.get_transcript_for_call(document_id) or ""

            return doc
        except AppwriteException as e:
            logger.error(f"Failed to get cold call: {e.message}")
            return None

    # Alias for backwards compatibility
    def get_transcript(self, document_id: str) -> Optional[dict]:
        """Deprecated: Use get_cold_call instead."""
        return self.get_cold_call(document_id)

    def list_cold_calls(self, limit: int = 25) -> list[dict]:
        """Lists recent cold calls."""
        try:
            result = self.databases.list_rows(
                database_id=self.database_id,
                table_id=self.coldcalls_collection_id
            )
            return result.get("documents", result.get("rows", []))
        except AppwriteException as e:
            logger.error(f"Failed to list cold calls: {e.message}")
            return []

    # Alias for backwards compatibility
    def list_transcripts(self, limit: int = 25) -> list[dict]:
        """Deprecated: Use list_cold_calls instead."""
        return self.list_cold_calls(limit)

    def update_cold_call(self, document_id: str, updates: dict) -> Optional[dict]:
        """Updates a cold call by document ID."""
        try:
            result = self.databases.update_row(
                database_id=self.database_id,
                table_id=self.coldcalls_collection_id,
                row_id=document_id,
                data=updates
            )
            logger.info(f"Updated cold call: {document_id}")
            return result
        except AppwriteException as e:
            logger.error(f"Failed to update cold call: {e.message}")
            return None

    # Alias for backwards compatibility  
    def update_transcript(self, document_id: str, updates: dict) -> Optional[dict]:
        """Deprecated: Use update_cold_call instead."""
        return self.update_cold_call(document_id, updates)


def init_appwrite() -> Optional[AppwriteService]:
    """Initialize Appwrite service. Returns None if credentials are missing."""
    try:
        service = AppwriteService()
        return service
    except ValueError as e:
        logger.warning(str(e))
        return None

