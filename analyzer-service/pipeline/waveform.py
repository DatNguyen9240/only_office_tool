import subprocess
import numpy as np
import logging
from typing import List

logger = logging.getLogger("analyzer.waveform")

def generate_peaks(audio_or_video_path: str, num_peaks: int = 100) -> List[float]:
    """
    Extract audio waveform peaks from video or audio file using FFmpeg and numpy.
    Returns array of normalized floats between 0.0 and 1.0.
    """
    try:
        cmd = [
            "ffmpeg",
            "-i", audio_or_video_path,
            "-ac", "1",
            "-filter:a", "aresample=8000",
            "-map", "0:a",
            "-c:a", "pcm_s16le",
            "-f", "s16le",
            "-"
        ]
        
        process = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL)
        raw_data, _ = process.communicate()
        
        if not raw_data:
            logger.warning(f"No raw audio stream extracted from {audio_or_video_path}")
            return []

        audio_data = np.frombuffer(raw_data, dtype=np.int16)
        if len(audio_data) == 0:
            return []

        audio_data = np.abs(audio_data)
        chunk_size = max(1, len(audio_data) // num_peaks)
        
        peaks = []
        for i in range(num_peaks):
            start = i * chunk_size
            end = min(len(audio_data), (i + 1) * chunk_size)
            if start < len(audio_data):
                chunk_max = np.max(audio_data[start:end]) if start < end else 0
                peaks.append(float(chunk_max))
            else:
                peaks.append(0.0)

        max_val = np.max(peaks) if len(peaks) > 0 and np.max(peaks) > 0 else 1.0
        normalized_peaks = [round(float(p / max_val), 3) for p in peaks]
        return normalized_peaks

    except Exception as e:
        logger.error(f"Error building waveform peaks: {e}")
        return []
