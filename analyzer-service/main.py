import os
import logging
import tempfile
import requests
from fastapi import FastAPI, BackgroundTasks, HTTPException
from pydantic import BaseModel
from typing import List, Optional, Dict, Any

from pipeline.stt import transcribe_audio
from pipeline.waveform import generate_peaks
from pipeline.llm import analyze_transcript

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("analyzer.main")

app = FastAPI(title="Meridian DMS — Meeting Analyzer Microservice")

NESTJS_API_URL = os.getenv("NESTJS_API_URL", "http://api:3000")

class ParticipantMedia(BaseModel):
    participantId: str
    participantName: str
    audioUrl: Optional[str] = None

class ProcessMeetingRequest(BaseModel):
    meetingId: str
    videoUrl: Optional[str] = None
    participants: List[ParticipantMedia] = []

@app.get("/health")
def health_check():
    return {"status": "ok", "service": "analyzer-microservice"}

def process_meeting_task(req: ProcessMeetingRequest):
    logger.info(f"Starting processing for meeting {req.meetingId}...")
    
    all_segments: List[Dict[str, Any]] = []
    video_peaks: List[float] = []
    
    with tempfile.TemporaryDirectory() as tmp_dir:
        # 1. Extract Waveform Peaks if video is available
        if req.videoUrl:
            try:
                video_path = os.path.join(tmp_dir, "meeting.mp4")
                logger.info(f"Downloading video from {req.videoUrl}...")
                resp = requests.get(req.videoUrl, stream=True, timeout=30)
                if resp.status_code == 200:
                    with open(video_path, "wb") as f:
                        for chunk in resp.iter_content(chunk_size=8192):
                            f.write(chunk)
                    video_peaks = generate_peaks(video_path, num_peaks=100)
            except Exception as e:
                logger.error(f"Error processing video waveform peaks: {e}")

        # 2. Process STT for participants
        if req.participants:
            for p in req.participants:
                if p.audioUrl:
                    try:
                        audio_path = os.path.join(tmp_dir, f"{p.participantId}.ogg")
                        resp = requests.get(p.audioUrl, stream=True, timeout=30)
                        if resp.status_code == 200:
                            with open(audio_path, "wb") as f:
                                for chunk in resp.iter_content(chunk_size=8192):
                                    f.write(chunk)
                            
                            stt_res = transcribe_audio(audio_path)
                            for seg in stt_res:
                                seg["participantId"] = p.participantId
                                seg["participantName"] = p.participantName
                                all_segments.append(seg)
                    except Exception as e:
                        logger.error(f"Error processing participant {p.participantId} audio: {e}")

        # Fallback if no participant audio files provided: transcribe main video
        if not all_segments and req.videoUrl:
            video_path = os.path.join(tmp_dir, "meeting.mp4")
            if os.path.exists(video_path):
                stt_res = transcribe_audio(video_path)
                for seg in stt_res:
                    seg["participantId"] = "speaker-all"
                    seg["participantName"] = "Người nói"
                    all_segments.append(seg)

        # Sort all segments by startTime ascending
        all_segments.sort(key=lambda x: x.get("startTime", 0.0))

        # 3. LLM Analysis
        analysis_res = {}
        if all_segments:
            try:
                analysis_res = analyze_transcript(all_segments)
            except Exception as e:
                logger.error(f"Error analyzing transcript with LLM: {e}")

        logger.info(f"Finished processing meeting {req.meetingId}. Posting results back to NestJS...")
        
        # 4. Post results back to NestJS internal callback
        try:
            callback_url = f"{NESTJS_API_URL}/api/meetings/{req.meetingId}/internal-result"
            requests.post(callback_url, json={
                "segments": all_segments,
                "peaks": video_peaks,
                "analysis": analysis_res
            }, timeout=15)
        except Exception as e:
            logger.error(f"Failed to post results back to NestJS: {e}")

@app.post("/process")
def process_meeting(req: ProcessMeetingRequest, background_tasks: BackgroundTasks):
    background_tasks.add_task(process_meeting_task, req)
    return {"status": "accepted", "meetingId": req.meetingId, "message": "Analyzer job started in background"}
