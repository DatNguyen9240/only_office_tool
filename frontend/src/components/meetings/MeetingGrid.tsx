import React from "react";
import { Participant } from "livekit-client";
import { ParticipantVideoTile } from "./ParticipantVideoTile";

interface MeetingGridProps {
  participants: Participant[];
}

export const MeetingGrid: React.FC<MeetingGridProps> = ({ participants }) => {
  const getGridColsClass = () => {
    const count = participants.length;
    if (count <= 1) return "grid-cols-1 max-w-4xl";
    if (count <= 4) return "grid-cols-1 md:grid-cols-2";
    if (count <= 9) return "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3";
    return "grid-cols-2 md:grid-cols-3 lg:grid-cols-4";
  };

  return (
    <div className="flex-1 w-full h-full p-4 overflow-y-auto flex items-center justify-center bg-slate-950">
      <div className={`grid gap-4 w-full h-full ${getGridColsClass()}`}>
        {participants.map((p) => (
          <ParticipantVideoTile key={p.identity} participant={p} />
        ))}
      </div>
    </div>
  );
};
