# Cold Call Monitor

A comprehensive toolset for recording, transcribing, and analyzing cold calls. This project uses the Google Gemini API to convert audio recordings into structured insights—identifying call outcomes, decision makers, objections, and follow-up actions—and optionally stores results in an Appwrite database.

## 🎯 Features

- **Audio Recording** – Built-in recorder with microphone and desktop audio capture
- **AI-Powered Transcription** – Uses Google Gemini to transcribe and analyze calls
- **Structured Insights** – Extracts recipients, company info, objections, pain points, and follow-ups
- **Multi-Format Output** – Save transcripts as Markdown, JSON, or plain text
- **Batch Processing** – Process entire directories of recordings at once
- **Cloud Storage** – Optional Appwrite integration for storing transcripts in a database
- **Resume Capability** – Skip already-processed files when running batch jobs

## 📁 Project Structure

```
ColdCallMonitor/
├── AudioRecorder/          # Standalone audio recording application
│   ├── recorder.py         # GUI recorder with hotkey support
│   ├── requirements.txt    # Recorder-specific dependencies
│   └── README.md           # Detailed recorder documentation
├── transcribe_calls.py     # Main transcription & analysis script
├── appwrite_service.py     # Appwrite database integration
├── add_sample_entry.py     # Test script for database entries
├── Schema.dbml             # Database schema definition
├── requirements.txt        # Core dependencies
├── recordings/             # Default input directory for audio files
└── transcripts/            # Default output directory for transcripts
```

## 🚀 Quick Start

### Prerequisites

- Python 3.9+
- Google Cloud Project with Gemini API enabled
- Gemini API Key
- (Optional) Appwrite project for cloud storage

### Installation

1. **Clone the repository and install dependencies:**

   ```bash
   pip install -r requirements.txt
   ```

2. **Configure environment variables:**

   ```bash
   cp .env.example .env
   ```

   Edit `.env` with your credentials:

   ```env
   # Required
   GEMINI_API_KEY=your_gemini_api_key
   GEMINI_MODEL=gemini-2.5-flash

   # Optional - Appwrite Integration
   APPWRITE_ENDPOINT=https://fra.cloud.appwrite.io/v1
   APPWRITE_PROJECT_ID=your_project_id
   APPWRITE_API_KEY=your_api_key
   APPWRITE_DATABASE_ID=your_database_id
   ```

## 📝 Usage

### Transcribe a Single Recording

```bash
python transcribe_calls.py path/to/audio.mp3
```

### Batch Process a Directory

```bash
python transcribe_calls.py recordings/
```

### Specify Output Format

```bash
python transcribe_calls.py audio.mp3 --formats md json txt
```

### Save to Appwrite Database

Use the `--appwrite` flag to store transcripts in your Appwrite database:

```bash
python transcribe_calls.py recordings/ --appwrite
```

This requires Appwrite credentials configured in your `.env` file. The script will automatically create the database and collection if they don't exist.

### CLI Options

| Option | Description |
|--------|-------------|
| `-o, --output DIR` | Output directory (default: `./transcripts`) |
| `-f, --formats` | Output formats: `json`, `md`, `txt` (default: `json md`) |
| `-m, --model` | Gemini model to use (default: `gemini-2.5-flash`) |
| `--resume` | Skip files that have already been processed |
| `--no-summary` | Skip generating the summary report |
| `--appwrite` | Save transcripts to Appwrite database |
| `-v, --verbose` | Enable verbose logging |

### Examples

```bash
# Process all files in a directory with JSON and Markdown output
python transcribe_calls.py recordings/ -f json md

# Use a custom output directory
python transcribe_calls.py recordings/ -o my_transcripts/

# Resume processing (skip already processed files)
python transcribe_calls.py recordings/ --resume

# Save to Appwrite and use a specific model
python transcribe_calls.py recordings/ --appwrite -m gemini-2.0-flash
```

### Output

Transcripts are saved to the `transcripts/` directory with filenames in the format:  
`{DD-MM-YYYY_HH-MM-SS}_{Company_Name}_{Recipients}_{Date}.md`

**Examples:**
- `27-10-2023_14-30-05_The_Burger_Joint_Receptionist_2023-10-27.md`
- `28-10-2023_09-15-22_TechCorp_John_Owner_2023-10-28.md`

## 🎙️ Audio Recorder

The `AudioRecorder/` module provides a standalone GUI application for recording calls.

**Key Features:**
- Record from microphone, desktop audio, or both
- Global hotkey support (default: `Ctrl+Shift+R`)
- Real-time audio level visualization
- Configurable save location

**Quick Start:**

```bash
cd AudioRecorder
pip install -r requirements.txt
python recorder.py
```

See [`AudioRecorder/README.md`](AudioRecorder/README.md) for detailed usage instructions.

## 🗄️ Database Schema

When using Appwrite integration, transcripts are stored with the following structure:

| Field                  | Type    | Description                           |
|------------------------|---------|---------------------------------------|
| `transcript`           | text    | Full call transcript                  |
| `caller_name`          | string  | Name of the caller                    |
| `recipients`           | string  | People spoken to                      |
| `owner_name`           | string  | Decision maker identified             |
| `company_name`         | string  | Company name                          |
| `company_location`     | string  | Company location                      |
| `call_outcome`         | string  | Result of the call                    |
| `interest_level`       | int     | Interest score (1-10)                 |
| `objections`           | text    | Objections raised                     |
| `pain_points`          | text    | Pain points identified                |
| `follow_up_actions`    | text    | Required follow-up actions            |
| `call_summary`         | text    | Brief summary of the call             |
| `call_duration_estimate` | string | Estimated call duration             |
| `model_used`           | string  | Gemini model version used             |

## 📋 Supported Audio Formats

`.mp3` `.wav` `.m4a` `.ogg` `.flac` `.aac` `.wma`

## 🛠️ Development

### Test Appwrite Setup

```bash
python add_sample_entry.py
```

## 📄 License

MIT License
