import React, { useEffect, useRef, useState } from "react";
import { Participant, Track, ConnectionQuality } from "livekit-client";
import { ParticipantAudioVisualizer } from "./ParticipantAudioVisualizer";
import { AudioOutlined, AudioMutedOutlined, UserOutlined } from "@ant-design/icons";

interface ParticipantVideoTileProps {
  participant: Participant;
}

export const ParticipantVideoTile: React.FC<ParticipantVideoTileProps> = ({ participant }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [hasVideo, setHasVideo] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [connectionQuality, setConnectionQuality] = useState<ConnectionQuality>(
    participant.connectionQuality || ConnectionQuality.Excellent
  );
  const [audioTrack, setAudioTrack] = useState<Track | undefined>(undefined);

  useEffect(() => {
    const updateState = () => {
      const cameraPub = participant.getTrackPublication(Track.Source.Camera);
      const screenPub = participant.getTrackPublication(Track.Source.ScreenShare);
      const micPub = participant.getTrackPublication(Track.Source.Microphone);

      const activeVideoPub = cameraPub || screenPub;
      if (activeVideoPub && activeVideoPub.track && !activeVideoPub.isMuted) {
        setHasVideo(true);
        if (videoRef.current) {
          activeVideoPub.track.attach(videoRef.current);
        }
      } else {
        setHasVideo(false);
      }

      if (micPub) {
        setIsMuted(micPub.isMuted);
        setAudioTrack(micPub.track);
        if (micPub.track && !participant.isLocal && audioRef.current) {
          micPub.track.attach(audioRef.current);
        }
      } else {
        setIsMuted(true);
        setAudioTrack(undefined);
      }

      setIsSpeaking(participant.isSpeaking);
      setConnectionQuality(participant.connectionQuality);
    };

    updateState();

    participant.on("trackSubscribed", updateState);
    participant.on("trackUnsubscribed", updateState);
    participant.on("trackMuted", updateState);
    participant.on("trackUnmuted", updateState);
    participant.on("isSpeakingChanged", (speaking) => setIsSpeaking(speaking));
    participant.on("connectionQualityChanged", (quality) => setConnectionQuality(quality));

    return () => {
      participant.off("trackSubscribed", updateState);
      participant.off("trackUnsubscribed", updateState);
      participant.off("trackMuted", updateState);
      participant.off("trackUnmuted", updateState);
    };
  }, [participant]);

  const nameInitial = participant.name
    ? participant.name.charAt(0).toUpperCase()
    : participant.identity.charAt(0).toUpperCase();

  return (
    <div
      className={`relative w-full h-full min-h-[220px] bg-slate-900 rounded-xl overflow-hidden border-2 transition-all duration-300 ${
        isSpeaking ? "border-indigo-500 shadow-lg shadow-indigo-500/20 is-speaking" : "border-slate-800"
      }`}
    >
      {!participant.isLocal && <audio ref={audioRef} autoPlay />}

      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={participant.isLocal}
        className={`w-full h-full object-cover ${hasVideo ? "block" : "hidden"}`}
      />

      {!hasVideo && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-850">
          <div className="w-20 h-20 rounded-full bg-indigo-600/30 border border-indigo-400/40 flex items-center justify-center text-white text-2xl font-bold mb-2 shadow-inner">
            {nameInitial || <UserOutlined style={{ fontSize: 32 }} />}
          </div>
          <span className="text-slate-300 text-sm font-medium">
            {participant.name || participant.identity}
          </span>
        </div>
      )}

      {/* Participant Label & Waveform Overlay Bottom Bar */}
      <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-slate-950/90 via-slate-950/60 to-transparent p-3 flex items-center justify-between">
        <div className="flex items-center gap-2 max-w-[65%]">
          <span className="text-white text-xs font-semibold truncate">
            {participant.name || participant.identity} {participant.isLocal ? "(Bạn)" : ""}
          </span>
          {isMuted ? (
            <AudioMutedOutlined className="text-red-400 shrink-0" />
          ) : (
            <AudioOutlined className="text-emerald-400 shrink-0" />
          )}
        </div>

        <div className="flex items-center">
          <ParticipantAudioVisualizer track={audioTrack} isMuted={isMuted} />
        </div>
      </div>
    </div>
  );
};
