import React from 'react';
import { Mic, MicOff, Video, VideoOff, User } from 'lucide-react';
import { Track } from 'livekit-client';

function ParticipantList({ participants, localParticipant }) {
  return (
    <div className="sidebar">
      <div className="sidebar-title">
        <span>Người tham gia</span>
        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          ({participants.length})
        </span>
      </div>

      <div style={{ overflowY: 'auto', flex: 1 }}>
        {participants.map((p) => {
          const micPub = p.getTrackPublication(Track.Source.Microphone);
          const camPub = p.getTrackPublication(Track.Source.Camera);

          const isMicMuted = !micPub || micPub.isMuted;
          const isCamMuted = !camPub || camPub.isMuted;

          return (
            <div key={p.identity} className="participant-item">
              <div className="participant-info">
                <User size={16} />
                <span>
                  {p.name || p.identity} {p.isLocal ? '(Bạn)' : ''}
                </span>
              </div>
              <div className="participant-icons">
                {isMicMuted ? (
                  <MicOff size={16} color="var(--danger)" />
                ) : (
                  <Mic size={16} color="var(--success)" />
                )}
                {isCamMuted ? (
                  <VideoOff size={16} color="var(--danger)" />
                ) : (
                  <Video size={16} color="var(--success)" />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default ParticipantList;
