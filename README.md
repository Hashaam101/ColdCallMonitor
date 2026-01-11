# Cold Call Transcriber

This tool uses the Google Gemini API to transcribe cold call recordings and extract actionable insights. It identifies who was spoken to (Recipients), the target decision maker (Owner), the company's location, key objections, and follow-up actions.

## Prerequisites

- Python 3.9+
- A Google Cloud Project with the Gemini API enabled.
- An API Key for Google Gemini.

## Installation

1.  **Install the required libraries:**

    ```bash
    pip install -r requirements.txt
    ```

2.  **Set up your API Key:**

    -   Copy the example environment file:
        ```bash
        cp .env.example .env
        ```
    -   Open `.env` and replace `your_api_key_here` with your actual Gemini API key.
    -   (Optional) You can change the `GEMINI_MODEL` variable if you want to use a different model version.

## Usage

Run the script providing the path to your audio file:

```bash
python transcribe_calls.py path/to/your/audio_file.mp3
```

### Example

```bash
python transcribe_calls.py recordings/call_001.mp3
```

### Output

The script will generate files in the `transcripts/` directory named using the format:
`{DD-MM-YYYY_HH-MM-SS}_{Company Name}_{Recipients}_{Date}.txt`

The date and time are formatted in local time (PKT).

For example:
`27-10-2023_14-30-05_The_Burger_Joint_Receptionist_2023-10-27.txt`
`28-10-2023_09-15-22_TechCorp_John_Owner_2023-10-28.txt`

If specific metadata cannot be identified, it will use the audio file's timestamp and original name, e.g.:
`12-01-2026_10-00-00_Pizza_Place_Unknown_Unknown_Date.txt`
