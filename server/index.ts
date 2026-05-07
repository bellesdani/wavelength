import express from 'express';
import { randomInt as cryptoRandomInt } from 'node:crypto';
import { existsSync } from 'node:fs';
import { createServer } from 'node:http';
import path from 'node:path';
import { Server } from 'socket.io';
import type { Socket } from 'socket.io';

const PORT = Number(process.env.PORT ?? 3001);
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN ?? (process.env.NODE_ENV === 'production' ? undefined : 'http://localhost:3000');
const DEFAULT_SPIN_DURATION_MS = 1800;
const MIN_EXTRA_TURNS = 4;
const MAX_EXTRA_TURNS = 7;
const SPIN_DURATION_RANGE_MS = {
  max: 2600,
  min: 1300,
};
const ROUND_RESULT_DURATION_MS = 3000;
const ROOM_CODE_LENGTH = 6;
const MAX_ROOMS = 500;
const ROOM_IDLE_TTL_MS = 2 * 60 * 60 * 1000;
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;
const CREATE_ROOM_LIMIT = {
  max: 8,
  windowMs: 5 * 60 * 1000,
};
const JOIN_ROOM_LIMIT = {
  max: 20,
  windowMs: 60 * 1000,
};
const SCORE_THRESHOLDS = {
  one: 24,
  three: 6,
  two: 14,
};

interface GameSnapshot {
  coverOpen: boolean;
  guessAngle: number;
  guessLocked: boolean;
  isSpinning: boolean;
  roundResult: RoundResult | null;
  spinDurationMs: number;
  wheelRotation: number;
}

