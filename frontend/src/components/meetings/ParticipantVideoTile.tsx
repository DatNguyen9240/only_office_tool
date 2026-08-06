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
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
      if (audioRef.current) {
        audioRef.current.srcObject = null;
      }
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
    <div className={`participant-tile ${isSpeaking ? "is-speaking" : ""}`}>
      {!participant.isLocal && <audio ref={audioRef} autoPlay />}

      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={participant.isLocal}
        className="participant-video-el"
        style={{ display: hasVideo ? "block" : "none" }}
      />

      {!hasVideo && (
        <div className="participant-avatar-overlay">
          <div className="participant-avatar-circle">
            {nameInitial || <UserOutlined />}
          </div>
          <div className="participant-avatar-name">
            {participant.name || participant.identity}
          </div>
        </div>
      )}

      {/* Participant Label & Waveform Overlay */}
      <div className="participant-bottom-bar">
        <div className="participant-name-tag">
          <span>
            {participant.name || participant.identity} {participant.isLocal ? "(Bạn)" : ""}
          </span>
          {isMuted ? (
            <AudioMutedOutlined style={{ color: "#f87171" }} />
          ) : (
            <AudioOutlined style={{ color: "#34d399" }} />
          )}
        </div>

        <div style={{ display: "flex", alignItems: "center" }}>
          <ParticipantAudioVisualizer track={audioTrack} isMuted={isMuted} />
        </div>
      </div>
    </div>
  );
};
