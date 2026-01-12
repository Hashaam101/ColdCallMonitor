"""
Simple Audio Recorder

Records microphone, desktop audio, or both with a simple UI.
"""

import json
import os
import subprocess
import threading
import tkinter as tk
from tkinter import ttk, messagebox, filedialog
from datetime import datetime
from pathlib import Path
import numpy as np
import scipy.io.wavfile as wav

try:
    import sounddevice as sd
except ImportError:
    sd = None

try:
    import soundcard as sc
except ImportError:
    sc = None

try:
    import keyboard
except ImportError:
    keyboard = None


SAMPLE_RATE = 44100
CHUNK_SIZE = 1024
CONFIG_FILE = Path(__file__).parent / "config.json"
DEFAULT_HOTKEY = "alt+r"
DEFAULT_SAVE_DIR = str(Path(__file__).parent / "recordings")


def load_config() -> dict:
    """Load configuration from file."""
    try:
        if CONFIG_FILE.exists():
            with open(CONFIG_FILE, 'r') as f:
                return json.load(f)
    except Exception:
        pass
    return {
        "hotkey": DEFAULT_HOTKEY,
        "save_mode": "default",  # "default" (recordings folder), "ask" or "auto"
        "save_dir": DEFAULT_SAVE_DIR
    }


def save_config(config: dict):
    """Save configuration to file."""
    try:
        with open(CONFIG_FILE, 'w') as f:
            json.dump(config, f, indent=2)
    except Exception as e:
        print(f"Failed to save config: {e}")


class HotkeyDialog(tk.Toplevel):
    """Dialog for capturing a new hotkey."""

    def __init__(self, parent, current_hotkey: str):
        super().__init__(parent)
        self.title("Set Hotkey")
        self.geometry("350x180")
        self.resizable(False, False)
        self.transient(parent)
        self.grab_set()

        self.geometry(f"+{parent.winfo_x() + 50}+{parent.winfo_y() + 50}")

        self.result = None
        self.current_hotkey = current_hotkey
        self.captured_keys = []
        self.is_capturing = False

        main_frame = ttk.Frame(self, padding=20)
        main_frame.pack(fill=tk.BOTH, expand=True)

        ttk.Label(
            main_frame,
            text="Press your desired key combination:",
            font=("Arial", 10)
        ).pack(pady=(0, 15))

        # Current hotkey display
        self.hotkey_var = tk.StringVar(value=current_hotkey.upper())
        self.hotkey_label = ttk.Label(
            main_frame,
            textvariable=self.hotkey_var,
            font=("Consolas", 14, "bold"),
            foreground="#007acc"
        )
        self.hotkey_label.pack(pady=10)

        # Capture button
        self.capture_btn = ttk.Button(
            main_frame,
            text="Click to Capture Hotkey",
            command=self.start_capture
        )
        self.capture_btn.pack(pady=10)

        # Buttons frame
        btn_frame = ttk.Frame(main_frame)
        btn_frame.pack(fill=tk.X, pady=(15, 0))

        ttk.Button(
            btn_frame, text="Save",
            command=self.save
        ).pack(side=tk.RIGHT, padx=(5, 0))

        ttk.Button(
            btn_frame, text="Cancel",
            command=self.cancel
        ).pack(side=tk.RIGHT)

        ttk.Button(
            btn_frame, text="Reset Default",
            command=self.reset_default
        ).pack(side=tk.LEFT)

    def start_capture(self):
        """Start capturing keyboard input."""
        if keyboard is None:
            messagebox.showerror("Error", "Keyboard library not installed.\nRun: pip install keyboard")
            return

        self.is_capturing = True
        self.captured_keys = []
        self.hotkey_var.set("Press keys...")
        self.capture_btn.config(text="Listening...", state="disabled")

        # Use keyboard library to capture the hotkey
        def on_key(event):
            if not self.is_capturing:
                return

            # Build the hotkey string
            hotkey = keyboard.read_hotkey(suppress=False)
            self.is_capturing = False

            # Update UI from main thread
            self.after(100, lambda: self.finish_capture(hotkey))

        # Start listening in a thread
        threading.Thread(target=on_key, args=(None,), daemon=True).start()

    def finish_capture(self, hotkey: str):
        """Finish capturing and display the result."""
        self.hotkey_var.set(hotkey.upper())
        self.capture_btn.config(text="Click to Capture Hotkey", state="normal")
        self.current_hotkey = hotkey

    def reset_default(self):
        """Reset to default hotkey."""
        self.current_hotkey = DEFAULT_HOTKEY
        self.hotkey_var.set(DEFAULT_HOTKEY.upper())

    def save(self):
        """Save and close."""
        self.result = self.current_hotkey
        self.destroy()

    def cancel(self):
        """Cancel and close."""
        self.result = None
        self.destroy()


