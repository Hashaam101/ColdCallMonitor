"""
Cold Call Transcription & Analysis Tool

Transcribes cold call recordings using Google Gemini API and extracts
actionable insights including call outcomes, objections, and follow-ups.
"""

import argparse
import json
import logging
import os
import re
import sys
import time
from dataclasses import dataclass, asdict
from datetime import datetime
from pathlib import Path
from typing import Optional

import mutagen
from dotenv import load_dotenv
from google import genai

from appwrite_service import init_appwrite

load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger(__name__)

# Supported audio formats
AUDIO_EXTENSIONS = {".mp3", ".wav", ".m4a", ".ogg", ".flac", ".aac", ".wma"}


@dataclass
class CallAnalysis:
    """Structured data from a cold call transcription."""
    transcript: str
    caller_name: Optional[str] = None
    recipients: Optional[str] = None  # People spoken to (e.g., "Receptionist", "John (Manager)")
    owner_name: Optional[str] = None  # Target decision maker/owner
    company_name: Optional[str] = None
    company_location: Optional[str] = None
    call_date_pkt: Optional[str] = None
    call_outcome: Optional[str] = None  # interested, callback, rejected, voicemail, no_answer, other
    interest_level: Optional[int] = None  # 1-10 scale
    objections: Optional[list[str]] = None
    pain_points: Optional[list[str]] = None
    follow_up_actions: Optional[list[str]] = None
    call_summary: Optional[str] = None
    call_duration_estimate: Optional[str] = None
    # Processing metadata
    timestamp: Optional[str] = None  # Format: DD-MM-YYYY_HH-MM-SS
    model_used: Optional[str] = None
    input_tokens: Optional[int] = None
    output_tokens: Optional[int] = None
    total_tokens: Optional[int] = None


def get_analysis_prompt() -> str:
    """Returns the prompt for Gemini to analyze cold calls."""
    return """Analyze this cold call recording carefully. Extract the following information:

1. **Transcript**: Provide a verbatim transcription. Identify speakers by name if mentioned (e.g., "Hashaam:", "John:"), otherwise use "Caller:" and "Recipient:".

2. **Metadata**:
   - caller_name: The salesperson/caller's name
   - recipients: The name(s) and role(s) of the actual person/people spoken to on the call (e.g., "Receptionist", "Receptionist and John (Manager) if the receptionist is a co-owner then use '(co-owner)' etc..").
   - owner_name: The name of the business owner or target decision maker (if mentioned/identified).
   - company_name: The business/company being called
   - company_location: The location/city of the business if mentioned (e.g., "New York", "London"). Null if not mentioned.
   - call_date_pkt: Date/Time of call in DD-MM-YYYY_HH-MM-SS format (local time/PKT)

3. **Call Analysis**:
   - call_outcome: One of: "interested", "callback_scheduled", "rejected", "voicemail", "no_answer", "gatekeeper_block", "not_decision_maker", "other"
   - interest_level: Rate prospect interest 1-10 (1=hostile, 5=neutral, 10=very interested). Use null if voicemail/no answer.
   - objections: List any objections raised (e.g., "no budget", "not interested", "bad timing", "using competitor")
   - pain_points: List any business problems/needs the prospect mentioned
   - follow_up_actions: List recommended next steps based on the call
   - call_summary: 2-3 sentence summary of how the call went
   - call_duration_estimate: Estimated duration (e.g., "2 minutes", "30 seconds")

Respond ONLY with a valid JSON object with these exact keys:
{
  "transcript": "...",
  "caller_name": "..." or null,
  "recipients": "..." or null,
  "owner_name": "..." or null,
  "company_name": "..." or null,
  "company_location": "..." or null,
  "call_date_pkt": "..." or null,
  "call_outcome": "...",
  "interest_level": number or null,
  "objections": ["...", "..."] or [],
  "pain_points": ["...", "..."] or [],
  "follow_up_actions": ["...", "..."] or [],
  "call_summary": "...",
  "call_duration_estimate": "..." or null
}"""


