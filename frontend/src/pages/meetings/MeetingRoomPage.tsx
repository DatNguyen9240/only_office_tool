import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Room, RoomEvent, Participant, TrackPublication } from "livekit-client";
import { MeetingGrid } from "../../components/meetings/MeetingGrid";
import { MeetingControlBar } from "../../components/meetings/MeetingControlBar";
import { Spin, App, Input } from "antd";
import { VideoCameraOutlined } from "@ant-design/icons";
import { useAuthStore } from "@/store/useAuthStore";
import { apiRequest } from "@/lib/api";

import anonymousNames from "@/data/anonymousNames.json";

export const MeetingRoomPage: React.FC = () => {
  const { notification } = App.useApp();
  const { meetingId } = useParams<{ meetingId: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const [room, setRoom] = useState<Room | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [connecting, setConnecting] = useState<boolean>(false);
  const [participantName, setParticipantName] = useState<string>(() => {
    const randomIndex = Math.floor(Math.random() * anonymousNames.length);
    return anonymousNames[randomIndex];
  });
  const [joined, setJoined] = useState<boolean>(false);
  const [isMicOn, setIsMicOn] = useState<boolean>(true);
  const [isCamOn, setIsCamOn] = useState<boolean>(true);
  const [isScreenSharing, setIsScreenSharing] = useState<boolean>(false);
  const [isRecording, setIsRecording] = useState<boolean>(false);

  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedAudioId, setSelectedAudioId] = useState<string>("");
  const [selectedVideoId, setSelectedVideoId] = useState<string>("");

  useEffect(() => {
    if (user) {
      const displayName = user.name || user.email.split("@")[0];
      setParticipantName(displayName);
    } else {
      let storedName = sessionStorage.getItem("meeting_anonymous_name");
      if (!storedName) {
        const randomIndex = Math.floor(Math.random() * anonymousNames.length);
        storedName = anonymousNames[randomIndex];
        sessionStorage.setItem("meeting_anonymous_name", storedName);
      }
      setParticipantName(storedName);
    }
  }, [user]);

  useEffect(() => {
    if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
      navigator.mediaDevices.enumerateDevices().then((devices) => {
        setAudioDevices(devices.filter((d) => d.kind === "audioinput"));
        setVideoDevices(devices.filter((d) => d.kind === "videoinput"));
      });
    }
  }, []);

  const handleJoin = async () => {
    if (!meetingId) return;
    setConnecting(true);

    try {
      let participantId: string;
      let nameToUse = participantName.trim();

      if (user) {
        participantId = `${user.id}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        nameToUse = user.name || user.email.split("@")[0];
      } else {
        participantId = `guest_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      }

      const { token, serverUrl } = await apiRequest<{ token: string; serverUrl: string }>(
        `/meetings/${meetingId}/token`,
        {
          method: "POST",
          body: JSON.stringify({ participantName: nameToUse, participantId }),
        }
      );

      const activeRoom = new Room({
        adaptiveStream: true,
        dynacast: true,
        videoCaptureDefaults: {
          resolution: { width: 1280, height: 720, frameRate: 30 },
        },
      });

      const updateParticipants = () => {
        const all = [
          activeRoom.localParticipant,
          ...Array.from(activeRoom.remoteParticipants.values()),
        ];
        setParticipants([...all]);
      };

      activeRoom
        .on(RoomEvent.Connected, () => {
          updateParticipants();
          setJoined(true);
          setConnecting(false);
          // Enable devices asynchronously if available
          if (audioDevices.length > 0) {
            activeRoom.localParticipant.setMicrophoneEnabled(true).catch(console.warn);
            setIsMicOn(true);
          } else {
            setIsMicOn(false);
          }
          if (videoDevices.length > 0) {
            activeRoom.localParticipant.setCameraEnabled(true).catch(console.warn);
            setIsCamOn(true);
          } else {
            setIsCamOn(false);
          }
        })
        .on(RoomEvent.ParticipantConnected, updateParticipants)
        .on(RoomEvent.ParticipantDisconnected, updateParticipants)
        .on(RoomEvent.TrackSubscribed, updateParticipants)
        .on(RoomEvent.TrackUnsubscribed, updateParticipants)
        .on(RoomEvent.TrackMuted, updateParticipants)
        .on(RoomEvent.TrackUnmuted, updateParticipants);

      const wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const currentHost = window.location.hostname;
      const targetServerUrl = serverUrl || `${wsProtocol}//${currentHost}:7880`;

      await activeRoom.connect(targetServerUrl, token);
      setRoom(activeRoom);
    } catch (err: any) {
      setConnecting(false);
      notification.error({
        message: "Lỗi kết nối phòng họp",
        description: err.message || "Không thể khởi tạo LiveKit Room",
      });
    }
  };

  const toggleMic = async () => {
    if (!room) return;
    const nextState = !isMicOn;
    await room.localParticipant.setMicrophoneEnabled(nextState);
    setIsMicOn(nextState);
  };

  const toggleCam = async () => {
    if (!room) return;
    const nextState = !isCamOn;
    await room.localParticipant.setCameraEnabled(nextState);
    setIsCamOn(nextState);
  };

  const toggleScreenShare = async () => {
    if (!room) return;
    try {
      const nextState = !isScreenSharing;
      await room.localParticipant.setScreenShareEnabled(nextState);
      setIsScreenSharing(nextState);
    } catch (err) {
      notification.warning({ message: "Không thể chia sẻ màn hình" });
    }
  };

  const toggleRecording = async () => {
    if (!meetingId) return;
    try {
      const path = isRecording
        ? `/meetings/${meetingId}/stop-recording`
        : `/meetings/${meetingId}/start-recording`;

      await apiRequest(path, { method: "POST" });
      setIsRecording(!isRecording);
      notification.success({
        message: isRecording ? "Đã dừng ghi hình" : "Đã bắt đầu ghi hình cuộc họp",
      });
    } catch (err: any) {
      notification.error({
        message: "Lỗi thao tác ghi hình",
        description: err.message || "Đã xảy ra lỗi không xác định",
      });
    }
  };

  useEffect(() => {
    return () => {
      if (room) {
        room.localParticipant.getTrackPublications().forEach((publication: TrackPublication) => {
          if (publication.track) {
            publication.track.stop();
          }
        });
        room.disconnect();
      }
    };
  }, [room]);

  const handleLeave = () => {
    if (room) {
      room.localParticipant.getTrackPublications().forEach((publication: TrackPublication) => {
        if (publication.track) {
          publication.track.stop();
        }
      });
      room.disconnect();
    }
    navigate(`/meetings/${meetingId}/playback`);
  };

  if (!joined) {
    return (
      <div className="meeting-join-overlay">
        <div className="meeting-join-card">
          <div className="meeting-join-icon">
            <VideoCameraOutlined style={{ fontSize: 32 }} />
          </div>
          <div>
            <h2 className="meeting-join-title">Tham gia Cuộc họp Trực tuyến</h2>
            <p className="meeting-join-subtitle">Mã phòng: {meetingId}</p>
          </div>

          <div>
            <label className="meeting-join-input-label">Tên hiển thị của bạn</label>
            <Input
              value={participantName}
              onChange={(e) => setParticipantName(e.target.value)}
              placeholder="Nhập tên của bạn..."
              style={{
                height: 44,
                backgroundColor: "#0b0f19",
                borderColor: "#374151",
                color: "#ffffff",
                borderRadius: 12,
              }}
            />
          </div>

          <button
            onClick={handleJoin}
            disabled={connecting || !participantName.trim()}
            className="meeting-join-btn"
          >
            {connecting ? (
              <>
                <Spin size="small" />
                <span>Đang kết nối phòng họp...</span>
              </>
            ) : (
              "Vào phòng họp ngay"
            )}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="meeting-page-container">
      <MeetingGrid participants={participants} />

      <MeetingControlBar
        isMicOn={isMicOn}
        isCamOn={isCamOn}
        isScreenSharing={isScreenSharing}
        isRecording={isRecording}
        audioDevices={audioDevices}
        videoDevices={videoDevices}
        selectedAudioId={selectedAudioId}
        selectedVideoId={selectedVideoId}
        onToggleMic={toggleMic}
        onToggleCam={toggleCam}
        onToggleScreenShare={toggleScreenShare}
        onToggleRecording={toggleRecording}
        onSelectAudioDevice={(id) => {
          setSelectedAudioId(id);
          room?.switchActiveDevice("audioinput", id);
        }}
        onSelectVideoDevice={(id) => {
          setSelectedVideoId(id);
          room?.switchActiveDevice("videoinput", id);
        }}
        onLeave={handleLeave}
      />
    </div>
  );
};
