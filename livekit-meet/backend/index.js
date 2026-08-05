const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { AccessToken } = require('livekit-server-sdk');

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;
const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY || 'devkey';
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET || 'secret';
const PUBLIC_LIVEKIT_URL = process.env.PUBLIC_LIVEKIT_URL || 'ws://localhost:9621';

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.post('/api/token', async (req, res) => {
  try {
    const { roomName, participantName } = req.body;

    if (!roomName || !participantName) {
      return res.status(400).json({ error: 'Cần cung cấp roomName và participantName' });
    }

    const at = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
      identity: participantName,
      name: participantName,
      ttl: '1h',
    });

    at.addGrant({
      roomJoin: true,
      room: roomName,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    });

    const token = await at.toJwt();

    return res.json({
      token,
      serverUrl: PUBLIC_LIVEKIT_URL,
    });
  } catch (error) {
    console.error('Lỗi sinh token:', error);
    return res.status(500).json({ error: 'Không thể khởi tạo token họp' });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Backend Token API đang chạy tại port ${PORT}`);
  console.log(`LiveKit API Key: ${LIVEKIT_API_KEY}`);
  console.log(`Public LiveKit URL: ${PUBLIC_LIVEKIT_URL}`);
});
