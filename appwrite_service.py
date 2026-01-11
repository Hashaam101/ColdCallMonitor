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
# Note: Sizes minimized to fit Appwrite free tier limits
TRANSCRIPT_ATTRIBUTES = [
    {"key": "transcript", "type": "string", "size": 5000, "required": True},  # 5KB max
    {"key": "caller_name", "type": "string", "size": 50, "required": False},
    {"key": "recipients", "type": "string", "size": 50, "required": False},
    {"key": "owner_name", "type": "string", "size": 50, "required": False},
    {"key": "company_name", "type": "string", "size": 50, "required": False},
    {"key": "company_location", "type": "string", "size": 50, "required": False},
    {"key": "call_outcome", "type": "string", "size": 30, "required": False},
    {"key": "interest_level", "type": "integer", "required": False, "min": 1, "max": 10},
    {"key": "objections", "type": "string", "size": 500, "required": False},
    {"key": "pain_points", "type": "string", "size": 500, "required": False},
    {"key": "follow_up_actions", "type": "string", "size": 500, "required": False},
    {"key": "call_summary", "type": "string", "size": 500, "required": False},
    {"key": "call_duration_estimate", "type": "string", "size": 30, "required": False},
    {"key": "model_used", "type": "string", "size": 30, "required": False},
    {"key": "input_tokens", "type": "integer", "required": False},
    {"key": "output_tokens", "type": "integer", "required": False},
    {"key": "total_tokens", "type": "integer", "required": False},
]


class AppwriteService:
    """Service for interacting with Appwrite database."""

    def __init__(self):
        self.endpoint = os.getenv("APPWRITE_ENDPOINT", "https://cloud.appwrite.io/v1")
        self.project_id = os.getenv("APPWRITE_PROJECT_ID")
        self.api_key = os.getenv("APPWRITE_API_KEY")
        self.database_id = os.getenv("APPWRITE_DATABASE_ID", "ColdCalls")
        self.collection_id = os.getenv("APPWRITE_COLLECTION_ID", "coldcalls")

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
        """Checks for database/collection and creates them if missing. Returns True if successful."""
        try:
            # Check if database already exists first (using TablesDB API)
            try:
                self.databases.get(database_id=self.database_id)
                logger.info(f"Using existing database: {self.database_id}")
            except AppwriteException as e:
                if e.code == 404:  # Not found, try to create
                    try:
                        self.databases.create(
                            database_id=self.database_id,
                            name="Cold Calls Database"
                        )
                        logger.info(f"Created new database: {self.database_id}")
                    except AppwriteException as create_err:
                        # If we hit plan limits here, we can't proceed unless the user
                        # provides an existing database ID in .env
                        if "limit" in str(create_err.message).lower():
                            logger.error("Plan limit reached. Please provide an EXISTING database ID in APPWRITE_DATABASE_ID (.env)")
                        raise create_err
                else:
                    raise

            # Try to check/create collection
            try:
                self.databases.get_table(
                    database_id=self.database_id,
                    table_id=self.collection_id
                )
                logger.info(f"Using existing collection: {self.collection_id}")
                # Ensure attributes exist even if collection exists
                self._create_attributes()
                return True
            except AppwriteException as e:
                if e.code == 404:
                    self.databases.create_table(
                        database_id=self.database_id,
                        table_id=self.collection_id,
                        name="ColdCalls"
                    )
                    logger.info(f"Created collection: {self.collection_id}")
                    self._create_attributes()
                    return True
                else:
                    raise

        except AppwriteException as e:
            logger.error(f"Failed to setup database: {e.message}")
            return False

    def _create_attributes(self):
        """Creates collection attributes based on schema."""
        for attr in TRANSCRIPT_ATTRIBUTES:
            try:
                if attr["type"] == "string":
                    self.databases.create_string_column(
                        database_id=self.database_id,
                        table_id=self.collection_id,
                        key=attr["key"],
                        size=attr["size"],
                        required=attr["required"]
                    )
                elif attr["type"] == "integer":
                    kwargs = {
                        "database_id": self.database_id,
                        "table_id": self.collection_id,
                        "key": attr["key"],
                        "required": attr["required"]
                    }
                    if "min" in attr:
                        kwargs["min"] = attr["min"]
                    if "max" in attr:
                        kwargs["max"] = attr["max"]
                    self.databases.create_integer_column(**kwargs)

                logger.debug(f"Created attribute: {attr['key']}")
            except AppwriteException as e:
                if e.code == 409:  # Already exists
                    logger.debug(f"Attribute already exists: {attr['key']}")
                else:
                    logger.warning(f"Failed to create attribute {attr['key']}: {e.message}")

    def save_transcript(self, analysis) -> Optional[str]:
        """
        Saves a CallAnalysis to the database.

        Args:
            analysis: CallAnalysis dataclass instance or dict with transcript data

        Returns:
            Document ID if successful, None otherwise
        """
        try:
            # Convert dataclass to dict if needed
            if hasattr(analysis, '__dataclass_fields__'):
                data = asdict(analysis)
            else:
                data = dict(analysis)

            # Convert list fields to JSON strings (Appwrite doesn't support arrays directly)
            for field in ["objections", "pain_points", "follow_up_actions"]:
                if data.get(field) and isinstance(data[field], list):
                    data[field] = json.dumps(data[field])
                elif not data.get(field):
                    data[field] = "[]"

            # Only keep fields that are defined in the schema
            valid_keys = {attr["key"] for attr in TRANSCRIPT_ATTRIBUTES}
            data = {k: v for k, v in data.items() if k in valid_keys}

            # Remove None values (Appwrite doesn't like null for non-required fields)
            data = {k: v for k, v in data.items() if v is not None}

            # Create document (row)
            result = self.databases.create_row(
                database_id=self.database_id,
                table_id=self.collection_id,
                row_id=ID.unique(),
                data=data
            )

            logger.info(f"Saved to Appwrite: {result['$id']}")
            return result["$id"]

        except AppwriteException as e:
            logger.error(f"Failed to save transcript: {e.message}")
            return None

    def get_transcript(self, document_id: str) -> Optional[dict]:
        """Retrieves a transcript by document ID."""
        try:
            doc = self.databases.get_row(
                database_id=self.database_id,
                table_id=self.collection_id,
                row_id=document_id
            )

            # Parse JSON string fields back to lists
            for field in ["objections", "pain_points", "follow_up_actions"]:
                if doc.get(field):
                    doc[field] = json.loads(doc[field])

            return doc
        except AppwriteException as e:
            logger.error(f"Failed to get transcript: {e.message}")
            return None

    def list_transcripts(self, limit: int = 25) -> list[dict]:
        """Lists recent transcripts."""
        try:
            result = self.databases.list_rows(
                database_id=self.database_id,
                table_id=self.collection_id
            )
            return result.get("documents", result.get("rows", []))
        except AppwriteException as e:
            logger.error(f"Failed to list transcripts: {e.message}")
            return []

    def update_transcript(self, document_id: str, updates: dict) -> Optional[dict]:
        """Updates a transcript by document ID."""
        try:
            result = self.databases.update_row(
                database_id=self.database_id,
                table_id=self.collection_id,
                row_id=document_id,
                data=updates
            )
            logger.info(f"Updated transcript: {document_id}")
            return result
        except AppwriteException as e:
            logger.error(f"Failed to update transcript: {e.message}")
            return None


def init_appwrite() -> Optional[AppwriteService]:
    """Initialize Appwrite service. Returns None if credentials are missing."""
    try:
        service = AppwriteService()
        return service
    except ValueError as e:
        logger.warning(str(e))
        return None
