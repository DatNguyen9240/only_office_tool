import React from "react";
import {
  AudioOutlined,
  AudioMutedOutlined,
  VideoCameraOutlined,
  DesktopOutlined,
  PhoneOutlined,
  SettingOutlined,
  PlayCircleOutlined,
} from "@ant-design/icons";
import { Dropdown, MenuProps, Tooltip } from "antd";

interface MeetingControlBarProps {
  isMicOn: boolean;
  isCamOn: boolean;
  isScreenSharing: boolean;
  isRecording: boolean;
  audioDevices: MediaDeviceInfo[];
  videoDevices: MediaDeviceInfo[];
  selectedAudioId?: string;
  selectedVideoId?: string;
  onToggleMic: () => void;
  onToggleCam: () => void;
  onToggleScreenShare: () => void;
  onToggleRecording: () => void;
  onSelectAudioDevice?: (deviceId: string) => void;
  onSelectVideoDevice?: (deviceId: string) => void;
  onLeave: () => void;
}

export const MeetingControlBar: React.FC<MeetingControlBarProps> = ({
  isMicOn,
  isCamOn,
  isScreenSharing,
  isRecording,
  audioDevices,
  videoDevices,
  selectedAudioId,
  selectedVideoId,
  onToggleMic,
  onToggleCam,
  onToggleScreenShare,
  onToggleRecording,
  onSelectAudioDevice,
  onSelectVideoDevice,
  onLeave,
}) => {
  const audioMenu: MenuProps = {
    items: audioDevices.map((dev) => ({
      key: dev.deviceId,
      label: dev.label || `Microphone ${dev.deviceId.substring(0, 5)}`,
      onClick: () => onSelectAudioDevice && onSelectAudioDevice(dev.deviceId),
    })),
    selectedKeys: selectedAudioId ? [selectedAudioId] : [],
  };

  const videoMenu: MenuProps = {
    items: videoDevices.map((dev) => ({
      key: dev.deviceId,
      label: dev.label || `Camera ${dev.deviceId.substring(0, 5)}`,
      onClick: () => onSelectVideoDevice && onSelectVideoDevice(dev.deviceId),
    })),
    selectedKeys: selectedVideoId ? [selectedVideoId] : [],
  };

  return (
    <div className="meeting-control-bar">
      {/* Left side: Status indicators */}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div className="meeting-status-badge">
          <span className="meeting-status-dot" />
          <span>LiveKit Room Active</span>
        </div>
        {isRecording && (
          <div className="meeting-rec-badge">
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                backgroundColor: "#ef4444",
                boxShadow: "0 0 8px #ef4444",
              }}
            />
            <span>REC (Ghi hình)</span>
          </div>
        )}
      </div>

      {/* Middle: Controls */}
      <div className="meeting-controls-center">
        {/* Mic Control */}
        <div className="meeting-btn-group">
          <Tooltip title={isMicOn ? "Tắt Microphone" : "Bật Microphone"}>
            <button
              onClick={onToggleMic}
              className={`meeting-btn meeting-btn-group-left ${
                !isMicOn ? "meeting-btn-active-red" : ""
              }`}
            >
              {isMicOn ? <AudioOutlined /> : <AudioMutedOutlined />}
            </button>
          </Tooltip>
          {audioDevices.length > 0 && (
            <Dropdown menu={audioMenu} trigger={["click"]}>
              <button className="meeting-btn-group-right">
                <SettingOutlined style={{ fontSize: 13 }} />
              </button>
            </Dropdown>
          )}
        </div>

        {/* Camera Control */}
        <div className="meeting-btn-group">
          <Tooltip title={isCamOn ? "Tắt Camera" : "Bật Camera"}>
            <button
              onClick={onToggleCam}
              className={`meeting-btn meeting-btn-group-left ${
                !isCamOn ? "meeting-btn-active-red" : ""
              }`}
            >
              <VideoCameraOutlined />
            </button>
          </Tooltip>
          {videoDevices.length > 0 && (
            <Dropdown menu={videoMenu} trigger={["click"]}>
              <button className="meeting-btn-group-right">
                <SettingOutlined style={{ fontSize: 13 }} />
              </button>
            </Dropdown>
          )}
        </div>

        {/* Screen Share Control */}
        <Tooltip title={isScreenSharing ? "Dừng chia sẻ màn hình" : "Chia sẻ màn hình"}>
          <button
            onClick={onToggleScreenShare}
            className={`meeting-btn ${
              isScreenSharing ? "meeting-btn-active-indigo" : ""
            }`}
          >
            <DesktopOutlined />
          </button>
        </Tooltip>

        {/* Recording Toggle */}
        <Tooltip title={isRecording ? "Dừng Ghi hình" : "Bắt đầu Ghi hình cuộc họp"}>
          <button
            onClick={onToggleRecording}
            className={`meeting-btn ${
              isRecording ? "meeting-btn-active-red" : ""
            }`}
          >
            <PlayCircleOutlined />
          </button>
        </Tooltip>
      </div>

      {/* Right side: Leave */}
      <div>
        <button onClick={onLeave} className="meeting-leave-btn">
          <PhoneOutlined style={{ transform: "rotate(135deg)" }} />
          <span>Rời phòng</span>
        </button>
      </div>
    </div>
  );
};