interface Room {
  code: string;
  history: RoundHistoryEntry[];
  lastActivityAt: number;
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
type RoundHistoryEntry = {
  round: number;
  score: number;
  scoredPlayer: PlayerSlot;
};
type RoundResult = {
  nextRoundAt: number;
  score: number;
  scoredPlayer: PlayerSlot;
};
type RateBucket = {
  count: number;
  resetAt: number;
};

const initialState = (): GameSnapshot => ({
  coverOpen: false,
  guessAngle: 90,
  guessLocked: false,
  isSpinning: false,
  roundResult: null,
  spinDurationMs: DEFAULT_SPIN_DURATION_MS,
  wheelRotation: 90,
});

const app = express();
app.disable('x-powered-by');
const httpServer = createServer(app);
const io = new Server(httpServer, CLIENT_ORIGIN ? { cors: { origin: CLIENT_ORIGIN } } : {});

const rooms = new Map<string, Room>();
const createRoomAttempts = new Map<string, RateBucket>();
const joinRoomAttempts = new Map<string, RateBucket>();

setInterval(cleanupState, CLEANUP_INTERVAL_MS).unref();

app.get('/health', (_request, response) => {
  response.json({ ok: true });
});

const distPath = path.resolve(process.cwd(), 'dist');
const indexPath = path.join(distPath, 'index.html');

if (existsSync(indexPath)) {
  app.use(express.static(distPath, { maxAge: '1y', index: false }));
  app.get('*', (_request, response) => {
    response.sendFile(indexPath);
  });
}

io.on('connection', (socket) => {
  const clientKey = getClientKey(socket);

  socket.on('create_room', (playerName?: string) => {
    if (!hasPlayerName(playerName)) {
      socket.emit('room_error', 'Pon tu nombre para jugar');
      return;
    }

    if (!consumeRateLimit(createRoomAttempts, clientKey, CREATE_ROOM_LIMIT)) {
      socket.emit('room_error', 'Demasiadas salas creadas. Espera un momento.');
      return;
    }

    if (rooms.size >= MAX_ROOMS) {
      socket.emit('room_error', 'Hay demasiadas salas activas. Prueba en un rato.');
      return;
    }

    const room = createRoom();
    joinRoom(socket, room, playerName);
    socket.join(room.code);
    emitRoom(room);
  });

  socket.on('join_room', (code: string, playerName?: string) => {
    if (!hasPlayerName(playerName)) {
      socket.emit('room_error', 'Pon tu nombre para jugar');
      return;
    }

    if (!consumeRateLimit(joinRoomAttempts, clientKey, JOIN_ROOM_LIMIT)) {
      socket.emit('room_error', 'Demasiados intentos de entrar. Espera un momento.');
      return;
    }

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
    touchRoom(room);
    emitRoom(room);
  });

  socket.on('spin', () => {
    const room = getSocketRoom(socket.id);
    if (!room) return;
    if (getRole(room, socket.id) !== 'spinner') return;
    if (room.state.roundResult) return;
    touchRoom(room);

    if (room.spinTimer) {
      clearTimeout(room.spinTimer);
    }

    const randomAngle = Math.round(Math.random() * 180);
    const extraTurns = randomInt(MIN_EXTRA_TURNS, MAX_EXTRA_TURNS);
    const spinDurationMs = randomInt(SPIN_DURATION_RANGE_MS.min, SPIN_DURATION_RANGE_MS.max);
    const currentTurns = Math.ceil(room.state.wheelRotation / 360);

    room.state = {
      ...room.state,
      coverOpen: false,
      guessLocked: false,
      isSpinning: true,
      roundResult: null,
      spinDurationMs,
      wheelRotation: (currentTurns + extraTurns) * 360 + randomAngle,
    };

    emitRoom(room);

    room.spinTimer = setTimeout(() => {
      room.state = { ...room.state, isSpinning: false };
      room.spinTimer = undefined;
      emitRoom(room);
    }, spinDurationMs);
  });

  socket.on('toggle_cover', () => {
    const room = getSocketRoom(socket.id);
    if (!room) return;
    if (getRole(room, socket.id) !== 'spinner') return;
    if (room.state.roundResult) return;
    touchRoom(room);

    room.state = { ...room.state, coverOpen: !room.state.coverOpen };
    emitRoom(room);
  });

  socket.on('set_guess', (guessAngle: number) => {
    const room = getSocketRoom(socket.id);
    if (!room || typeof guessAngle !== 'number') return;
    if (getRole(room, socket.id) !== 'guesser') return;
    if (room.state.roundResult) return;
    touchRoom(room);

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
    touchRoom(room);

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
    touchRoom(room);

    if (!room.state.guessLocked) {
      socket.emit('room_notice', 'La otra persona todavia no ha pulsado Adivinar');
      return;
    }

    const guesserSlot = getGuesserSlot(room);
    const score = calculateScore(room.state.wheelRotation, room.state.guessAngle);
    const nextRoundAt = Date.now() + ROUND_RESULT_DURATION_MS;

    room.scores = {
      ...room.scores,
      [guesserSlot]: room.scores[guesserSlot] + score,
    };
    room.history = [
      ...room.history,
      {
        round: room.round,
        score,
        scoredPlayer: guesserSlot,
      },
    ].slice(-8);
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
    }, ROUND_RESULT_DURATION_MS);
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
    history: [],
    lastActivityAt: Date.now(),
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
  touchRoom(room);
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
    destroyRoom(room);
  } else {
    touchRoom(room);
    emitRoom(room);
  }
}

function getSocketRoom(socketId: string) {
  return Array.from(rooms.values()).find((room) => room.players.has(socketId));
}

function emitRoom(room: Room) {
  const serverTime = Date.now();

  room.players.forEach((_slot, socketId) => {
    io.to(socketId).emit('room_state', {
      code: room.code,
      history: room.history,
      names: room.names,
      players: room.players.size,
      role: getRole(room, socketId),
      round: room.round,
      scores: room.scores,
      serverTime,
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

  if (difference <= SCORE_THRESHOLDS.three) return 3;
  if (difference <= SCORE_THRESHOLDS.two) return 2;
  if (difference <= SCORE_THRESHOLDS.one) return 1;
  return 0;
}

function generateCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: ROOM_CODE_LENGTH }, () => alphabet[cryptoRandomInt(alphabet.length)]).join('');
}

function randomInt(min: number, max: number) {
  return cryptoRandomInt(min, max + 1);
}

function normalizeCode(code: string) {
  return String(code ?? '').trim().toUpperCase();
}

function normalizePlayerName(playerName: string | undefined, slot: PlayerSlot) {
  const trimmed = String(playerName ?? '').trim();
  if (!trimmed) return slot === 'player1' ? 'Persona 1' : 'Persona 2';

  return trimmed.slice(0, 18);
}

function hasPlayerName(playerName: string | undefined) {
  return String(playerName ?? '').trim().length > 0;
}

function touchRoom(room: Room) {
  room.lastActivityAt = Date.now();
}

function consumeRateLimit(buckets: Map<string, RateBucket>, key: string, limit: { max: number; windowMs: number }) {
  const now = Date.now();
  const current = buckets.get(key);

  if (!current || current.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + limit.windowMs });
    return true;
  }

  if (current.count >= limit.max) {
    return false;
  }

  current.count += 1;
  return true;
}

function getClientKey(socket: Socket) {
  const forwardedFor = socket.handshake.headers['x-forwarded-for'];
  const forwardedIp = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor?.split(',')[0];
  return forwardedIp?.trim() || socket.handshake.address || socket.id;
}

function cleanupState() {
  const now = Date.now();

  cleanupRateBuckets(createRoomAttempts, now);
  cleanupRateBuckets(joinRoomAttempts, now);

  rooms.forEach((room) => {
    if (now - room.lastActivityAt > ROOM_IDLE_TTL_MS) {
      destroyRoom(room, true);
    }
  });
}

function cleanupRateBuckets(buckets: Map<string, RateBucket>, now: number) {
  buckets.forEach((bucket, key) => {
    if (bucket.resetAt <= now) {
      buckets.delete(key);
    }
  });
}

function destroyRoom(room: Room, notifyPlayers = false) {
  if (room.spinTimer) clearTimeout(room.spinTimer);
  if (room.roundTimer) clearTimeout(room.roundTimer);

  if (notifyPlayers) {
    room.players.forEach((_slot, socketId) => {
      const socket = io.sockets.sockets.get(socketId);
      socket?.leave(room.code);
      socket?.emit('room_error', 'Sala cerrada por inactividad');
      socket?.emit('left_room');
    });
  }

  rooms.delete(room.code);
}
