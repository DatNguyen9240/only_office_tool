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
import { Button, Dropdown, MenuProps, Tooltip } from "antd";

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
    <div className="w-full bg-slate-900/90 backdrop-blur-md border-t border-slate-800 px-6 py-3 flex items-center justify-between z-30">
      {/* Left side: status */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800 border border-slate-700 text-slate-300 text-xs">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          LiveKit Room Active
        </div>
        {isRecording && (
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-red-950/80 border border-red-800 text-red-300 text-xs font-medium">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
            REC (Ghi hình)
          </div>
        )}
      </div>

      {/* Middle: Core controls */}
      <div className="flex items-center gap-3">
        {/* Mic Control */}
        <div className="flex items-center">
          <Tooltip title={isMicOn ? "Tắt Microphone" : "Bật Microphone"}>
            <button
              onClick={onToggleMic}
              className={`p-3.5 rounded-l-xl transition-all ${
                isMicOn
                  ? "bg-slate-800 hover:bg-slate-700 text-white"
                  : "bg-red-600 hover:bg-red-500 text-white"
              }`}
            >
              {isMicOn ? <AudioOutlined style={{ fontSize: 18 }} /> : <AudioMutedOutlined style={{ fontSize: 18 }} />}
            </button>
          </Tooltip>
          {audioDevices.length > 0 && (
            <Dropdown menu={audioMenu} trigger={["click"]}>
              <button className="p-3.5 rounded-r-xl bg-slate-800 hover:bg-slate-700 border-l border-slate-700 text-slate-400 hover:text-white">
                <SettingOutlined style={{ fontSize: 14 }} />
              </button>
            </Dropdown>
          )}
        </div>

        {/* Camera Control */}
        <div className="flex items-center">
          <Tooltip title={isCamOn ? "Tắt Camera" : "Bật Camera"}>
            <button
              onClick={onToggleCam}
              className={`p-3.5 rounded-l-xl transition-all ${
                isCamOn
                  ? "bg-slate-800 hover:bg-slate-700 text-white"
                  : "bg-red-600 hover:bg-red-500 text-white"
              }`}
            >
              <VideoCameraOutlined style={{ fontSize: 18 }} />
            </button>
          </Tooltip>
          {videoDevices.length > 0 && (
            <Dropdown menu={videoMenu} trigger={["click"]}>
              <button className="p-3.5 rounded-r-xl bg-slate-800 hover:bg-slate-700 border-l border-slate-700 text-slate-400 hover:text-white">
                <SettingOutlined style={{ fontSize: 14 }} />
              </button>
            </Dropdown>
          )}
        </div>

        {/* Screen Share */}
        <Tooltip title={isScreenSharing ? "Dừng chia sẻ màn hình" : "Chia sẻ màn hình"}>
          <button
            onClick={onToggleScreenShare}
            className={`p-3.5 rounded-xl transition-all ${
              isScreenSharing
                ? "bg-indigo-600 hover:bg-indigo-500 text-white"
                : "bg-slate-800 hover:bg-slate-700 text-slate-300"
            }`}
          >
            <DesktopOutlined style={{ fontSize: 18 }} />
          </button>
        </Tooltip>

        {/* Recording Toggle */}
        <Tooltip title={isRecording ? "Dừng Ghi hình" : "Bắt đầu Ghi hình cuộc họp"}>
          <button
            onClick={onToggleRecording}
            className={`p-3.5 rounded-xl transition-all ${
              isRecording
                ? "bg-red-600 hover:bg-red-500 text-white"
                : "bg-slate-800 hover:bg-slate-700 text-slate-300"
            }`}
          >
            <PlayCircleOutlined style={{ fontSize: 18 }} className={isRecording ? "animate-spin" : ""} />
          </button>
        </Tooltip>
      </div>

      {/* Right side: Leave */}
      <div>
        <Button
          type="primary"
          danger
          icon={<PhoneOutlined />}
          onClick={onLeave}
          className="h-11 px-5 rounded-xl font-medium"
        >
          Rời phòng
        </Button>
      </div>
    </div>
  );
};