class TroubleshootDialog(tk.Toplevel):
    """Dialog to help troubleshoot audio issues."""

    def __init__(self, parent):
        super().__init__(parent)
        self.title("Audio Troubleshooter")
        self.geometry("450x420")
        self.resizable(False, False)
        self.transient(parent)
        self.grab_set()

        self.geometry(f"+{parent.winfo_x() + 50}+{parent.winfo_y() + 50}")

        main_frame = ttk.Frame(self, padding=20)
        main_frame.pack(fill=tk.BOTH, expand=True)

        ttk.Label(
            main_frame,
            text="Desktop Audio Not Working?",
            font=("Arial", 14, "bold")
        ).pack(anchor=tk.W, pady=(0, 15))

        # Instructions
        instructions = ttk.LabelFrame(main_frame, text="Enable Stereo Mix (Required):", padding=10)
        instructions.pack(fill=tk.X, pady=(0, 15))

        steps = (
            "1. Click 'Open Sound Control Panel' below\n"
            "2. Go to the 'Recording' tab\n"
            "3. Right-click in empty space\n"
            "4. Check 'Show Disabled Devices'\n"
            "5. Right-click 'Stereo Mix' → 'Enable'\n"
            "6. Right-click 'Stereo Mix' → 'Set as Default Device'\n"
            "7. Close this dialog and try recording again"
        )
        ttk.Label(instructions, text=steps, justify=tk.LEFT).pack(anchor=tk.W)

        # Action buttons
        actions_frame = ttk.LabelFrame(main_frame, text="Quick Actions:", padding=10)
        actions_frame.pack(fill=tk.X, pady=(0, 15))

        ttk.Button(
            actions_frame,
            text="Open Sound Control Panel",
            command=self.open_sound_control_panel
        ).pack(fill=tk.X, pady=2)

        ttk.Button(
            actions_frame,
            text="Open Sound Settings",
            command=self.open_sound_settings
        ).pack(fill=tk.X, pady=2)

        ttk.Button(
            actions_frame,
            text="Open Privacy Settings",
            command=self.open_privacy_settings
        ).pack(fill=tk.X, pady=2)

        # Note
        note_frame = ttk.LabelFrame(main_frame, text="Note:", padding=10)
        note_frame.pack(fill=tk.X, pady=(0, 15))

        note_text = (
            "Some sound cards don't have Stereo Mix.\n"
            "If you don't see it, check your audio driver settings\n"
            "or try 'What U Hear' / 'Loopback' device."
        )
        ttk.Label(note_frame, text=note_text, foreground="gray").pack(anchor=tk.W)

        ttk.Button(main_frame, text="Close", command=self.destroy).pack(pady=(10, 0))

    def open_sound_settings(self):
        try:
            os.startfile("ms-settings:sound")
        except Exception:
            messagebox.showerror("Error", "Could not open Sound Settings.")

    def open_sound_control_panel(self):
        try:
            subprocess.run(["rundll32.exe", "shell32.dll,Control_RunDLL", "mmsys.cpl,,1"], check=False)
        except Exception:
            messagebox.showerror("Error", "Could not open Sound Control Panel.")

    def open_privacy_settings(self):
        try:
            os.startfile("ms-settings:privacy-microphone")
        except Exception:
            messagebox.showerror("Error", "Could not open Privacy Settings.")


class SaveApproveDialog(tk.Toplevel):
    """Dialog for saving or approving a recording with optional phone number."""

    def __init__(self, parent):
        super().__init__(parent)
        self.title("Save Recording")
        self.geometry("350x200")
        self.resizable(False, False)
        self.transient(parent)
        self.grab_set()

        # Result: "approve", "save", or None (cancelled)
        self.result = None
        self.phone_number = ""

        # Center on parent
        self.update_idletasks()
        x = parent.winfo_x() + (parent.winfo_width() - 350) // 2
        y = parent.winfo_y() + (parent.winfo_height() - 200) // 2
        self.geometry(f"+{x}+{y}")

        # Main frame
        main_frame = ttk.Frame(self, padding=20)
        main_frame.pack(fill=tk.BOTH, expand=True)

        ttk.Label(
            main_frame, text="Save Recording",
            font=("Arial", 14, "bold")
        ).pack(pady=(0, 15))

        # Phone number input
        phone_frame = ttk.Frame(main_frame)
        phone_frame.pack(fill=tk.X, pady=(0, 15))

        ttk.Label(phone_frame, text="Phone Number (optional):").pack(anchor=tk.W)
        self.phone_var = tk.StringVar()
        self.phone_entry = ttk.Entry(phone_frame, textvariable=self.phone_var, width=35)
        self.phone_entry.pack(fill=tk.X, pady=(5, 0))
        self.phone_entry.focus()

        # Info label
        ttk.Label(
            main_frame,
            text="Approve (Y) = Save to Approved folder\nSave (N) = Save to regular folder",
            font=("Arial", 9),
            foreground="gray"
        ).pack(pady=(0, 15))

        # Buttons frame
        btn_frame = ttk.Frame(main_frame)
        btn_frame.pack(fill=tk.X)

        self.approve_btn = ttk.Button(
            btn_frame, text="Yes - Approve (Y)",
            command=self.approve,
            style="Accent.TButton"
        )
        self.approve_btn.pack(side=tk.LEFT, expand=True, fill=tk.X, padx=(0, 5))

        self.save_btn = ttk.Button(
            btn_frame, text="No - Save (N)",
            command=self.save
        )
        self.save_btn.pack(side=tk.LEFT, expand=True, fill=tk.X, padx=(5, 0))

        # Bind keyboard shortcuts
        self.bind("<y>", lambda e: self.approve())
        self.bind("<Y>", lambda e: self.approve())
        self.bind("<n>", lambda e: self.save())
        self.bind("<N>", lambda e: self.save())
        self.bind("<Escape>", lambda e: self.cancel())
        self.bind("<Return>", lambda e: self.approve())

        # Handle window close
        self.protocol("WM_DELETE_WINDOW", self.cancel)

    def approve(self):
        """Approve and save to Approved folder."""
        self.result = "approve"
        self.phone_number = self.phone_var.get().strip()
        self.destroy()

    def save(self):
        """Save to regular recordings folder."""
        self.result = "save"
        self.phone_number = self.phone_var.get().strip()
        self.destroy()

    def cancel(self):
        """Cancel without saving."""
        self.result = None
        self.destroy()

