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
- **🚀 Optimized for Free Plan** – 60-75% fewer API calls with intelligent caching system

## 📁 Project Structure

```
ColdCallMonitor/
├── AudioRecorder/              # Standalone audio recording application
│   ├── recorder.py             # GUI recorder with hotkey support
│   ├── requirements.txt        # Recorder-specific dependencies
│   └── README.md               # Detailed recorder documentation
├── cold-calls-dashboard/       # Next.js web dashboard
│   ├── src/
│   │   ├── app/                # Next.js app router pages
│   │   ├── components/         # React components (DataTable, Sidebar, etc.)
│   │   ├── hooks/              # React Query hooks (useColdCalls, useAlerts)
│   │   ├── lib/                # Appwrite client configuration
│   │   └── types/              # TypeScript type definitions
│   ├── package.json
│   └── README.md               # Dashboard documentation
├── transcribe_calls.py         # Main transcription & analysis script
├── appwrite_service.py         # Appwrite database integration (normalized schema)
├── seed_sample_data.py         # Seed script for populating sample data
├── Schema.dbml                 # Database schema definition
├── requirements.txt            # Core Python dependencies
├── recordings/                 # Default input directory for audio files
└── transcripts/                # Default output directory for transcripts
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

## 🚀 Appwrite Free Plan Optimization

The dashboard includes a highly optimized caching system that significantly reduces API calls and bandwidth usage. For comprehensive details on the caching architecture, implementation, and the transition to manual sync, please refer to [CACHE_README.md](CACHE_README.md).

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

## � Cold Calls Dashboard

The `cold-calls-dashboard/` folder contains a modern Next.js web application for viewing and managing all your cold call data.

**Key Features:**
- **Interactive Data Table** – Resizable columns, inline editing, sorting, and multi-select
- **Advanced Filtering** – Filter by date range, interest level, call outcome, and team member
- **Team Collaboration** – Claim calls, assign follow-ups, and set alerts for teammates
- **Real-Time Updates** – Changes sync instantly across all connected users via Appwrite
- **Bulk Actions** – Export to CSV, bulk delete, bulk claim, and bulk outcome changes
- **Alerts System** – Schedule reminders on any call with custom messages

**Quick Start:**

```bash
cd cold-calls-dashboard
pnpm install
pnpm dev
```

See [`cold-calls-dashboard/README.md`](cold-calls-dashboard/README.md) for detailed setup and feature documentation.


## �🗄️ Database Schema

When using Appwrite integration, data is stored across multiple tables in a normalized schema:

### Companies Table

| Field              | Type   | Description                     |
|--------------------|--------|---------------------------------|
| `company_name`     | string | Company name (required)         |
| `owner_name`       | string | Decision maker / owner name     |
| `company_location` | string | Company location                |
| `google_maps_link` | string | Google Maps URL                 |

### Transcripts Table

| Field        | Type   | Description                       |
|--------------|--------|-----------------------------------|
| `call_id`    | string | Reference to ColdCalls.$id        |
| `transcript` | text   | Full call transcript (up to 16KB) |

### ColdCalls Table

| Field                  | Type    | Description                           |
|------------------------|---------|---------------------------------------|
| `company_id`           | string  | Reference to Companies.$id            |
| `caller_name`          | string  | Name of the caller                    |
| `recipients`           | string  | People spoken to                      |
| `call_outcome`         | string  | Result of the call                    |
| `interest_level`       | int     | Interest score (1-10)                 |
| `objections`           | text    | Objections raised (JSON array)        |
| `pain_points`          | text    | Pain points identified (JSON array)   |
| `follow_up_actions`    | text    | Required follow-up actions (JSON)     |
| `call_summary`         | text    | Brief summary of the call             |
| `call_duration_estimate` | string | Estimated call duration             |
| `model_used`           | string  | Gemini model version used             |
| `claimed_by`           | string  | Reference to TeamMembers.$id          |

### TeamMembers Table

| Field   | Type   | Description          |
|---------|--------|----------------------|
| `name`  | string | Team member name     |
| `email` | string | Team member email    |
| `role`  | string | Role (admin/member)  |

### Alerts Table

| Field         | Type     | Description                    |
|---------------|----------|--------------------------------|
| `created_by`  | string   | Reference to TeamMembers.$id   |
| `target_user` | string   | Reference to TeamMembers.$id   |
| `entity_type` | string   | Entity type (e.g., cold_call)  |
| `entity_id`   | string   | Reference to entity document   |
| `entity_label`| string   | Display label                  |
| `alert_time`  | datetime | Scheduled alert time           |
| `message`     | text     | Alert message                  |
| `is_dismissed`| boolean  | Whether alert is dismissed     |

## 📋 Supported Audio Formats

`.mp3` `.wav` `.m4a` `.ogg` `.flac` `.aac` `.wma`

## 🛠️ Development

### Test Appwrite Setup

```bash
python add_sample_entry.py
```

## 📄 License

MIT License
