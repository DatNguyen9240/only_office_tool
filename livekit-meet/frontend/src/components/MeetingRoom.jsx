import React, { useEffect, useState, useRef } from 'react';
import { Room, RoomEvent, Track } from 'livekit-client';
import ControlsBar from './ControlsBar';
import ParticipantList from './ParticipantList';

function MeetingRoom({ token, serverUrl, roomName, participantName, onLeave }) {
  const [room, setRoom] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [reconnecting, setReconnecting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const [isMicOn, setIsMicOn] = useState(true);
  const [isCamOn, setIsCamOn] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);

  const videoContainerRef = useRef(null);

  useEffect(() => {
    let activeRoom = new Room({
      adaptiveStream: true,
      dynacast: true,
      videoCaptureDefaults: {
        resolution: { width: 1280, height: 720, frameRate: 30 },
      },
    });

    const updateParticipants = () => {
      if (!activeRoom) return;
      const all = [activeRoom.localParticipant, ...Array.from(activeRoom.remoteParticipants.values())];
      setParticipants([...all]);
    };

    activeRoom
      .on(RoomEvent.SignalConnected, () => {
        console.log('Signal connected');
      })
      .on(RoomEvent.Connected, () => {
        console.log('Đã kết nối thành công tới LiveKit Room');
        setReconnecting(false);
        updateParticipants();
        
        // Mặc định bật mic & cam
        activeRoom.localParticipant.setMicrophoneEnabled(true);
        activeRoom.localParticipant.setCameraEnabled(true);
      })
      .on(RoomEvent.Reconnecting, () => {
        console.warn('Đang tự động kết nối lại...');
        setReconnecting(true);
      })
      .on(RoomEvent.Reconnected, () => {
        console.log('Đã kết nối lại thành công');
        setReconnecting(false);
        updateParticipants();
      })
      .on(RoomEvent.Disconnected, (reason) => {
        console.log('Đã ngắt kết nối:', reason);
      })
      .on(RoomEvent.ParticipantConnected, updateParticipants)
      .on(RoomEvent.ParticipantDisconnected, updateParticipants)
      .on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
        updateParticipants();
      })
      .on(RoomEvent.TrackUnsubscribed, (track, publication, participant) => {
        updateParticipants();
      })
      .on(RoomEvent.TrackMuted, updateParticipants)
      .on(RoomEvent.TrackUnmuted, updateParticipants);

    activeRoom
      .connect(serverUrl, token)
      .then(() => {
        setRoom(activeRoom);
      })
      .catch((err) => {
        console.error('Không thể kết nối LiveKit:', err);
        setErrorMessage(`Lỗi kết nối: ${err.message || 'Không thể truy cập LiveKit server.'}`);
      });

    return () => {
      if (activeRoom) {
        activeRoom.disconnect();
      }
    };
  }, [token, serverUrl]);

  const toggleMic = async () => {
    if (!room) return;
    const newState = !isMicOn;
    await room.localParticipant.setMicrophoneEnabled(newState);
    setIsMicOn(newState);
  };

  const toggleCam = async () => {
    if (!room) return;
    const newState = !isCamOn;
    await room.localParticipant.setCameraEnabled(newState);
    setIsCamOn(newState);
  };

  const toggleScreenShare = async () => {
    if (!room) return;
    try {
      const newState = !isScreenSharing;
      await room.localParticipant.setScreenShareEnabled(newState);
      setIsScreenSharing(newState);
    } catch (err) {
      console.error('Lỗi chia sẻ màn hình:', err);
    }
  };

  const handleDisconnect = () => {
    if (room) {
      room.disconnect();
    }
    onLeave();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', position: 'relative' }}>
      {reconnecting && (
        <div className="status-toast">Mất kết nối! Đang tự động kết nối lại...</div>
      )}

      {errorMessage && (
        <div className="error-banner" style={{ margin: '1rem' }}>
          {errorMessage}
          <button className="btn btn-danger" style={{ marginTop: '0.5rem' }} onClick={onLeave}>
            Quay lại
          </button>
        </div>
      )}

      <div className="meeting-layout">
        <div className="video-grid-container" ref={videoContainerRef}>
          {participants.map((p) => (
            <ParticipantTile key={p.identity} participant={p} />
          ))}
        </div>

        {showSidebar && (
          <ParticipantList participants={participants} localParticipant={room?.localParticipant} />
        )}
      </div>

      <ControlsBar
        isMicOn={isMicOn}
        isCamOn={isCamOn}
        isScreenSharing={isScreenSharing}
        showSidebar={showSidebar}
        onToggleMic={toggleMic}
        onToggleCam={toggleCam}
        onToggleScreenShare={toggleScreenShare}
        onToggleSidebar={() => setShowSidebar(!showSidebar)}
        onLeave={handleDisconnect}
      />
    </div>
  );
}

function ParticipantTile({ participant }) {
  const videoRef = useRef(null);
  const audioRef = useRef(null);
  const [hasVideo, setHasVideo] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  useEffect(() => {
    const handleTrackChanged = () => {
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
        if (micPub.track && !participant.isLocal && audioRef.current) {
          micPub.track.attach(audioRef.current);
        }
      }
    };

    handleTrackChanged();

    participant.on('trackSubscribed', handleTrackChanged);
    participant.on('trackUnsubscribed', handleTrackChanged);
    participant.on('trackMuted', handleTrackChanged);
    participant.on('trackUnmuted', handleTrackChanged);

    return () => {
      participant.off('trackSubscribed', handleTrackChanged);
      participant.off('trackUnsubscribed', handleTrackChanged);
      participant.off('trackMuted', handleTrackChanged);
      participant.off('trackUnmuted', handleTrackChanged);
    };
  }, [participant]);

  return (
    <div className="video-tile">
      <audio ref={audioRef} autoPlay />
      <video ref={videoRef} autoPlay playsInline muted={participant.isLocal} style={{ display: hasVideo ? 'block' : 'none' }} />
      {!hasVideo && (
        <div className="avatar-fallback">
          {participant.name ? participant.name.charAt(0).toUpperCase() : 'U'}
        </div>
      )}
      <div className="tile-badge">
        <span>{participant.name || participant.identity} {participant.isLocal ? '(Bạn)' : ''}</span>
        {isMuted ? ' 🔇' : ' 🎙️'}
      </div>
    </div>
  );
}

export default MeetingRoom;
