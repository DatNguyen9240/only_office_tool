import React, { useEffect, useRef } from "react";
import { Track } from "livekit-client";

interface ParticipantAudioVisualizerProps {
  track?: Track;
  isMuted?: boolean;
  barCount?: number;
}

export const ParticipantAudioVisualizer: React.FC<ParticipantAudioVisualizerProps> = ({
  track,
  isMuted = false,
  barCount = 7,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationRef = useRef<number | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    if (isMuted || !track || !track.mediaStreamTrack) {
      if (canvasRef.current) {
        const ctx = canvasRef.current.getContext("2d");
        if (ctx) ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      }
      return;
    }

    let analyser: AnalyserNode | null = null;
    let source: MediaStreamAudioSourceNode | null = null;

    try {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const audioCtx = new AudioContextClass();
      audioCtxRef.current = audioCtx;

      const mediaStream = new MediaStream([track.mediaStreamTrack]);
      source = audioCtx.createMediaStreamSource(mediaStream);
      analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;

      source.connect(analyser);

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const draw = () => {
        if (!canvasRef.current || !analyser) return;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        analyser.getByteFrequencyData(dataArray);

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const width = canvas.width;
        const height = canvas.height;
        const barWidth = (width / barCount) - 2;
        
        for (let i = 0; i < barCount; i++) {
          const index = Math.floor((i / barCount) * (bufferLength / 2));
          const val = dataArray[index] || 0;
          const percent = val / 255;
          const barHeight = Math.max(3, percent * height);
          const x = i * (barWidth + 2);
          const y = height - barHeight;

          const gradient = ctx.createLinearGradient(0, height, 0, 0);
          gradient.addColorStop(0, "#06b6d4");
          gradient.addColorStop(1, "#6366f1");

          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.roundRect(x, y, barWidth, barHeight, 2);
          ctx.fill();
        }

        animationRef.current = requestAnimationFrame(draw);
      };

      draw();
    } catch (err) {
      console.warn("Web Audio API visualizer initialization:", err);
    }

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      if (audioCtxRef.current && audioCtxRef.current.state !== "closed") {
        audioCtxRef.current.close();
      }
    };
  }, [track, isMuted, barCount]);

  return (
    <canvas
      ref={canvasRef}
      width={70}
      height={24}
      style={{
        display: "block",
        opacity: isMuted ? 0.3 : 1,
        transition: "opacity 0.2s ease",
      }}
    />
  );
};
