# Cold Call Transcriber

This tool uses the Google Gemini API to transcribe audio calls and automatically name the output files based on extracted metadata (Caller Name, Restaurant Name, and Date).
In this project the calls are specific to the restaurant industry and are cold calls to potential customers.

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

The script will generate a text file in the current directory named using the format:
`{Caller Name} - {Restaurant Name} - {Date}.txt`

For example:
`John Doe - The Burger Joint - 2023-10-27.txt`

If specific metadata cannot be identified, it will default to "Unknown", e.g.:
`Unknown_Caller - Pizza Place - Unknown_Date.txt`