def sanitize_filename(name: str) -> str:
    """Sanitizes a string for safe use as a filename."""
    if not name:
        return "Unknown"
    sanitized = re.sub(r'[<>:"/\\|?*]', '_', str(name)).strip()
    sanitized = re.sub(r'_+', '_', sanitized)  # Collapse multiple underscores
    return sanitized[:100]  # Limit length


def parse_json_response(text: str) -> dict:
    """Extracts and parses JSON from Gemini's response."""
    text = text.strip()

    # Try to find JSON object in the response
    match = re.search(r'\{.*\}', text, re.DOTALL)
    if match:
        return json.loads(match.group(0))

    # Fallback: try parsing the whole text
    return json.loads(text)


def get_file_datetime(file_path: Path) -> str:
    """Gets the file's modification datetime as a formatted string."""
    mtime = file_path.stat().st_mtime
    dt = datetime.fromtimestamp(mtime)
    return dt.strftime("%Y-%m-%d %H:%M")


def extract_recording_timestamp(file_path: Path) -> str:
    """
    Extracts the recording timestamp from file metadata.
    Falls back to modification time if metadata is missing.
    Returns: DDMMYYYY_HHMMSS
    """
    timestamp = None
    
    try:
        f = mutagen.File(str(file_path))
        if f:
            # Strategy 1: Common date/time tags
            # TDRC: Recording time (ID3v2.4)
            # TYER/TDAT/TIME: Older ID3
            # ©day: M4A/MP4 creation date
            
            tags = f.tags if hasattr(f, 'tags') else {}
            
            date_str = None
            
            if tags:
                # Try common keys
                keys_to_check = ['TDRC', '©day', 'date', 'creation_time']
                for key in keys_to_check:
                    if key in tags:
                        val = tags[key]
                        if isinstance(val, list):
                            date_str = str(val[0])
                        else:
                            date_str = str(val)
                        break
            
            if date_str:
                # Attempt to parse common formats
                # 2023-10-27T14:30:00, 2023-10-27, etc.
                formats = [
                    "%Y-%m-%dT%H:%M:%S%z", # ISO with timezone
                    "%Y-%m-%dT%H:%M:%SZ",  # ISO UTC
                    "%Y-%m-%dT%H:%M:%S",   # ISO simple
                    "%Y-%m-%d %H:%M",      # Simple date time
                    "%Y-%m-%d",            # Date only
                    "%Y",                  # Year only
                ]
                
                for fmt in formats:
                    try:
                        # Simple cleanup before parsing
                        clean_date = date_str.strip()
                        dt = datetime.strptime(clean_date, fmt)
                        # If we only got a date, combine with 00:00:00
                        timestamp = dt.strftime("%d-%m-%Y_%H-%M-%S")
                        break
                    except ValueError:
                        continue
                        
    except Exception as e:
        logger.debug(f"Metadata extraction failed for {file_path}: {e}")

    # Fallback to file system modification time
    if not timestamp:
        mtime = file_path.stat().st_mtime
        dt = datetime.fromtimestamp(mtime)
        timestamp = dt.strftime("%d-%m-%Y_%H-%M-%S")
        
    return timestamp


