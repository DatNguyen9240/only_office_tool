import React, { useEffect, useRef, useState } from "react";
import WaveSurfer from "wavesurfer.js";
import {
  CaretRightOutlined,
  PauseOutlined,
  SoundOutlined,
  MutedOutlined,
  ZoomInOutlined,
  ZoomOutOutlined,
} from "@ant-design/icons";
import { Slider } from "antd";

interface MeetingWaveformProps {
  videoElement: HTMLVideoElement | null;
  peaks: number[];
  duration: number;
  onSeek?: (time: number) => void;
}

export const MeetingWaveform: React.FC<MeetingWaveformProps> = ({
  videoElement,
  peaks,
  duration,
  onSeek,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);

  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [volume, setVolume] = useState<number>(1);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [zoomLevel, setZoomLevel] = useState<number>(0);

  useEffect(() => {
    if (!containerRef.current || !videoElement) return;

    if (wavesurferRef.current) {
      wavesurferRef.current.destroy();
    }

    try {
      const ws = WaveSurfer.create({
        container: containerRef.current,
        media: videoElement,
        peaks: peaks && peaks.length > 0 ? [peaks] : undefined,
        duration: duration || undefined,
        waveColor: "#475569",
        progressColor: "#6366f1",
        cursorColor: "#a855f7",
        cursorWidth: 2,
        barWidth: 2,
        barGap: 1.5,
        barRadius: 2,
        dragToSeek: true,
        height: 64,
      });

      ws.on("timeupdate", (time) => {
        setCurrentTime(time);
      });

      ws.on("click", (relativePosition) => {
        const targetTime = relativePosition * duration;
        if (onSeek) onSeek(targetTime);
      });

      wavesurferRef.current = ws;
    } catch (err) {
      console.warn("WaveSurfer v7 init error:", err);
    }

    return () => {
      if (wavesurferRef.current) {
        wavesurferRef.current.destroy();
        wavesurferRef.current = null;
      }
    };
  }, [containerRef, videoElement, peaks, duration]);

  const togglePlay = () => {
    if (!videoElement) return;
    if (videoElement.paused) {
      videoElement.play();
      setIsPlaying(true);
    } else {
      videoElement.pause();
      setIsPlaying(false);
    }
  };

  const handleVolumeChange = (val: number) => {
    setVolume(val);
    if (videoElement) {
      videoElement.volume = val;
      setIsMuted(val === 0);
    }
  };

  const toggleMute = () => {
    if (!videoElement) return;
    const nextState = !isMuted;
    setIsMuted(nextState);
    videoElement.muted = nextState;
  };

  const handleZoom = (delta: number) => {
    const nextZoom = Math.max(0, Math.min(100, zoomLevel + delta));
    setZoomLevel(nextZoom);
    if (wavesurferRef.current) {
      wavesurferRef.current.zoom(nextZoom);
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  return (
    <div className="w-full bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col gap-3 shadow-md">
      <div ref={containerRef} className="w-full cursor-pointer rounded overflow-hidden" />

      <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
        <div className="flex items-center gap-3">
          <button
            onClick={togglePlay}
            className="p-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition-all flex items-center justify-center"
          >
            {isPlaying ? <PauseOutlined style={{ fontSize: 16 }} /> : <CaretRightOutlined style={{ fontSize: 16 }} />}
          </button>
          <span className="text-xs font-mono text-slate-300">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 w-32">
            <button onClick={toggleMute} className="text-slate-400 hover:text-white">
              {isMuted ? <MutedOutlined /> : <SoundOutlined />}
            </button>
            <Slider
              min={0}
              max={1}
              step={0.05}
              value={isMuted ? 0 : volume}
              onChange={handleVolumeChange}
              className="flex-1"
            />
          </div>

          <div className="flex items-center gap-1 border-l border-slate-800 pl-3">
            <button
              onClick={() => handleZoom(-15)}
              className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-white"
            >
              <ZoomOutOutlined />
            </button>
            <button
              onClick={() => handleZoom(15)}
              className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-white"
            >
              <ZoomInOutlined />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
