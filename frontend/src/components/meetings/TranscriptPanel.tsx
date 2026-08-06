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
    <div className="flex flex-col h-full bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-md">
      <div className="p-4 border-b border-slate-800 flex items-center justify-between gap-3 bg-slate-900/90">
        <div className="flex-1">
          <Input
            prefix={<SearchOutlined className="text-slate-400 mr-1" />}
            placeholder="Tìm kiếm nội dung transcript..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            allowClear
            className="bg-slate-950 border-slate-800 text-white hover:border-indigo-500 focus:border-indigo-500 rounded-lg"
          />
        </div>
        <button
          onClick={() => setAutoScroll(!autoScroll)}
          title="Tự động cuộn theo video"
          className={`p-2 rounded-lg text-xs font-medium flex items-center gap-1 transition-all ${
            autoScroll
              ? "bg-indigo-600/20 text-indigo-400 border border-indigo-500/30"
              : "bg-slate-800 text-slate-400 hover:text-white"
          }`}
        >
          <DownCircleOutlined />
          Auto-scroll
        </button>
      </div>

      <div ref={listContainerRef} className="flex-1 p-3 overflow-y-auto space-y-2">
        {filteredSegments.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-sm">
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
                className={`p-3 rounded-lg border transition-all cursor-pointer ${
                  isActive
                    ? "bg-indigo-950/40 border-indigo-500/60 text-white shadow-sm"
                    : "bg-slate-950/40 border-slate-800/80 hover:border-slate-700 text-slate-300"
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-indigo-400">
                    <UserOutlined />
                    <span>{seg.participantName}</span>
                  </div>
                  <div className="flex items-center gap-1 text-[11px] font-mono text-slate-500">
                    <ClockCircleOutlined />
                    <span>
                      {formatTime(seg.startTime)} - {formatTime(seg.endTime)}
                    </span>
                  </div>
                </div>

                <p className="text-sm leading-relaxed">{seg.text}</p>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