def transcribe_and_analyze(client: genai.Client, audio_path: Path, model_name: str) -> Optional[CallAnalysis]:
    """Uploads audio to Gemini, transcribes and analyzes the cold call."""
    logger.info(f"Uploading: {audio_path.name}")

    # Get file date as fallback
    file_datetime = get_file_datetime(audio_path)
    
    # Generate detailed timestamp for filename from metadata
    timestamp_prefix = extract_recording_timestamp(audio_path)

    try:
        uploaded_file = client.files.upload(file=str(audio_path))
    except Exception as e:
        logger.error(f"Upload failed: {e}")
        return None

    prompt = get_analysis_prompt()

    # Retry logic for rate limiting
    max_retries = 3
    for attempt in range(max_retries):
        try:
            logger.info(f"Analyzing with {model_name}...")
            response = client.models.generate_content(
                model=model_name,
                contents=[prompt, uploaded_file],
                config={'response_mime_type': 'application/json'}
            )
            break
        except Exception as e:
            error_str = str(e)
            if ("429" in error_str or "RESOURCE_EXHAUSTED" in error_str) and attempt < max_retries - 1:
                wait_time = 60 * (attempt + 1)
                logger.warning(f"Rate limited. Waiting {wait_time}s before retry {attempt + 2}/{max_retries}...")
                time.sleep(wait_time)
            else:
                logger.error(f"API error: {e}")
                return None
    else:
        logger.error("All retries exhausted")
        return None

    # Extract token usage from response
    input_tokens = None
    output_tokens = None
    total_tokens = None
    try:
        if hasattr(response, 'usage_metadata') and response.usage_metadata:
            usage = response.usage_metadata
            input_tokens = getattr(usage, 'prompt_token_count', None)
            output_tokens = getattr(usage, 'candidates_token_count', None)
            total_tokens = getattr(usage, 'total_token_count', None)
            logger.info(f"Tokens: {input_tokens} in / {output_tokens} out / {total_tokens} total")
    except Exception:
        pass  # Token info is optional

    # Parse response
    try:
        result = parse_json_response(response.text)
    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse JSON: {e}")
        logger.debug(f"Raw response: {response.text[:500]}")
        return None

    # Use file datetime as fallback if call_date not mentioned
    call_date_pkt = result.get('call_date_pkt')
    if not call_date_pkt:
        # Use our standard timestamp format
        call_date_pkt = timestamp_prefix

    return CallAnalysis(
        transcript=result.get('transcript', ''),
        caller_name=result.get('caller_name'),
        recipients=result.get('recipients'),
        owner_name=result.get('owner_name'),
        company_name=result.get('company_name'),
        company_location=result.get('company_location'),
        call_date_pkt=call_date_pkt, # Mapping pkt date to our internal call_date_pkt field
        call_outcome=result.get('call_outcome'),
        interest_level=result.get('interest_level'),
        objections=result.get('objections', []),
        pain_points=result.get('pain_points', []),
        follow_up_actions=result.get('follow_up_actions', []),
        call_summary=result.get('call_summary'),
        call_duration_estimate=result.get('call_duration_estimate'),
        timestamp=timestamp_prefix,
        model_used=model_name,
        input_tokens=input_tokens,
        output_tokens=output_tokens,
        total_tokens=total_tokens,
    )


def save_analysis(analysis: CallAnalysis, output_dir: Path, base_name: str, formats: list[str]) -> list[Path]:
    """Saves the analysis in specified formats. Returns list of saved file paths."""
    saved_files = []

    # Build filename from metadata
    parts = []
    
    # Add timestamp prefix if available
    if analysis.timestamp:
        parts.append(analysis.timestamp)
    
    if analysis.company_name:
        parts.append(sanitize_filename(analysis.company_name))
    
    # Use recipients for filename (who we actually talked to)
    if analysis.recipients:
        parts.append(sanitize_filename(analysis.recipients))
    
    if analysis.call_date_pkt:
        # Sanitize date further for filename
        date_part = sanitize_filename(analysis.call_date_pkt).replace(" ", "_").replace(":", "")
        parts.append(date_part)

    if parts:
        file_stem = "_".join(parts)
    else:
        file_stem = base_name

    # Save in each format
    if "json" in formats:
        json_path = output_dir / f"{file_stem}.json"
        with open(json_path, 'w', encoding='utf-8') as f:
            json.dump(asdict(analysis), f, indent=2, ensure_ascii=False)
        saved_files.append(json_path)

    if "txt" in formats:
        txt_path = output_dir / f"{file_stem}.txt"
        with open(txt_path, 'w', encoding='utf-8') as f:
            f.write(analysis.transcript)
        saved_files.append(txt_path)

    if "md" in formats:
        md_path = output_dir / f"{file_stem}.md"
        with open(md_path, 'w', encoding='utf-8') as f:
            f.write(format_markdown(analysis))
        saved_files.append(md_path)

    return saved_files