class RecordingOverlay(tk.Toplevel):
    """Small always-on-top overlay showing recording status with audio levels."""

    def __init__(self, parent, recorder=None):
        super().__init__(parent)
        self.parent = parent
        self.recorder = recorder
        self.phone_number = ""  # Store phone number entered during recording

        self.overrideredirect(True)
        self.attributes("-topmost", True)
        self.attributes("-alpha", 0.95)

        screen_width = self.winfo_screenwidth()
        self.geometry(f"220x115+{screen_width - 240}+20")  # Increased height for button
        self.configure(bg="#1a1a2e")

        # Main container
        main_frame = tk.Frame(self, bg="#1a1a2e")
        main_frame.pack(fill=tk.BOTH, expand=True, padx=10, pady=8)

        # Top row: recording indicator and timer
        top_frame = tk.Frame(main_frame, bg="#1a1a2e")
        top_frame.pack(fill=tk.X)

        self.dot_label = tk.Label(
            top_frame, text="\u25cf", font=("Arial", 14),
            fg="#ff4757", bg="#1a1a2e"
        )
        self.dot_label.pack(side=tk.LEFT)

        self.text_label = tk.Label(
            top_frame, text="REC", font=("Arial", 10, "bold"),
            fg="white", bg="#1a1a2e"
        )
        self.text_label.pack(side=tk.LEFT, padx=(3, 0))

        self.time_label = tk.Label(
            top_frame, text="00:00", font=("Consolas", 11, "bold"),
            fg="#00d4ff", bg="#1a1a2e"
        )
        self.time_label.pack(side=tk.RIGHT)

        # Audio levels frame
        levels_frame = tk.Frame(main_frame, bg="#1a1a2e")
        levels_frame.pack(fill=tk.X, pady=(8, 0))

        # Mic level
        mic_row = tk.Frame(levels_frame, bg="#1a1a2e")
        mic_row.pack(fill=tk.X, pady=2)

        tk.Label(
            mic_row, text="MIC", font=("Arial", 7),
            fg="#888", bg="#1a1a2e", width=4, anchor="w"
        ).pack(side=tk.LEFT)

        self.mic_canvas = tk.Canvas(
            mic_row, width=160, height=12,
            bg="#2d2d44", highlightthickness=0
        )
        self.mic_canvas.pack(side=tk.LEFT, padx=(5, 0))
        self.mic_bar = self.mic_canvas.create_rectangle(0, 0, 0, 12, fill="#00ff88", width=0)

        # Desktop level
        desk_row = tk.Frame(levels_frame, bg="#1a1a2e")
        desk_row.pack(fill=tk.X, pady=2)

        tk.Label(
            desk_row, text="SYS", font=("Arial", 7),
            fg="#888", bg="#1a1a2e", width=4, anchor="w"
        ).pack(side=tk.LEFT)

        self.desk_canvas = tk.Canvas(
            desk_row, width=160, height=12,
            bg="#2d2d44", highlightthickness=0
        )
        self.desk_canvas.pack(side=tk.LEFT, padx=(5, 0))
        self.desk_bar = self.desk_canvas.create_rectangle(0, 0, 0, 12, fill="#00d4ff", width=0)

        # Add Phone button
        self.phone_btn = tk.Button(
            main_frame, text="+ Add Phone",
            font=("Arial", 8), fg="white", bg="#2d2d44",
            activebackground="#3d3d55", activeforeground="white",
            relief=tk.FLAT, cursor="hand2",
            command=self._add_phone
        )
        self.phone_btn.pack(fill=tk.X, pady=(6, 0))

        self.is_blinking = True
        self.is_running = True
        self.start_time = None
        self.mic_level = 0
        self.desk_level = 0

        self.blink()
        self.update_levels()

    def _add_phone(self):
        """Prompt user to enter phone number during recording."""
        from tkinter import simpledialog
        phone = simpledialog.askstring(
            "Phone Number",
            "Enter phone number (optional):",
            parent=self,
            initialvalue=self.phone_number
        )
        if phone is not None:
            self.phone_number = phone.strip()
            if self.phone_number:
                self.phone_btn.config(text=f"Phone: {self.phone_number[:15]}...")
            else:
                self.phone_btn.config(text="+ Add Phone")

    def blink(self):
        if not self.is_blinking:
            return
        current = self.dot_label.cget("fg")
        self.dot_label.config(fg="#1a1a2e" if current == "#ff4757" else "#ff4757")
        self.after(500, self.blink)

    def start_timer(self):
        self.start_time = datetime.now()
        self.update_timer()

    def update_timer(self):
        if self.start_time is None:
            return
        elapsed = datetime.now() - self.start_time
        mins, secs = divmod(int(elapsed.total_seconds()), 60)
        self.time_label.config(text=f"{mins:02d}:{secs:02d}")
        self.after(1000, self.update_timer)

    def update_levels(self):
        """Update audio level bars from recorder data."""
        if not self.is_running:
            return

        if self.recorder:
            # Get recent audio levels
            with self.recorder.lock:
                if self.recorder.mic_data and len(self.recorder.mic_data) > 0:
                    recent_mic = self.recorder.mic_data[-1] if self.recorder.mic_data else np.array([0])
                    self.mic_level = min(1.0, np.abs(recent_mic).max() * 3)
                else:
                    self.mic_level *= 0.8  # Decay

                if self.recorder.desktop_data and len(self.recorder.desktop_data) > 0:
                    recent_desk = self.recorder.desktop_data[-1] if self.recorder.desktop_data else np.array([0])
                    self.desk_level = min(1.0, np.abs(recent_desk).max() * 3)
                else:
                    self.desk_level *= 0.8  # Decay

        # Update mic bar
        mic_width = int(self.mic_level * 160)
        color = self._get_level_color(self.mic_level)
        self.mic_canvas.coords(self.mic_bar, 0, 0, mic_width, 12)
        self.mic_canvas.itemconfig(self.mic_bar, fill=color)

        # Update desktop bar
        desk_width = int(self.desk_level * 160)
        color = self._get_level_color(self.desk_level)
        self.desk_canvas.coords(self.desk_bar, 0, 0, desk_width, 12)
        self.desk_canvas.itemconfig(self.desk_bar, fill=color)

        self.after(50, self.update_levels)

    def _get_level_color(self, level: float) -> str:
        """Get color based on level (green -> yellow -> red)."""
        if level < 0.5:
            return "#00ff88"  # Green
        elif level < 0.8:
            return "#ffcc00"  # Yellow
        else:
            return "#ff4757"  # Red

    def stop(self):
        self.is_blinking = False
        self.is_running = False
        self.start_time = None
        self.destroy()


