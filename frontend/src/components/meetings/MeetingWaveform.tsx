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
    <div className="waveform-card">
      <div ref={containerRef} className="waveform-canvas-container" />

      <div className="waveform-controls">
        <div className="waveform-controls-left">
          <button onClick={togglePlay} className="waveform-play-btn">
            {isPlaying ? <PauseOutlined style={{ fontSize: 16 }} /> : <CaretRightOutlined style={{ fontSize: 16 }} />}
          </button>
          <span className="waveform-time-display">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>
        </div>

        <div className="waveform-controls-right">
          <div className="waveform-volume-box">
            <button onClick={toggleMute} className="waveform-icon-btn">
              {isMuted ? <MutedOutlined /> : <SoundOutlined />}
            </button>
            <Slider
              min={0}
              max={1}
              step={0.05}
              value={isMuted ? 0 : volume}
              onChange={handleVolumeChange}
              className="waveform-volume-slider"
            />
          </div>

          <div className="waveform-zoom-box">
            <button onClick={() => handleZoom(-15)} className="waveform-icon-btn">
              <ZoomOutOutlined />
            </button>
            <button onClick={() => handleZoom(15)} className="waveform-icon-btn">
              <ZoomInOutlined />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

