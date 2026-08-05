import React, { useState } from 'react';
import JoinRoomForm from './components/JoinRoomForm';
import MeetingRoom from './components/MeetingRoom';

function App() {
  const [connectionData, setConnectionData] = useState(null);

  const handleJoined = (data) => {
    setConnectionData(data);
  };

  const handleLeave = () => {
    setConnectionData(null);
  };

  return (
    <div className="app-container">
      {!connectionData ? (
        <JoinRoomForm onJoined={handleJoined} />
      ) : (
        <MeetingRoom
          token={connectionData.token}
          serverUrl={connectionData.serverUrl}
          roomName={connectionData.roomName}
          participantName={connectionData.participantName}
          onLeave={handleLeave}
        />
      )}
    </div>
  );
}

export default App;