class AudioRecorder:
    """Handles audio recording from different sources."""

    def __init__(self):
        self.is_recording = False
        self.mic_data = []
        self.desktop_data = []
        self.mic_thread = None
        self.desktop_thread = None
        self.lock = threading.Lock()

    def get_input_devices(self) -> list[tuple[int, str, bool]]:
        """Get all input devices. Returns (index, name, is_loopback)."""
        if sd is None:
            return []
        devices = []
        try:
            for i, d in enumerate(sd.query_devices()):
                if d['max_input_channels'] > 0:
                    name = d['name']
                    # Skip Windows virtual mappers - they route to default device
                    if 'sound mapper' in name.lower() or 'primary' in name.lower():
                        continue
                    # Check if it's a loopback device
                    is_loopback = any(kw in name.lower() for kw in
                        ['stereo mix', 'what u hear', 'loopback', 'wave out', 'output', 'mixage'])
                    devices.append((i, name, is_loopback))
        except Exception as e:
            print(f"Error getting devices: {e}")
        return devices

    def get_microphones(self) -> list[tuple[int, str]]:
        """Get microphone devices (non-loopback inputs)."""
        mics = [(i, name) for i, name, is_loopback in self.get_input_devices() if not is_loopback]
        # Prioritize actual microphones by keywords
        priority_keywords = ['microphone', 'mic', 'headset', 'webcam', 'usb', 'realtek', 'input']
        mics.sort(key=lambda x: (
            0 if any(kw in x[1].lower() for kw in priority_keywords) else 1,
            x[0]
        ))
        return mics

    def get_loopback_devices(self) -> list[tuple[int, str]]:
        """Get loopback devices (Stereo Mix, etc.)."""
        return [(i, name) for i, name, is_loopback in self.get_input_devices() if is_loopback]

    def get_default_mic(self) -> int | None:
        """Get the best microphone (not loopback)."""
        mics = self.get_microphones()
        if not mics:
            return None

        # Try to find a real microphone first
        for i, name in mics:
            name_lower = name.lower()
            if any(kw in name_lower for kw in ['microphone', 'mic', 'headset']):
                return i

        # Fall back to first non-loopback device
        return mics[0][0]

    def get_default_loopback(self) -> int | None:
        """Get the first available loopback device."""
        loopbacks = self.get_loopback_devices()
        return loopbacks[0][0] if loopbacks else None

    def _record_device(self, device_id: int, data_list: list, name: str):
        """Record from a device."""
        try:
            device_info = sd.query_devices(device_id)
            channels = min(device_info['max_input_channels'], 2)

            with sd.InputStream(
                device=device_id,
                samplerate=SAMPLE_RATE,
                channels=channels,
                dtype='float32',
                blocksize=CHUNK_SIZE
            ) as stream:
                print(f"Recording from: {name} (channels: {channels})")
                while self.is_recording:
                    data, _ = stream.read(CHUNK_SIZE)
                    # Convert to mono if stereo
                    if channels == 2:
                        mono = data.mean(axis=1)
                    else:
                        mono = data.flatten()
                    with self.lock:
                        data_list.append(mono.copy())
        except Exception as e:
            print(f"Recording error ({name}): {e}")

    def start(self, mode: str, mic_device: int = None, desktop_device: int = None):
        """Start recording."""
        self.is_recording = True
        self.mic_data = []
        self.desktop_data = []

        # Get defaults if not specified
        if mic_device is None:
            mic_device = self.get_default_mic()
        if desktop_device is None:
            desktop_device = self.get_default_loopback()

        # Debug: show what we're using
        print(f"\n=== Recording Started ===")
        print(f"Mode: {mode}")
        if mic_device is not None:
            try:
                mic_info = sd.query_devices(mic_device)
                print(f"Mic device: [{mic_device}] {mic_info['name']}")
            except:
                print(f"Mic device: [{mic_device}] (unknown)")
        if desktop_device is not None:
            try:
                desk_info = sd.query_devices(desktop_device)
                print(f"Desktop device: [{desktop_device}] {desk_info['name']}")
            except:
                print(f"Desktop device: [{desktop_device}] (unknown)")
        print("=========================\n")

        # Start mic recording
        if mode in ("mic", "both") and mic_device is not None:
            self.mic_thread = threading.Thread(
                target=self._record_device,
                args=(mic_device, self.mic_data, "Microphone"),
                daemon=True
            )
            self.mic_thread.start()
        elif mode in ("mic", "both"):
            print("WARNING: No microphone device found!")

        # Start desktop recording
        if mode in ("desktop", "both"):
            if desktop_device is not None:
                self.desktop_thread = threading.Thread(
                    target=self._record_device,
                    args=(desktop_device, self.desktop_data, "Desktop Audio"),
                    daemon=True
                )
                self.desktop_thread.start()
            else:
                print("WARNING: No loopback device found! Enable Stereo Mix in Sound settings.")

    def stop(self) -> np.ndarray:
        """Stop recording and return audio data."""
        self.is_recording = False

        if self.mic_thread:
            self.mic_thread.join(timeout=2)
        if self.desktop_thread:
            self.desktop_thread.join(timeout=2)

        mic_audio = None
        desktop_audio = None

        with self.lock:
            if self.mic_data:
                mic_audio = np.concatenate(self.mic_data)
            if self.desktop_data:
                desktop_audio = np.concatenate(self.desktop_data)

        # Debug: show what we captured
        print(f"\n=== Recording Stopped ===")
        print(f"Mic chunks: {len(self.mic_data)}, samples: {len(mic_audio) if mic_audio is not None else 0}")
        print(f"Desktop chunks: {len(self.desktop_data)}, samples: {len(desktop_audio) if desktop_audio is not None else 0}")
        if mic_audio is not None:
            print(f"Mic audio level: min={mic_audio.min():.4f}, max={mic_audio.max():.4f}")
        if desktop_audio is not None:
            print(f"Desktop audio level: min={desktop_audio.min():.4f}, max={desktop_audio.max():.4f}")
        print("=========================\n")

        # Combine audio
        if mic_audio is not None and desktop_audio is not None:
            min_len = min(len(mic_audio), len(desktop_audio))
            if min_len > 0:
                combined = (mic_audio[:min_len] * 0.5) + (desktop_audio[:min_len] * 0.5)
                max_val = np.abs(combined).max()
                if max_val > 0:
                    combined = combined / max_val * 0.95
                return combined
        elif mic_audio is not None:
            return mic_audio
        elif desktop_audio is not None:
            return desktop_audio

        return np.array([])

    def save(self, filepath: str, audio: np.ndarray) -> bool:
        """Save audio to WAV file."""
        if len(audio) == 0:
            return False
        audio = np.clip(audio, -1, 1)
        audio_int16 = (audio * 32767).astype(np.int16)
        wav.write(filepath, SAMPLE_RATE, audio_int16)
        return True


