import React from "react";
import { Participant } from "livekit-client";
import { ParticipantVideoTile } from "./ParticipantVideoTile";

interface MeetingGridProps {
  participants: Participant[];
}

export const MeetingGrid: React.FC<MeetingGridProps> = ({ participants }) => {
  const getGridClass = () => {
    const count = participants.length;
    if (count <= 1) return "meeting-grid-1";
    if (count <= 2) return "meeting-grid-2";
    if (count <= 4) return "meeting-grid-4";
    return "meeting-grid-many";
  };

  return (
    <div className="meeting-grid-wrapper">
      <div className={`meeting-grid-container ${getGridClass()}`}>
        {participants.map((p) => (
          <ParticipantVideoTile key={p.identity} participant={p} />
        ))}
      </div>
    </div>
  );
};
