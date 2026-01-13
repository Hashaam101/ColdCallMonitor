import unittest
from unittest.mock import MagicMock, patch
from pathlib import Path
import sys
import logging

# Configure logging to show info
logging.basicConfig(level=logging.INFO)

# Import the functions/classes to test
# Assuming the script is run from the project root
from transcribe_calls import extract_phone_from_filename, CallAnalysis

# We need to mock the Appwrite dependencies for AppwriteService
# because we don't want to connect to real Appwrite
sys.modules['appwrite'] = MagicMock()
sys.modules['appwrite.client'] = MagicMock()
sys.modules['appwrite.services.databases'] = MagicMock()
sys.modules['appwrite.id'] = MagicMock()
sys.modules['appwrite.exception'] = MagicMock()
sys.modules['appwrite.query'] = MagicMock()

# Now import AppwriteService
from appwrite_service import AppwriteService

class TestPhoneLinking(unittest.TestCase):

    def test_extract_phone_from_filename(self):
        """Test extraction of phone numbers from filenames."""
        print("\n--- Testing extract_phone_from_filename ---")
        
        # Test case 1: Standard format
        f1 = Path("recording_13-01-2026_23-25-17_16096538442.wav")
        self.assertEqual(extract_phone_from_filename(f1), "16096538442")
        print(f"Passed: {f1} -> 16096538442")

        # Test case 2: Different extension
        f2 = Path("recording_2026-01-13_120000_15551234567.mp3")
        self.assertEqual(extract_phone_from_filename(f2), "15551234567")
        print(f"Passed: {f2} -> 15551234567")

        # Test case 3: No phone number
        f3 = Path("recording_13-01-2026_23-25-17.wav")
        self.assertIsNone(extract_phone_from_filename(f3))
        print(f"Passed: {f3} -> None")

        # Test case 4: Invalid phone number (letters)
        f4 = Path("recording_date_time_notaphonenum.wav")
        self.assertIsNone(extract_phone_from_filename(f4))
        print(f"Passed: {f4} -> None")

        # Test case 5: Phone number too short
        f5 = Path("recording_date_time_123.wav")
        self.assertIsNone(extract_phone_from_filename(f5))
        print(f"Passed: {f5} -> None")

    @patch('os.getenv')
    def test_find_company_by_phone(self, mock_getenv):
        """Test logic for finding company by phone."""
        print("\n--- Testing find_company_by_phone ---")
        
        # Setup env vars mock
        def mock_env_vars(key, default=None):
            if key == "APPWRITE_ENDPOINT":
                return "https://cloud.appwrite.io/v1"
            elif "APPWRITE" in key:
                return "test_val"
            return default
            
        mock_getenv.side_effect = mock_env_vars
        
        # Setup mocking
        service = AppwriteService()
        service.databases = MagicMock()
        service.database_id = "test_db"
        service.companies_collection_id = "test_companies"
        
        target_phone = "1234567890"

        # Case 1: Exact match found
        mock_company = {
            "$id": "company_123",
            "company_name": "Test Corp",
            "phone_numbers": "1234567890"
        }
        service.databases.list_rows.return_value = {"documents": [mock_company]}
        
        found = service.find_company_by_phone(target_phone)
        self.assertIsNotNone(found)
        self.assertEqual(found["$id"], "company_123")
        print("Passed: Exact match found")

        # Case 2: Match in comma-separated list
        mock_company_multi = {
            "$id": "company_456",
            "company_name": "Multi Phone Corp",
            "phone_numbers": "0987654321, 1234567890, 1122334455"
        }
        service.databases.list_rows.return_value = {"documents": [mock_company_multi]}
        
        found = service.find_company_by_phone(target_phone)
        self.assertIsNotNone(found)
        self.assertEqual(found["$id"], "company_456")
        print("Passed: Match in CSV list found")

        # Case 3: Partial match but NOT exact match (should fail)
        # E.g. searching for 123 in 123456
        service.databases.list_rows.return_value = {"documents": [{
            "$id": "company_fail",
            "phone_numbers": "123456789012" # Contains target but not equal
        }]}
        
        found = service.find_company_by_phone(target_phone)
        self.assertIsNone(found)
        print("Passed: Partial match ignored (correctly)")

        # Case 4: No results
        service.databases.list_rows.return_value = {"documents": []}
        found = service.find_company_by_phone(target_phone)
        self.assertIsNone(found)
        print("Passed: No company found")

    @patch('appwrite_service.ID')
    @patch('os.getenv')
    def test_save_call_analysis_linking(self, mock_getenv, mock_id_cls):
        """Test save_call_analysis links to existing company."""
        print("\n--- Testing save_call_analysis linking ---")
        
        # Setup env vars mock
        def mock_env_vars(key, default=None):
            if key == "APPWRITE_ENDPOINT":
                return "https://cloud.appwrite.io/v1"
            elif "APPWRITE" in key:
                return "test_val"
            return default
            
        mock_getenv.side_effect = mock_env_vars
        
        # Setup mocking
        mock_id_cls.unique.return_value = "unique_id"
        
        service = AppwriteService()
        service.databases = MagicMock() # Reset mock
        service.find_company_by_phone = MagicMock()
        service.save_company = MagicMock()
        service.coldcalls_collection_id = "coldcalls"
        service.transcripts_collection_id = "transcripts"
        
        # Fake Create Result
        service.databases.create_row.return_value = {"$id": "new_call_id"}

        # Case 1: Phone number matches existing company
        phone = "5555555555"
        analysis = CallAnalysis(
            transcript="Hello",
            phone_number=phone,
            company_name="Some Company"
        )
        
        # Mock finding company
        service.find_company_by_phone.return_value = {"$id": "existing_company_id"}
        
        call_id = service.save_call_analysis(analysis)
        
        self.assertEqual(call_id, "new_call_id")
        
        # Verify find_company_by_phone was called
        service.find_company_by_phone.assert_called_with(phone)
        
        # Verify save_company was NOT called (because we found one)
        service.save_company.assert_not_called()
        
        # Verify create_row linked to new company
        # Iterate through calls to find the one for coldcalls table
        calls = service.databases.create_row.call_args_list
        found_data = None
        for call in calls:
            _, kwargs = call
            if kwargs.get('table_id') == "coldcalls":
                found_data = kwargs['data']
                break
        
        self.assertIsNotNone(found_data, "ColdCall create_row not called")
        self.assertEqual(found_data['company_id'], "existing_company_id")
        print("Passed: Linked to existing company by phone")

        # Reset mocks
        service.find_company_by_phone.reset_mock()
        service.save_company.reset_mock()
        service.databases.create_row.reset_mock()

        # Case 2: Phone number provided but NO existing company
        phone = "9999999999"
        analysis = CallAnalysis(
            transcript="Hello",
            phone_number=phone,
            company_name="New Company"
        )
        
        service.find_company_by_phone.return_value = None
        service.save_company.return_value = "new_company_id" # mocked creation of company
        service.databases.create_row.return_value = {"$id": "new_call_id_2"}

        call_id = service.save_call_analysis(analysis)

        # Verify find_company_by_phone was called
        service.find_company_by_phone.assert_called_with(phone)
        
        # Verify save_company WAS called
        service.save_company.assert_called()
        
        # Verify save_company was called with phone_numbers
        save_company_call_args = service.save_company.call_args
        company_data_arg = save_company_call_args[0][0]
        self.assertEqual(company_data_arg['phone_numbers'], phone)
        self.assertEqual(company_data_arg['company_name'], "New Company")
        
        # Verify create_row linked to new company
        # Iterate through calls to find the one for coldcalls table
        calls = service.databases.create_row.call_args_list
        found_data = None
        for call in calls:
            _, kwargs = call
            if kwargs.get('table_id') == "coldcalls":
                found_data = kwargs['data']
                break
                
        self.assertIsNotNone(found_data, "ColdCall create_row not called")
        self.assertEqual(found_data['company_id'], "new_company_id")
        print("Passed: Created new company with phone number")

if __name__ == '__main__':
    unittest.main()