def format_markdown(analysis: CallAnalysis) -> str:
    """Formats the analysis as a readable Markdown document."""
    lines = ["# Cold Call Analysis\n"]

    # Metadata section
    lines.append("## Call Information\n")
    if analysis.caller_name:
        lines.append(f"- **Caller**: {analysis.caller_name}")
    if analysis.recipients:
        lines.append(f"- **Recipients**: {analysis.recipients}")
    if analysis.owner_name:
        lines.append(f"- **Owner/Target**: {analysis.owner_name}")
    if analysis.company_name:
        lines.append(f"- **Company**: {analysis.company_name}")
    if analysis.company_location:
        lines.append(f"- **Location**: {analysis.company_location}")
    if analysis.call_date_pkt:
        lines.append(f"- **Date (PKT)**: {analysis.call_date_pkt}")
    if analysis.call_duration_estimate:
        lines.append(f"- **Duration**: {analysis.call_duration_estimate}")
    if analysis.call_outcome:
        lines.append(f"- **Outcome**: {analysis.call_outcome.replace('_', ' ').title()}")
    if analysis.interest_level is not None:
        lines.append(f"- **Interest Level**: {analysis.interest_level}/10")
    lines.append("")

    # Processing info section
    lines.append("## Processing Info\n")
    if analysis.model_used:
        lines.append(f"- **Model**: {analysis.model_used}")
    if analysis.total_tokens is not None:
        token_info = f"- **Tokens**: {analysis.total_tokens:,} total"
        if analysis.input_tokens is not None and analysis.output_tokens is not None:
            token_info += f" ({analysis.input_tokens:,} input / {analysis.output_tokens:,} output)"
        lines.append(token_info)
    lines.append("")

    # Summary
    if analysis.call_summary:
        lines.append("## Summary\n")
        lines.append(analysis.call_summary)
        lines.append("")

    # Objections
    if analysis.objections:
        lines.append("## Objections Raised\n")
        for obj in analysis.objections:
            lines.append(f"- {obj}")
        lines.append("")

    # Pain points
    if analysis.pain_points:
        lines.append("## Pain Points Identified\n")
        for pain in analysis.pain_points:
            lines.append(f"- {pain}")
        lines.append("")

    # Follow-ups
    if analysis.follow_up_actions:
        lines.append("## Follow-Up Actions\n")
        for action in analysis.follow_up_actions:
            lines.append(f"- [ ] {action}")
        lines.append("")

    # Transcript
    lines.append("## Full Transcript\n")
    lines.append("```")
    lines.append(analysis.transcript)
    lines.append("```")

    return "\n".join(lines)


