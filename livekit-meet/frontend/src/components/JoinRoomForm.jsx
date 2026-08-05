import React, { useState } from 'react';
import { DoorOpen } from 'lucide-react';

function JoinRoomForm({ onJoined }) {
  const [roomName, setRoomName] = useState('phong-hop-1');
  const [participantName, setParticipantName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!roomName.trim() || !participantName.trim()) {
      setError('Vui lòng nhập tên của bạn và mã phòng.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${API_URL}/api/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          roomName: roomName.trim(),
          participantName: participantName.trim(),
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Không thể tạo token kết nối.');
      }

      const data = await response.json();
      onJoined({
        token: data.token,
        serverUrl: data.serverUrl,
        roomName: roomName.trim(),
        participantName: participantName.trim(),
      });
    } catch (err) {
      console.error(err);
      setError(err.message || 'Lỗi kết nối tới server tạo token.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="join-wrapper">
      <div className="card">
        <h1 className="title">LiveKit Meet</h1>
        <p className="subtitle">Hệ thống họp trực tuyến self-hosted</p>

        {error && <div className="error-banner">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Tên của bạn</label>
            <input
              type="text"
              placeholder="Ví dụ: Nguyen Van A"
              value={participantName}
              onChange={(e) => setParticipantName(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label>Mã phòng họp</label>
            <input
              type="text"
              placeholder="phong-hop-1"
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="btn" disabled={loading}>
            <DoorOpen size={20} />
            {loading ? 'Đang tham gia...' : 'Tham gia phòng họp'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default JoinRoomForm;