class RecorderApp:
    """Main application window."""

    def __init__(self):
        self.root = tk.Tk()
        self.root.title("Audio Recorder")
        self.root.geometry("450x520")
        self.root.resizable(False, True)
        self.root.minsize(450, 400)

        self.recorder = AudioRecorder()
        self.overlay = None
        self.is_recording = False

        self._mics = []
        self._loopbacks = []
        self._selected_mic = None
        self._selected_desktop = None

        # Load config
        self.config = load_config()
        self.hotkey = self.config.get("hotkey", DEFAULT_HOTKEY)
        self.hotkey_registered = False

        self.setup_ui()
        self._load_devices()
        self._check_loopback()
        self._register_hotkey()

        # Handle window close
        self.root.protocol("WM_DELETE_WINDOW", self._on_close)

    def _load_devices(self):
        self._mics = self.recorder.get_microphones()
        self._loopbacks = self.recorder.get_loopback_devices()

    def _check_loopback(self):
        """Check if loopback device is available and warn if not."""
        if not self._loopbacks:
            self.status_label.config(
                text="Warning: No desktop audio device found!",
                foreground="orange"
            )

    def _create_scrollable_frame(self, parent):
        """Create a scrollable frame with canvas and scrollbar."""
        # Create canvas and scrollbar
        canvas = tk.Canvas(parent, highlightthickness=0)
        scrollbar = ttk.Scrollbar(parent, orient="vertical", command=canvas.yview)
        scrollable_frame = ttk.Frame(canvas, padding=20)

        # Configure scrolling
        scrollable_frame.bind(
            "<Configure>",
            lambda e: canvas.configure(scrollregion=canvas.bbox("all"))
        )

        # Create window in canvas
        canvas_frame = canvas.create_window((0, 0), window=scrollable_frame, anchor="nw")

        # Make frame fill canvas width
        def configure_canvas_width(event):
            canvas.itemconfig(canvas_frame, width=event.width)
        canvas.bind("<Configure>", configure_canvas_width)

        canvas.configure(yscrollcommand=scrollbar.set)

        # Enable mousewheel scrolling
        def on_mousewheel(event):
            canvas.yview_scroll(int(-1 * (event.delta / 120)), "units")

        canvas.bind_all("<MouseWheel>", on_mousewheel)

        # Pack scrollbar and canvas
        scrollbar.pack(side="right", fill="y")
        canvas.pack(side="left", fill="both", expand=True)

        return scrollable_frame

    def setup_ui(self):
        # Create scrollable main frame
        main_frame = self._create_scrollable_frame(self.root)

        ttk.Label(
            main_frame, text="Audio Recorder",
            font=("Arial", 16, "bold")
        ).pack(pady=(0, 20))

        # Recording mode
        mode_frame = ttk.LabelFrame(main_frame, text="Recording Source", padding=10)
        mode_frame.pack(fill=tk.X, pady=(0, 15))

        self.mode_var = tk.StringVar(value="both")

        for text, value in [
            ("Microphone Only", "mic"),
            ("Desktop Audio Only", "desktop"),
            ("Both (Mic + Desktop)", "both")
        ]:
            ttk.Radiobutton(
                mode_frame, text=text,
                variable=self.mode_var, value=value
            ).pack(anchor=tk.W, pady=2)

        # Save Location Settings (moved from Advanced)
        save_frame = ttk.LabelFrame(main_frame, text="Save Location", padding=10)
        save_frame.pack(fill=tk.X, pady=(0, 15))

        self._setup_save_location(save_frame)

        # Advanced Settings (device selection only)
        self.advanced_frame = ttk.LabelFrame(main_frame, text="Advanced Settings", padding=10)
        self.advanced_visible = False

        self.toggle_btn = ttk.Button(
            main_frame, text="Show Advanced Settings",
            command=self.toggle_advanced
        )
        self.toggle_btn.pack(anchor=tk.W, pady=(0, 10))

        self._setup_advanced()

        # Record button
        self.record_btn = ttk.Button(
            main_frame, text="Start Recording",
            command=self.toggle_recording
        )
        self.record_btn.pack(fill=tk.X, pady=(10, 0), ipady=10)

        # Status
        self.status_label = ttk.Label(
            main_frame, text="Ready",
            font=("Arial", 9), foreground="gray"
        )
        self.status_label.pack(pady=(10, 0))

        # Hotkey frame
        hotkey_frame = ttk.Frame(main_frame)
        hotkey_frame.pack(fill=tk.X, pady=(10, 0))

        ttk.Label(
            hotkey_frame, text="Hotkey:",
            font=("Arial", 9)
        ).pack(side=tk.LEFT)

        self.hotkey_label = ttk.Label(
            hotkey_frame, text=self.hotkey.upper(),
            font=("Consolas", 9, "bold"),
            foreground="#007acc"
        )
        self.hotkey_label.pack(side=tk.LEFT, padx=(5, 0))

        ttk.Button(
            hotkey_frame, text="Change",
            command=self.configure_hotkey,
            style="Small.TButton"
        ).pack(side=tk.RIGHT)

        # Troubleshoot link
        troubleshoot_btn = ttk.Button(
            main_frame, text="Desktop audio not working? Click here",
            command=self.show_troubleshoot,
            style="Link.TButton"
        )
        troubleshoot_btn.pack(pady=(8, 0))

        style = ttk.Style()
        style.configure("TButton", font=("Arial", 10))
        style.configure("Small.TButton", font=("Arial", 8))
        style.configure("Link.TButton", font=("Arial", 9, "underline"))

    def _setup_save_location(self, parent_frame):
        """Setup save location settings in the given frame."""
        # Save mode radio buttons - default to 'default' (Recordings folder)
        current_mode = self.config.get("save_mode", "default")
        self.save_mode_var = tk.StringVar(value=current_mode)

        ttk.Radiobutton(
            parent_frame, text="Ask where to save every time",
            variable=self.save_mode_var, value="ask",
            command=self._on_save_mode_change
        ).pack(anchor=tk.W, pady=2)

        ttk.Radiobutton(
            parent_frame, text="Save in Recordings folder (default)",
            variable=self.save_mode_var, value="default",
            command=self._on_save_mode_change
        ).pack(anchor=tk.W, pady=2)

        ttk.Radiobutton(
            parent_frame, text="Auto-save to custom folder:",
            variable=self.save_mode_var, value="auto",
            command=self._on_save_mode_change
        ).pack(anchor=tk.W, pady=2)

        # Save directory selection (only for custom folder)
        save_dir_frame = ttk.Frame(parent_frame)
        save_dir_frame.pack(fill=tk.X, pady=(5, 0))

        self.save_dir_var = tk.StringVar(value=self.config.get("save_dir", DEFAULT_SAVE_DIR))
        self.save_dir_entry = ttk.Entry(
            save_dir_frame, textvariable=self.save_dir_var,
            state="readonly", width=40
        )
        self.save_dir_entry.pack(side=tk.LEFT, fill=tk.X, expand=True)

        self.browse_btn = ttk.Button(
            save_dir_frame, text="Browse...",
            command=self._browse_save_dir
        )
        self.browse_btn.pack(side=tk.RIGHT, padx=(5, 0))

        # Update browse button state
        self._update_save_dir_state()

    def _setup_advanced(self):
        # Device selection only (save settings moved to main UI)
        ttk.Label(self.advanced_frame, text="Microphone:").pack(anchor=tk.W)
        self.mic_var = tk.StringVar()
        self.mic_combo = ttk.Combobox(
            self.advanced_frame, textvariable=self.mic_var,
            state="readonly", width=50
        )
        self.mic_combo.pack(fill=tk.X, pady=(2, 10))
        self.mic_combo.bind("<<ComboboxSelected>>", self._on_mic_change)

        ttk.Label(self.advanced_frame, text="Desktop Audio (Stereo Mix):").pack(anchor=tk.W)
        self.desktop_var = tk.StringVar()
        self.desktop_combo = ttk.Combobox(
            self.advanced_frame, textvariable=self.desktop_var,
            state="readonly", width=50
        )
        self.desktop_combo.pack(fill=tk.X, pady=(2, 10))
        self.desktop_combo.bind("<<ComboboxSelected>>", self._on_desktop_change)

        ttk.Button(
            self.advanced_frame, text="Refresh Devices",
            command=self._refresh_combos
        ).pack(anchor=tk.E, pady=(5, 0))

    def _refresh_combos(self):
        self._load_devices()

        # Mics
        mic_opts = ["Default Microphone"]
        mic_opts.extend([name for _, name in self._mics])
        self.mic_combo["values"] = mic_opts
        self.mic_combo.current(0)

        # Desktop/Loopback
        if self._loopbacks:
            desktop_opts = [name for _, name in self._loopbacks]
            self.desktop_combo["values"] = desktop_opts
            self.desktop_combo.current(0)
            self._selected_desktop = self._loopbacks[0][0]
        else:
            self.desktop_combo["values"] = ["No loopback device found - Enable Stereo Mix"]
            self.desktop_combo.current(0)
            self._selected_desktop = None

        self._check_loopback()

    def _on_mic_change(self, event=None):
        idx = self.mic_combo.current()
        if idx == 0:
            self._selected_mic = None
        else:
            self._selected_mic = self._mics[idx - 1][0]

    def _on_desktop_change(self, event=None):
        idx = self.desktop_combo.current()
        if self._loopbacks and idx < len(self._loopbacks):
            self._selected_desktop = self._loopbacks[idx][0]
        else:
            self._selected_desktop = None

    def _on_save_mode_change(self):
        """Handle save mode radio button change."""
        self.config["save_mode"] = self.save_mode_var.get()
        save_config(self.config)
        self._update_save_dir_state()

    def _update_save_dir_state(self):
        """Enable/disable folder selection based on save mode."""
        if self.save_mode_var.get() == "auto":
            self.browse_btn.config(state="normal")
        else:
            self.browse_btn.config(state="disabled")

    def _browse_save_dir(self):
        """Open folder browser to select save directory."""
        current_dir = self.save_dir_var.get()
        if not Path(current_dir).exists():
            current_dir = str(Path.home())

        folder = filedialog.askdirectory(
            initialdir=current_dir,
            title="Select folder for recordings"
        )

        if folder:
            self.save_dir_var.set(folder)
            self.config["save_dir"] = folder
            save_config(self.config)

    def show_troubleshoot(self):
        TroubleshootDialog(self.root)

    def _register_hotkey(self):
        """Register the global hotkey."""
        if keyboard is None:
            print("Keyboard library not available - hotkeys disabled")
            return

        try:
            # Always unregister first before re-registering
            keyboard.unhook_all_hotkeys()
            self.hotkey_registered = False

            keyboard.add_hotkey(self.hotkey, self._on_hotkey, suppress=False)
            self.hotkey_registered = True
            print(f"Hotkey registered: {self.hotkey}")
        except Exception as e:
            print(f"Failed to register hotkey: {e}")
            self.hotkey_registered = False

    def _unregister_hotkey(self):
        """Unregister the global hotkey."""
        if keyboard is None:
            return
        try:
            keyboard.unhook_all_hotkeys()
            self.hotkey_registered = False
        except Exception:
            pass

    def _on_hotkey(self):
        """Handle hotkey press."""
        # Use after() to run in main thread
        self.root.after(0, self.toggle_recording)

    def configure_hotkey(self):
        """Open hotkey configuration dialog."""
        dialog = HotkeyDialog(self.root, self.hotkey)
        self.root.wait_window(dialog)

        if dialog.result:
            self._unregister_hotkey()
            self.hotkey = dialog.result
            self.hotkey_label.config(text=self.hotkey.upper())
            self.config["hotkey"] = self.hotkey
            save_config(self.config)
            self._register_hotkey()

    def _on_close(self):
        """Handle window close."""
        self._unregister_hotkey()
        if self.is_recording:
            self.recorder.stop()
        self.root.destroy()

    def toggle_advanced(self):
        if self.advanced_visible:
            self.advanced_frame.pack_forget()
            self.toggle_btn.config(text="Show Advanced Settings")
            self.root.geometry("450x520")
            self.advanced_visible = False
        else:
            self.toggle_btn.pack_forget()
            self.advanced_frame.pack(fill=tk.X, pady=(0, 10))
            self.toggle_btn.pack(anchor=tk.W, pady=(0, 10))

            self.toggle_btn.config(text="Hide Advanced Settings")
            self.root.geometry("450x650")
            self.advanced_visible = True
            self._refresh_combos()

    def toggle_recording(self):
        if not self.is_recording:
            self.start_recording()
        else:
            self.stop_recording()

    def start_recording(self):
        mode = self.mode_var.get()

        # Warn if no loopback for desktop modes
        if mode in ("desktop", "both") and not self._loopbacks and self._selected_desktop is None:
            result = messagebox.askokcancel(
                "No Desktop Audio Device",
                "No Stereo Mix or loopback device found.\n\n"
                "Desktop audio will NOT be recorded.\n\n"
                "Click OK to continue with microphone only,\n"
                "or Cancel to set up Stereo Mix first."
            )
            if not result:
                self.show_troubleshoot()
                return
            if mode == "desktop":
                messagebox.showwarning("Warning", "Cannot record - no audio source available.")
                return
            mode = "mic"  # Fall back to mic only

        try:
            self.recorder.start(mode, self._selected_mic, self._selected_desktop)
        except Exception as e:
            messagebox.showerror("Error", f"Failed to start: {e}")
            return

        self.is_recording = True
        self.record_btn.config(text="Stop Recording")
        self.status_label.config(text="Recording...", foreground="red")
        self._set_controls_enabled(False)

        self.overlay = RecordingOverlay(self.root, self.recorder)
        self.overlay.start_timer()

    def _set_controls_enabled(self, enabled: bool):
        state = "normal" if enabled else "disabled"
        for child in self.root.winfo_children():
            self._set_state_recursive(child, state)

    def _set_state_recursive(self, widget, state):
        if widget == self.record_btn:
            return
        try:
            wtype = widget.winfo_class()
            if wtype in ("TRadiobutton", "TCombobox", "TButton"):
                widget.config(state=state)
        except Exception:
            pass
        for child in widget.winfo_children():
            self._set_state_recursive(child, state)

    def stop_recording(self):
        # Get phone number from overlay before stopping
        phone_number = ""
        if self.overlay:
            phone_number = getattr(self.overlay, 'phone_number', "")
            self.overlay.stop()
            self.overlay = None

        audio = self.recorder.stop()
        self.is_recording = False

        self.record_btn.config(text="Start Recording")
        self._set_controls_enabled(True)
        self.mic_combo.config(state="readonly")
        self.desktop_combo.config(state="readonly")

        if len(audio) == 0:
            messagebox.showwarning("Warning", "No audio recorded.")
            self.status_label.config(text="Ready", foreground="gray")
            return

        # Show Save/Approve dialog
        dialog = SaveApproveDialog(self.root)
        # Pre-fill phone number if entered during recording
        if phone_number:
            dialog.phone_var.set(phone_number)
            dialog.phone_entry.icursor(tk.END)
        self.root.wait_window(dialog)

        if dialog.result is None:
            # User cancelled
            self.status_label.config(text="Recording discarded", foreground="gray")
            return

        # Get phone number from dialog (may have been updated)
        phone_number = dialog.phone_number

        # Build filename with phone number if provided
        timestamp = datetime.now().strftime("%d-%m-%Y_%H-%M-%S")
        if phone_number:
            # Sanitize phone number for filename (remove invalid chars)
            safe_phone = "".join(c for c in phone_number if c.isalnum() or c in "-_")
            filename = f"recording_{timestamp}_{safe_phone}.wav"
        else:
            filename = f"recording_{timestamp}.wav"

        # Determine save directory based on approve/save choice
        base_dir = Path(__file__).parent / "recordings"
        if dialog.result == "approve":
            save_dir = base_dir / "Approved"
        else:
            save_dir = base_dir

        # Create directory if it doesn't exist
        try:
            save_dir.mkdir(parents=True, exist_ok=True)
        except Exception as e:
            messagebox.showerror("Error", f"Could not create folder:\n{save_dir}\n\n{e}")
            self.status_label.config(text="Save failed", foreground="red")
            return

        filepath = save_dir / filename

        try:
            self.recorder.save(str(filepath), audio)
            status_text = f"{'Approved' if dialog.result == 'approve' else 'Saved'}: {filepath.name}"
            self.status_label.config(text=status_text, foreground="green")
            print(f"Recording saved: {filepath}")
        except Exception as e:
            messagebox.showerror("Error", f"Save failed: {e}")
            self.status_label.config(text="Save failed", foreground="red")

    def run(self):
        self.root.mainloop()


def main():
    if sd is None:
        print("Missing: sounddevice")
        print("Run: pip install sounddevice")
        return

    if keyboard is None:
        print("Warning: keyboard library not installed - hotkeys will be disabled")
        print("To enable hotkeys, run: pip install keyboard")

    app = RecorderApp()
    app.run()


if __name__ == "__main__":
    main()
