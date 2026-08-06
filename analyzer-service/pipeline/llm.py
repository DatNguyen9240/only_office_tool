import os
import json
import logging
import requests
from typing import Dict, Any, List

logger = logging.getLogger("analyzer.llm")

def analyze_transcript(transcript_segments: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Analyze meeting transcript using LLM and return structured analysis JSON.
    """
    llm_provider = os.getenv("LLM_PROVIDER", "openai").lower()
    api_key = os.getenv("LLM_API_KEY", "")
    model = os.getenv("LLM_MODEL", "gpt-4o-mini")

    if not api_key:
        raise ValueError("LLM_API_KEY is not configured in environment variables")

    formatted_transcript = ""
    for seg in transcript_segments:
        seg_id = seg.get("id", 0)
        speaker = seg.get("participantName", "Người dùng")
        time_str = f"{int(seg.get('startTime', 0))}s - {int(seg.get('endTime', 0))}s"
        formatted_transcript += f"[Segment #{seg_id} | {time_str} | {speaker}]: {seg.get('text', '')}\n"

    system_prompt = (
        "Bạn là trợ lý AI chuyên phân tích nội dung cuộc họp tiếng Việt.\n"
        "Hãy đọc bản ghi thoại bên dưới và phân tích thành định dạng JSON chuẩn với các trường:\n"
        "1. title: Tiêu đề cuộc họp ngắn gọn.\n"
        "2. summary: Tóm tắt nội dung cuộc họp trong 2-3 câu.\n"
        "3. topics: Danh sách các chủ đề chính (mỗi chủ đề gồm title, summary).\n"
        "4. decisions: Các quyết định được đưa ra (gồm content, decidedByParticipantIds, evidenceSegmentIds).\n"
        "5. actionItems: Nhiệm vụ cần thực hiện (gồm task, assigneeParticipantId, assigneeName, deadline, status='open', confidence, evidenceSegmentIds).\n"
        "6. risks: Rủi ro hoặc thách thức được đề cập (gồm risk, mitigation, evidenceSegmentIds).\n"
        "7. unansweredQuestions: Câu hỏi chưa có lời giải đáp (gồm question, evidenceSegmentIds).\n\n"
        "LƯU Ý QUAN TRỌNG:\n"
        "- Mọi item trong decisions, actionItems, risks, unansweredQuestions BẮT BUỘC phải chứa mảng evidenceSegmentIds ghi rõ danh sách Segment ID chứa bằng chứng.\n"
        "- Không tự bịa deadline hoặc người phụ trách nếu transcript không nói rõ; nếu không chắc chắn đặt null và giảm confidence.\n"
        "- Trả về duy nhất định dạng JSON hợp lệ, không bọc markdown hay bổ sung chữ nào khác."
    )

    prompt = f"BẢN GHI CUỘC HỌP:\n{formatted_transcript}\n\nHãy phân tích và trả về JSON:"

    if llm_provider == "openai":
        resp = requests.post(
            "https://api.openai.com/v1/chat/completions",
            headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
            json={
                "model": model,
                "response_format": {"type": "json_object"},
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": prompt},
                ],
                "temperature": 0.2,
            },
            timeout=60,
        )
        resp.raise_for_status()
        result_json = resp.json()["choices"][0]["message"]["content"]
        return json.loads(result_json)
    
    raise NotImplementedError(f"Unsupported LLM provider: {llm_provider}")
