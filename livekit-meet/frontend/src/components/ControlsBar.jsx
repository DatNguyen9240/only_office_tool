import React from 'react';
import { Mic, MicOff, Video, VideoOff, Monitor, PhoneOff, Users } from 'lucide-react';

function ControlsBar({
  isMicOn,
  isCamOn,
  isScreenSharing,
  showSidebar,
  onToggleMic,
  onToggleCam,
  onToggleScreenShare,
  onToggleSidebar,
  onLeave,
}) {
  return (
    <div className="controls-bar">
      <div className="controls-group">
        <button
          className={`btn-icon ${isMicOn ? 'active' : 'off'}`}
          onClick={onToggleMic}
          title={isMicOn ? 'Tắt Mic' : 'Bật Mic'}
        >
          {isMicOn ? <Mic size={20} /> : <MicOff size={20} />}
        </button>

        <button
          className={`btn-icon ${isCamOn ? 'active' : 'off'}`}
          onClick={onToggleCam}
          title={isCamOn ? 'Tắt Camera' : 'Bật Camera'}
        >
          {isCamOn ? <Video size={20} /> : <VideoOff size={20} />}
        </button>

        <button
          className={`btn-icon ${isScreenSharing ? 'active' : ''}`}
          onClick={onToggleScreenShare}
          title="Chia sẻ màn hình"
        >
          <Monitor size={20} />
        </button>
      </div>

      <div className="controls-group">
        <button
          className={`btn-icon ${showSidebar ? 'active' : ''}`}
          onClick={onToggleSidebar}
          title="Danh sách người tham gia"
        >
          <Users size={20} />
        </button>

        <button
          className="btn-icon btn-danger"
          onClick={onLeave}
          title="Rời phòng họp"
        >
          <PhoneOff size={20} />
        </button>
      </div>
    </div>
  );
}

export default ControlsBar;
