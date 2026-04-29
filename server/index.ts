import express from 'express';
import { createServer } from 'node:http';
import { Server } from 'socket.io';
import type { Socket } from 'socket.io';

const PORT = Number(process.env.PORT ?? 3001);
const SPIN_DURATION_MS = 1500;

interface GameSnapshot {
  coverOpen: boolean;
  guessAngle: number;
  guessLocked: boolean;
  isSpinning: boolean;
  roundResult: RoundResult | null;
  wheelRotation: number;
}

interface Room {
  code: string;
  names: PlayerNames;
  players: Map<string, PlayerSlot>;
  round: number;
  roundTimer?: NodeJS.Timeout;
  scores: Scoreboard;
  spinTimer?: NodeJS.Timeout;
  state: GameSnapshot;
}

type PlayerRole = 'guesser' | 'spinner';
type PlayerSlot = 'player1' | 'player2';
type Scoreboard = Record<PlayerSlot, number>;
type PlayerNames = Record<PlayerSlot, string | null>;
type RoundResult = {
  nextRoundAt: number;
  score: number;
  scoredPlayer: PlayerSlot;
};

const initialState = (): GameSnapshot => ({
  coverOpen: false,
  guessAngle: 90,
  guessLocked: false,
  isSpinning: false,
  roundResult: null,
  wheelRotation: 90,
});

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_ORIGIN ?? 'http://localhost:3000',
  },
});

const rooms = new Map<string, Room>();

app.get('/health', (_request, response) => {
  response.json({ ok: true });
});

io.on('connection', (socket) => {
  socket.on('create_room', (playerName?: string) => {
    const room = createRoom();
    joinRoom(socket, room, playerName);
    socket.join(room.code);
    emitRoom(room);
  });

  socket.on('join_room', (code: string, playerName?: string) => {
    const room = rooms.get(normalizeCode(code));

    if (!room) {
      socket.emit('room_error', 'Sala no encontrada');
      return;
    }

    if (room.players.size >= 2 && !room.players.has(socket.id)) {
      socket.emit('room_error', 'Sala llena');
      return;
    }

    joinRoom(socket, room, playerName);
    socket.join(room.code);
    emitRoom(room);
  });

  socket.on('spin', () => {
    const room = getSocketRoom(socket.id);
    if (!room) return;
    if (getRole(room, socket.id) !== 'spinner') return;
    if (room.state.roundResult) return;

    if (room.spinTimer) {
      clearTimeout(room.spinTimer);
    }

    const randomAngle = Math.round(Math.random() * 180);
    const currentTurns = Math.ceil(room.state.wheelRotation / 360);

    room.state = {
      ...room.state,
      coverOpen: false,
      guessLocked: false,
      isSpinning: true,
      roundResult: null,
      wheelRotation: (currentTurns + 4) * 360 + randomAngle,
    };

    emitRoom(room);

    room.spinTimer = setTimeout(() => {
      room.state = { ...room.state, isSpinning: false };
      room.spinTimer = undefined;
      emitRoom(room);
    }, SPIN_DURATION_MS);
  });

  socket.on('toggle_cover', () => {
    const room = getSocketRoom(socket.id);
    if (!room) return;
    if (getRole(room, socket.id) !== 'spinner') return;
    if (room.state.roundResult) return;

    room.state = { ...room.state, coverOpen: !room.state.coverOpen };
    emitRoom(room);
  });

  socket.on('set_guess', (guessAngle: number) => {
    const room = getSocketRoom(socket.id);
    if (!room || typeof guessAngle !== 'number') return;
    if (getRole(room, socket.id) !== 'guesser') return;
    if (room.state.roundResult) return;

    room.state = {
      ...room.state,
      guessAngle: Math.max(0, Math.min(180, guessAngle)),
      guessLocked: false,
    };
    emitRoom(room);
  });

  socket.on('lock_guess', () => {
    const room = getSocketRoom(socket.id);
    if (!room) return;
    if (getRole(room, socket.id) !== 'guesser') return;
    if (room.state.roundResult) return;

    room.state = {
      ...room.state,
      guessLocked: true,
    };
    emitRoom(room);
  });

  socket.on('finish_round', () => {
    const room = getSocketRoom(socket.id);
    if (!room) return;
    if (getRole(room, socket.id) !== 'spinner') return;
    if (room.state.roundResult) return;

    if (!room.state.guessLocked) {
      socket.emit('room_notice', 'La otra persona todavia no ha pulsado Adivinar');
      return;
    }

    const guesserSlot = getGuesserSlot(room);
    const score = calculateScore(room.state.wheelRotation, room.state.guessAngle);
    const nextRoundAt = Date.now() + 3200;

    room.scores = {
      ...room.scores,
      [guesserSlot]: room.scores[guesserSlot] + score,
    };
    room.state = {
      ...room.state,
      coverOpen: true,
      roundResult: {
        nextRoundAt,
        score,
        scoredPlayer: guesserSlot,
      },
    };

    emitRoom(room);

    room.roundTimer = setTimeout(() => {
      room.round += 1;
      room.roundTimer = undefined;
      room.state = {
        ...room.state,
        coverOpen: false,
        guessAngle: 90,
        guessLocked: false,
        roundResult: null,
      };
      emitRoom(room);
    }, 3200);
  });

  socket.on('leave_room', () => {
    leaveCurrentRoom(socket);
    socket.emit('left_room');
  });

  socket.on('disconnect', () => {
    leaveCurrentRoom(socket);
  });
});