def generate_summary_report(results: list[tuple[str, CallAnalysis]], output_dir: Path) -> Path:
    """Generates a summary report of all processed calls."""
    report_path = output_dir / "SUMMARY_REPORT.md"

    lines = [
        f"# Cold Call Summary Report",
        f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M')}\n",
        f"Total Calls Processed: {len(results)}\n",
    ]

    # Statistics
    outcomes = {}
    total_interest = 0
    interest_count = 0
    all_objections = {}
    total_input_tokens = 0
    total_output_tokens = 0
    total_all_tokens = 0
    models_used = set()

    for _, analysis in results:
        outcome = analysis.call_outcome or "unknown"
        outcomes[outcome] = outcomes.get(outcome, 0) + 1

        if analysis.interest_level is not None:
            total_interest += analysis.interest_level
            interest_count += 1

        for obj in (analysis.objections or []):
            obj_lower = obj.lower()
            all_objections[obj_lower] = all_objections.get(obj_lower, 0) + 1

        # Track token usage
        if analysis.input_tokens:
            total_input_tokens += analysis.input_tokens
        if analysis.output_tokens:
            total_output_tokens += analysis.output_tokens
        if analysis.total_tokens:
            total_all_tokens += analysis.total_tokens
        if analysis.model_used:
            models_used.add(analysis.model_used)

    lines.append("## Outcome Breakdown\n")
    for outcome, count in sorted(outcomes.items(), key=lambda x: -x[1]):
        lines.append(f"- {outcome.replace('_', ' ').title()}: {count}")
    lines.append("")

    if interest_count > 0:
        avg_interest = total_interest / interest_count
        lines.append(f"## Average Interest Level: {avg_interest:.1f}/10\n")

    # Token usage summary
    if total_all_tokens > 0:
        lines.append("## Token Usage\n")
        lines.append(f"- **Total Tokens**: {total_all_tokens:,}")
        lines.append(f"- **Input Tokens**: {total_input_tokens:,}")
        lines.append(f"- **Output Tokens**: {total_output_tokens:,}")
        if models_used:
            lines.append(f"- **Model(s)**: {', '.join(sorted(models_used))}")
        lines.append("")

    if all_objections:
        lines.append("## Common Objections\n")
        for obj, count in sorted(all_objections.items(), key=lambda x: -x[1])[:10]:
            lines.append(f"- {obj}: {count}x")
        lines.append("")

    # Individual call summaries
    lines.append("## Call Details\n")
    for filename, analysis in results:
        company = analysis.company_name or "Unknown Company"
        outcome = (analysis.call_outcome or "unknown").replace('_', ' ').title()
        interest = f"{analysis.interest_level}/10" if analysis.interest_level else "N/A"

        lines.append(f"### {company}")
        lines.append(f"- **File**: {filename}")
        lines.append(f"- **Outcome**: {outcome} | **Interest**: {interest}")
        if analysis.call_summary:
            lines.append(f"- **Summary**: {analysis.call_summary}")
        if analysis.follow_up_actions:
            lines.append(f"- **Follow-up**: {', '.join(analysis.follow_up_actions[:2])}")
        lines.append("")

    with open(report_path, 'w', encoding='utf-8') as f:
        f.write("\n".join(lines))

    return report_path


def find_audio_files(path: Path) -> list[Path]:
    """Finds all audio files in a directory or returns single file."""
    if path.is_file():
        if path.suffix.lower() in AUDIO_EXTENSIONS:
            return [path]
        else:
            logger.warning(f"File {path} is not a supported audio format")
            return []

    if path.is_dir():
        files = []
        for ext in AUDIO_EXTENSIONS:
            files.extend(path.glob(f"*{ext}"))
            files.extend(path.glob(f"*{ext.upper()}"))
        return sorted(files)

    return []


