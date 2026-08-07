import React, { useState, useMemo, useEffect, useRef } from "react";
import { TranscriptSegment } from "@share";
import { SearchOutlined, UserOutlined, ClockCircleOutlined, DownCircleOutlined } from "@ant-design/icons";
import { Input } from "antd";

interface TranscriptPanelProps {
  segments: TranscriptSegment[];
  currentTime: number;
  onSegmentClick: (startTime: number) => void;
}

export const TranscriptPanel: React.FC<TranscriptPanelProps> = ({
  segments,
  currentTime,
  onSegmentClick,
}) => {
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [autoScroll, setAutoScroll] = useState<boolean>(true);
  const activeRowRef = useRef<HTMLDivElement | null>(null);
  const listContainerRef = useRef<HTMLDivElement | null>(null);

  const filteredSegments = useMemo(() => {
    if (!searchTerm.trim()) return segments;
    const term = searchTerm.toLowerCase();
    return segments.filter(
      (s) =>
        s.text.toLowerCase().includes(term) ||
        s.participantName.toLowerCase().includes(term)
    );
  }, [segments, searchTerm]);

  const activeSegmentIndex = useMemo(() => {
    return segments.findIndex(
      (s) => currentTime >= s.startTime && currentTime <= s.endTime
    );
  }, [segments, currentTime]);

  useEffect(() => {
    if (autoScroll && activeRowRef.current && listContainerRef.current) {
      activeRowRef.current.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }
  }, [activeSegmentIndex, autoScroll]);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  return (
    <div className="transcript-panel-card">
      <div className="transcript-header">
        <div className="transcript-search-box">
          <Input
            prefix={<SearchOutlined className="transcript-search-icon" />}
            placeholder="Tìm kiếm nội dung transcript..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            allowClear
            className="transcript-search-input"
          />
        </div>
        <button
          onClick={() => setAutoScroll(!autoScroll)}
          title="Tự động cuộn theo video"
          className={`transcript-autoscroll-btn ${autoScroll ? "active" : ""}`}
        >
          <DownCircleOutlined />
          Auto-scroll
        </button>
      </div>

      <div ref={listContainerRef} className="transcript-list-container">
        {filteredSegments.length === 0 ? (
          <div className="transcript-empty-state">
            Không tìm thấy đoạn hội thoại nào phù hợp.
          </div>
        ) : (
          filteredSegments.map((seg, idx) => {
            const isActive =
              currentTime >= seg.startTime && currentTime <= seg.endTime;
            return (
              <div
                key={seg.id || idx}
                ref={isActive ? activeRowRef : null}
                onClick={() => onSegmentClick(seg.startTime)}
                className={`transcript-segment-item ${isActive ? "active" : ""}`}
              >
                <div className="transcript-segment-top">
                  <div className="transcript-speaker-tag">
                    <UserOutlined />
                    <span>{seg.participantName}</span>
                  </div>
                  <div className="transcript-time-tag">
                    <ClockCircleOutlined />
                    <span>
                      {formatTime(seg.startTime)} - {formatTime(seg.endTime)}
                    </span>
                  </div>
                </div>

                <p className="transcript-segment-text">{seg.text}</p>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

