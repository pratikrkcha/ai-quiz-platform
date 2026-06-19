import { io } from 'socket.io-client';

const socket = io('http://localhost:4000', { autoConnect: false });

socket.on('connect', () => {
  console.log('Connected with ID:', socket.id);
  console.log('Emitting host_join...');
  
  // Use a mock room Code for testing, but wait, we need a real room to avoid "Room does not exist"!
  // We can't easily get a real room without making an API call. Let's make an API call first!
});

async function run() {
  const res = await fetch('http://localhost:4000/api/rooms', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ topic: 'Test Topic' })
  });
  const data = await res.json();
  console.log('Room created:', data.roomCode);

  socket.connect();
  
  socket.on('connect', () => {
    socket.emit('host_join', { roomCode: data.roomCode, hostToken: data.hostToken });
  });

  socket.on('host_joined', (msg) => {
    console.log('Successfully joined as host!', msg);
    console.log('Emitting host_start_game...');
    socket.emit('host_start_game');
  });

  socket.on('question_started', (msg) => {
    console.log('Game started! Question received:', msg);
    process.exit(0);
  });

  socket.on('error', (err) => {
    console.error('Socket Error received:', err);
    process.exit(1);
  });
}

run();
