import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { MeetingPlaybackResponse, TranscriptSegment, MeetingAnalysis } from "@share";
import { MeetingWaveform } from "../../components/meetings/MeetingWaveform";
import { TranscriptPanel } from "../../components/meetings/TranscriptPanel";
import { MeetingSummaryPanel } from "../../components/meetings/MeetingSummaryPanel";
import { Spin, Tabs, Button, notification, Tag } from "antd";
import {
  VideoCameraOutlined,
  ReloadOutlined,
  ArrowLeftOutlined,
  AudioOutlined,
  ThunderboltOutlined,
} from "@ant-design/icons";

export const MeetingPlaybackPage: React.FC = () => {
  const { meetingId } = useParams<{ meetingId: string }>();
  const navigate = useNavigate();

  const videoRef = useRef<HTMLVideoElement | null>(null);

  const [loading, setLoading] = useState<boolean>(true);
  const [playbackData, setPlaybackData] = useState<MeetingPlaybackResponse | null>(null);
  const [segments, setSegments] = useState<TranscriptSegment[]>([]);
  const [analysis, setAnalysis] = useState<MeetingAnalysis | null>(null);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [reanalyzing, setReanalyzing] = useState<boolean>(false);

  const fetchData = async () => {
    if (!meetingId) return;
    setLoading(true);

    try {
      const pbRes = await fetch(`/api/meetings/${meetingId}/playback`);
      if (pbRes.ok) {
        const data = await pbRes.json();
        setPlaybackData(data);
      }

      const trRes = await fetch(`/api/meetings/${meetingId}/transcript`);
      if (trRes.ok) {
        const segs = await trRes.json();
        setSegments(segs);
      }

      const anRes = await fetch(`/api/meetings/${meetingId}/analysis`);
      if (anRes.ok) {
        const anData = await anRes.json();
        setAnalysis(anData);
      }
    } catch (err) {
      console.error("Error fetching playback data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [meetingId]);

  const handleVideoTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleSeek = async (targetTime: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = targetTime;
      try {
        await videoRef.current.play();
      } catch (e) {
        // Autoplay policy fallback
      }
    }
  };

  const handleEvidenceClick = (segmentId: number) => {
    const targetSeg = segments.find((s) => s.id === segmentId);
    if (targetSeg) {
      handleSeek(targetSeg.startTime);
    } else if (segments.length > 0) {
      handleSeek(segments[0].startTime);
    }
  };

  const handleReanalyze = async () => {
    if (!meetingId) return;
    setReanalyzing(true);
    try {
      const res = await fetch(`/api/meetings/${meetingId}/reanalyze`, { method: "POST" });
      if (res.ok) {
        notification.success({
          message: "Đã khởi chạy lại phân tích LLM",
          description: "Kết quả mới sẽ được cập nhật trong vài phút.",
        });
        setTimeout(fetchData, 3000);
      }
    } catch (err) {
      notification.error({ message: "Không thể yêu cầu phân tích lại" });
    } finally {
      setReanalyzing(false);
    }
  };

  if (loading) {
    return (
      <div className="w-full h-screen bg-slate-950 flex flex-col items-center justify-center gap-3 text-slate-400">
        <Spin size="large" />
        <span className="text-sm font-medium">Đang tải bản xem lại cuộc họp...</span>
      </div>
    );
  }

  return (
    <div className="w-full h-screen bg-slate-950 flex flex-col overflow-hidden text-slate-200">
      {/* Header */}
      <div className="px-6 py-3 bg-slate-900 border-b border-slate-800 flex items-center justify-between z-20">
        <div className="flex items-center gap-3">
          <Button
            type="text"
            icon={<ArrowLeftOutlined className="text-slate-400" />}
            onClick={() => navigate("/documents")}
            className="hover:bg-slate-800 text-slate-300"
          />
          <div>
            <h1 className="text-base font-bold text-white leading-tight">
              {playbackData?.title || "Xem lại cuộc họp"}
            </h1>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs text-slate-400">ID: {meetingId}</span>
              <Tag color="indigo" className="text-[10px] uppercase font-bold">
                {playbackData?.analysisStatus || "COMPLETED"}
              </Tag>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            icon={<ReloadOutlined spin={reanalyzing} />}
            onClick={handleReanalyze}
            loading={reanalyzing}
            className="bg-slate-800 border-slate-700 text-slate-300 hover:text-white"
          >
            Phân tích lại LLM
          </Button>
          <Button
            type="primary"
            icon={<VideoCameraOutlined />}
            onClick={() => navigate(`/meetings/${meetingId}`)}
            className="bg-indigo-600 hover:bg-indigo-500 font-medium"
          >
            Vào lại phòng họp
          </Button>
        </div>
      </div>

      {/* Main Grid Content */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 p-4 overflow-hidden">
        {/* Left Side: Video & Waveform (7 cols) */}
        <div className="lg:col-span-7 flex flex-col gap-4 overflow-y-auto">
          {/* HTML5 Video Player */}
          <div className="w-full bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl aspect-video relative flex items-center justify-center">
            {playbackData?.videoUrl ? (
              <video
                ref={videoRef}
                src={playbackData.videoUrl}
                controls
                onTimeUpdate={handleVideoTimeUpdate}
                className="w-full h-full object-contain"
              />
            ) : (
              <div className="flex flex-col items-center gap-2 text-slate-500 p-8 text-center">
                <Spin />
                <span className="text-sm font-medium">
                  Video cuộc họp đang được xử lý hoặc lưu trên MinIO S3...
                </span>
              </div>
            )}
          </div>

          {/* Waveform Timeline (WaveSurfer v7) */}
          <MeetingWaveform
            videoElement={videoRef.current}
            peaks={playbackData?.peaks || []}
            duration={playbackData?.duration || 60}
            onSeek={handleSeek}
          />
        </div>

        {/* Right Side: Transcript & Analysis Panels (5 cols) */}
        <div className="lg:col-span-5 flex flex-col h-full overflow-hidden">
          <Tabs
            defaultActiveKey="transcript"
            className="h-full flex flex-col meetings-tabs"
            items={[
              {
                key: "transcript",
                label: (
                  <span className="flex items-center gap-1.5 px-2">
                    <AudioOutlined />
                    Transcript ({segments.length})
                  </span>
                ),
                children: (
                  <TranscriptPanel
                    segments={segments}
                    currentTime={currentTime}
                    onSegmentClick={handleSeek}
                  />
                ),
              },
              {
                key: "analysis",
                label: (
                  <span className="flex items-center gap-1.5 px-2">
                    <ThunderboltOutlined className="text-indigo-400" />
                    Phân tích LLM
                  </span>
                ),
                children: analysis ? (
                  <MeetingSummaryPanel
                    analysis={analysis}
                    onEvidenceClick={handleEvidenceClick}
                  />
                ) : (
                  <div className="p-8 text-center text-slate-500">
                    Đang tải phân tích LLM...
                  </div>
                ),
              },
            ]}
          />
        </div>
      </div>
    </div>
  );
};