httpServer.listen(PORT, () => {
  console.log(`Socket server running on http://localhost:${PORT}`);
});

function createRoom() {
  let code = generateCode();

  while (rooms.has(code)) {
    code = generateCode();
  }

  const room: Room = {
    code,
    names: {
      player1: null,
      player2: null,
    },
    players: new Map(),
    round: 1,
    scores: {
      player1: 0,
      player2: 0,
    },
    state: initialState(),
  };

  rooms.set(code, room);
  return room;
}

function joinRoom(socket: Socket, room: Room, playerName?: string) {
  leaveCurrentRoom(socket);
  const slots = Array.from(room.players.values());
  const slot: PlayerSlot = slots.includes('player1') ? 'player2' : 'player1';
  room.players.set(socket.id, slot);
  room.names[slot] = normalizePlayerName(playerName, slot);
}

function leaveCurrentRoom(socket: Socket) {
  const room = getSocketRoom(socket.id);
  if (!room) return;

  const slot = room.players.get(socket.id);
  room.players.delete(socket.id);
  if (slot) {
    room.names[slot] = null;
  }
  socket.leave(room.code);

  if (room.players.size === 0) {
    if (room.spinTimer) clearTimeout(room.spinTimer);
    if (room.roundTimer) clearTimeout(room.roundTimer);
    rooms.delete(room.code);
  } else {
    emitRoom(room);
  }
}

function getSocketRoom(socketId: string) {
  return Array.from(rooms.values()).find((room) => room.players.has(socketId));
}

function emitRoom(room: Room) {
  room.players.forEach((_slot, socketId) => {
    io.to(socketId).emit('room_state', {
      code: room.code,
      names: room.names,
      players: room.players.size,
      role: getRole(room, socketId),
      round: room.round,
      scores: room.scores,
      state: room.state,
    });
  });
}

function getRole(room: Room, socketId: string): PlayerRole | undefined {
  const slot = room.players.get(socketId);
  if (!slot) return undefined;

  return slot === getGuesserSlot(room) ? 'guesser' : 'spinner';
}

function getGuesserSlot(room: Room): PlayerSlot {
  return room.round % 2 === 1 ? 'player1' : 'player2';
}

function calculateScore(wheelRotation: number, guessAngle: number) {
  const targetAngle = ((wheelRotation % 180) + 180) % 180;
  const rawDifference = Math.abs(targetAngle - guessAngle);
  const difference = Math.min(rawDifference, 180 - rawDifference);

  if (difference <= 11) return 3;
  if (difference <= 22) return 2;
  if (difference <= 34) return 1;
  return 0;
}

function generateCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 4 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join('');
}

function normalizeCode(code: string) {
  return String(code ?? '').trim().toUpperCase();
}

function normalizePlayerName(playerName: string | undefined, slot: PlayerSlot) {
  const trimmed = String(playerName ?? '').trim();
  if (!trimmed) return slot === 'player1' ? 'Persona 1' : 'Persona 2';

  return trimmed.slice(0, 18);
}
