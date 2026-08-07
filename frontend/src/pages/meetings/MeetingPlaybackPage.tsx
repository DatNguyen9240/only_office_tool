import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { MeetingPlaybackResponse, TranscriptSegment, MeetingAnalysis } from "@share";
import { MeetingWaveform } from "../../components/meetings/MeetingWaveform";
import { TranscriptPanel } from "../../components/meetings/TranscriptPanel";
import { MeetingSummaryPanel } from "../../components/meetings/MeetingSummaryPanel";
import { Spin, Tabs, Button, App, Tag } from "antd";
import {
  VideoCameraOutlined,
  ReloadOutlined,
  ArrowLeftOutlined,
  AudioOutlined,
  ThunderboltOutlined,
} from "@ant-design/icons";

export const MeetingPlaybackPage: React.FC = () => {
  const { notification } = App.useApp();
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
      <div className="playback-loading-overlay">
        <Spin size="large" />
        <span className="playback-loading-text">Đang tải bản xem lại cuộc họp...</span>
      </div>
    );
  }

  return (
    <div className="playback-page-container">
      {/* Header */}
      <div className="playback-header">
        <div className="playback-header-left">
          <Button
            type="text"
            icon={<ArrowLeftOutlined className="playback-back-icon" />}
            onClick={() => navigate("/documents")}
            className="playback-back-btn"
          />
          <div>
            <h1 className="playback-title">
              {playbackData?.title || "Xem lại cuộc họp"}
            </h1>
            <div className="playback-meta">
              <span className="playback-id">ID: {meetingId}</span>
              <Tag color="indigo" className="playback-status-tag">
                {playbackData?.analysisStatus || "COMPLETED"}
              </Tag>
            </div>
          </div>
        </div>

        <div className="playback-header-right">
          <Button
            icon={<ReloadOutlined spin={reanalyzing} />}
            onClick={handleReanalyze}
            loading={reanalyzing}
            className="playback-reanalyze-btn"
          >
            Phân tích lại LLM
          </Button>
          <Button
            type="primary"
            icon={<VideoCameraOutlined />}
            onClick={() => navigate(`/meetings/${meetingId}`)}
            className="playback-rejoin-btn"
          >
            Vào lại phòng họp
          </Button>
        </div>
      </div>

      {/* Main Grid Content */}
      <div className="playback-main-grid">
        {/* Left Side: Video & Waveform */}
        <div className="playback-left-column">
          {/* HTML5 Video Player */}
          <div className="playback-video-card">
            {playbackData?.videoUrl ? (
              <video
                ref={videoRef}
                src={playbackData.videoUrl}
                controls
                onTimeUpdate={handleVideoTimeUpdate}
                className="playback-video-element"
              />
            ) : (
              <div className="playback-video-placeholder">
                <Spin size="large" />
                <span>Video cuộc họp đang được xử lý hoặc lưu trên MinIO S3...</span>
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

        {/* Right Side: Transcript & Analysis Panels */}
        <div className="playback-right-column">
          <Tabs
            defaultActiveKey="transcript"
            className="playback-tabs"
            items={[
              {
                key: "transcript",
                label: (
                  <span className="playback-tab-label">
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
                  <span className="playback-tab-label">
                    <ThunderboltOutlined className="playback-tab-icon-accent" />
                    Phân tích LLM
                  </span>
                ),
                children: analysis ? (
                  <MeetingSummaryPanel
                    analysis={analysis}
                    onEvidenceClick={handleEvidenceClick}
                  />
                ) : (
                  <div className="playback-analysis-loading">
                    <Spin />
                    <span>Đang tải phân tích LLM...</span>
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

