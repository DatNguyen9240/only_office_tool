import os
import logging
from typing import List, Dict, Any, Optional

logger = logging.getLogger("analyzer.stt")

def transcribe_audio(
    audio_path: str,
    language: Optional[str] = None,
    model_size: Optional[str] = None,
    device: Optional[str] = None,
    compute_type: Optional[str] = None,
) -> List[Dict[str, Any]]:
    """
    Transcribe audio file using faster-whisper.
    Returns list of parsed segment dictionaries with word-level timestamps.
    """
    model_size = model_size or os.getenv("WHISPER_MODEL", "small")
    device = device or os.getenv("WHISPER_DEVICE", "cpu")
    compute_type = compute_type or os.getenv("WHISPER_COMPUTE_TYPE", "int8")
    language = language or os.getenv("WHISPER_LANGUAGE", "vi")

    logger.info(f"Loading faster-whisper model '{model_size}' ({device}/{compute_type})...")
    
    from faster_whisper import WhisperModel
    model = WhisperModel(model_size, device=device, compute_type=compute_type)
    
    segments, info = model.transcribe(
        audio_path,
        language=language,
        word_timestamps=True,
        beam_size=5,
    )
    
    results = []
    for segment in segments:
        words = []
        if hasattr(segment, "words") and segment.words:
            for w in segment.words:
                words.append({
                    "word": w.word,
                    "start": round(w.start, 2),
                    "end": round(w.end, 2),
                    "score": round(getattr(w, "probability", 0.95), 2),
                })
        
        results.append({
            "start": round(segment.start, 2),
            "end": round(segment.end, 2),
            "text": segment.text.strip(),
            "confidence": round(getattr(segment, "avg_logprob", 0.95), 2),
            "words": words,
        })
        
    logger.info(f"Successfully transcribed {len(results)} segments from {audio_path}")
    return results