def get_processed_files(output_dir: Path) -> set[str]:
    """Returns set of already processed file stems (for resume capability)."""
    processed = set()
    for json_file in output_dir.glob("*.json"):
        try:
            with open(json_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
                if 'source_file' in data:
                    processed.add(data['source_file'])
        except Exception:
            pass
    return processed


def main():
    parser = argparse.ArgumentParser(
        description="Transcribe and analyze cold call recordings using Google Gemini.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  %(prog)s call.mp3                    # Process single file
  %(prog)s recordings/                 # Process all audio in folder
  %(prog)s recordings/ -f json md      # Output as JSON and Markdown
  %(prog)s recordings/ -o transcripts/ # Custom output directory
  %(prog)s recordings/ --resume        # Skip already processed files
        """
    )

    parser.add_argument(
        "input",
        help="Audio file or directory containing audio files"
    )
    parser.add_argument(
        "-o", "--output",
        help="Output directory (default: ./transcripts)",
        default="transcripts"
    )
    parser.add_argument(
        "-f", "--formats",
        nargs="+",
        choices=["json", "txt", "md"],
        default=["json", "md"],
        help="Output formats (default: json md)"
    )
    parser.add_argument(
        "-m", "--model",
        default=os.getenv("GEMINI_MODEL", "gemini-2.5-flash"),
        help="Gemini model to use (default: gemini-2.5-flash)"
    )
    parser.add_argument(
        "--resume",
        action="store_true",
        help="Skip files that have already been processed"
    )
    parser.add_argument(
        "--no-summary",
        action="store_true",
        help="Skip generating summary report"
    )
    parser.add_argument(
        "-v", "--verbose",
        action="store_true",
        help="Enable verbose logging"
    )
    parser.add_argument(
        "--appwrite",
        action="store_true",
        help="Save transcripts to Appwrite database"
    )

    args = parser.parse_args()

    if args.verbose:
        logging.getLogger().setLevel(logging.DEBUG)

    # Validate input
    input_path = Path(args.input)
    if not input_path.exists():
        logger.error(f"Input not found: {input_path}")
        sys.exit(1)

    # Find audio files
    audio_files = find_audio_files(input_path)
    if not audio_files:
        logger.error("No audio files found")
        sys.exit(1)

    logger.info(f"Found {len(audio_files)} audio file(s)")

    # Setup output directory
    output_dir = Path(args.output)
    output_dir.mkdir(parents=True, exist_ok=True)

    # Check for already processed files
    processed_files = set()
    if args.resume:
        processed_files = get_processed_files(output_dir)
        if processed_files:
            logger.info(f"Resuming: {len(processed_files)} files already processed")

    # Initialize Gemini client
    try:
        client = genai.Client()
    except Exception as e:
        logger.error(f"Failed to initialize Gemini client: {e}")
        logger.error("Make sure GOOGLE_API_KEY is set in your environment or .env file")
        sys.exit(1)

    # Initialize Appwrite if enabled
    appwrite = None
    if args.appwrite:
        appwrite = init_appwrite()
        if appwrite:
            logger.info("Setting up Appwrite database...")
            if not appwrite.setup_database():
                logger.warning("Appwrite setup failed, continuing without database")
                appwrite = None
        else:
            logger.warning("Appwrite credentials not configured, skipping database")

    # Process files
    results = []
    for i, audio_file in enumerate(audio_files, 1):
        # Skip if already processed
        if audio_file.name in processed_files:
            logger.info(f"[{i}/{len(audio_files)}] Skipping (already processed): {audio_file.name}")
            continue

        logger.info(f"[{i}/{len(audio_files)}] Processing: {audio_file.name}")

        analysis = transcribe_and_analyze(client, audio_file, args.model)

        if analysis:
            # Add source file to analysis for resume tracking
            analysis_dict = asdict(analysis)
            analysis_dict['source_file'] = audio_file.name

            saved = save_analysis(analysis, output_dir, audio_file.stem, args.formats)

            # Update JSON with source file info
            for f in saved:
                if f.suffix == '.json':
                    with open(f, 'w', encoding='utf-8') as fp:
                        json.dump(analysis_dict, fp, indent=2, ensure_ascii=False)

            logger.info(f"  Saved: {', '.join(f.name for f in saved)}")
            logger.info(f"  Outcome: {analysis.call_outcome} | Interest: {analysis.interest_level}/10")

            # Save to Appwrite if enabled
            if appwrite:
                doc_id = appwrite.save_transcript(analysis)
                if doc_id:
                    logger.info(f"  Appwrite ID: {doc_id}")

            results.append((audio_file.name, analysis))
        else:
            logger.error(f"  Failed to process {audio_file.name}")

        # Small delay between files to avoid rate limiting
        if i < len(audio_files):
            time.sleep(2)

    # Generate summary report
    if results and not args.no_summary:
        report_path = generate_summary_report(results, output_dir)
        logger.info(f"\nSummary report: {report_path}")

    # Final summary
    logger.info(f"\nCompleted: {len(results)}/{len(audio_files)} files processed")
    logger.info(f"Output directory: {output_dir.absolute()}")


if __name__ == "__main__":
    main()
