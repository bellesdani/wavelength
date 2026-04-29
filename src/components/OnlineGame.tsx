import { useEffect, useMemo, useState } from 'react';
import { DoorOpen, Eye, EyeOff, Flag, Link2, RefreshCw, Unplug } from 'lucide-react';
import { io } from 'socket.io-client';
import type { Socket } from 'socket.io-client';
import ActionButton from './ActionButton';
import Dial from './Dial';
import type { GameSnapshot, RoomSnapshot } from '../types/room';
import { SPIN_DURATION_MS } from '../types/room';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL ?? 'http://localhost:3001';

const initialState: GameSnapshot = {
  coverOpen: false,
  guessAngle: 90,
  guessLocked: false,
  isSpinning: false,
  roundResult: null,
  wheelRotation: 90,
};

const OnlineGame = () => {
  const socket = useMemo<Socket>(() => io(SOCKET_URL, { autoConnect: false }), []);
  const [room, setRoom] = useState<RoomSnapshot | null>(null);
  const [joinCode, setJoinCode] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [status, setStatus] = useState('Sin conectar');
  const [state, setState] = useState<GameSnapshot>(initialState);

  useEffect(() => {
    socket.connect();

    socket.on('connect', () => setStatus('Conectado'));
    socket.on('disconnect', () => setStatus('Desconectado'));
    socket.on('room_state', (snapshot: RoomSnapshot) => {
      setRoom(snapshot);
      setState(snapshot.state);
      setStatus('');
    });
    socket.on('room_error', (message: string) => setStatus(message));
    socket.on('room_notice', (message: string) => setStatus(message));
    socket.on('left_room', () => {
      setRoom(null);
      setState(initialState);
      setStatus('Conectado');
    });

    return () => {
      socket.disconnect();
      socket.removeAllListeners();
    };
  }, [socket]);

  const createRoom = () => {
    socket.emit('create_room', playerName);
  };

  const joinRoom = () => {
    const code = joinCode.trim().toUpperCase();
    if (code) {
      socket.emit('join_room', code, playerName);
    }
  };

  const sendGuess = (guessAngle: number) => {
    if (room?.role !== 'guesser') return;

    setState((current) => ({ ...current, guessAngle }));
    socket.emit('set_guess', guessAngle);
  };

  if (!room) {
    return (
      <section className="w-full max-w-sm rounded-[2rem] bg-white p-5 shadow-[0_18px_40px_rgba(32,42,50,0.14)]">
        <div className="mb-5 text-center">
          <h2 className="text-xl font-black uppercase tracking-[0.08em]">Sala online</h2>
          <p className="mt-1 text-sm font-semibold text-[#7b6f63]">{status}</p>
        </div>

        <div className="flex flex-col gap-3">
          <input
            value={playerName}
            onChange={(event) => setPlayerName(event.target.value)}
            placeholder="Tu nombre"
            maxLength={18}
            className="h-14 rounded-full border-2 border-[#d8d0c6] bg-[#f7f4ef] px-5 text-center text-base font-black outline-none focus:border-[#202a32]"
          />

          <ActionButton label="Crear sala" icon={<Link2 />} onClick={createRoom} />

          <div className="flex gap-2">
            <input
              value={joinCode}
              onChange={(event) => setJoinCode(event.target.value.toUpperCase())}
              placeholder="CODIGO"
              maxLength={4}
              className="h-14 min-w-0 flex-1 rounded-full border-2 border-[#d8d0c6] bg-[#f7f4ef] px-5 text-center text-lg font-black uppercase tracking-[0.2em] outline-none focus:border-[#202a32]"
            />
            <button
              type="button"
              onClick={joinRoom}
              className="h-14 w-14 rounded-full bg-[#202a32] text-white flex items-center justify-center shadow-[0_14px_28px_rgba(15,23,42,0.16)] active:scale-95"
              aria-label="Entrar"
            >
              <DoorOpen className="h-5 w-5" />
            </button>
          </div>
        </div>
      </section>
    );
  }

  const isGuesser = room.role === 'guesser';
  const visibleCoverOpen = state.roundResult ? true : isGuesser ? false : state.coverOpen;
  const myPlayerLabel = getPlayerLabel(room.round, room.role, room.names);
  const revealActive = Boolean(state.roundResult);

  return (
    <>
      <div className="flex flex-col items-center gap-2">
        <div className="rounded-full bg-white px-5 py-2 text-sm font-black uppercase tracking-[0.14em] text-[#52606a] shadow-[0_12px_28px_rgba(32,42,50,0.1)]">
          Sala {room.code} - Ronda {room.round} - {room.players}/2
        </div>
        <div className="rounded-full bg-[#202a32] px-5 py-2 text-xs font-black uppercase tracking-[0.14em] text-white shadow-[0_12px_28px_rgba(32,42,50,0.14)]">
          {myPlayerLabel} - {isGuesser ? 'Adivina' : 'Gira y mira'}
        </div>
        {(status || state.guessLocked) && (
          <div className="rounded-full bg-white px-4 py-2 text-xs font-bold text-[#7b6f63] shadow-[0_10px_20px_rgba(32,42,50,0.08)]">
            {state.guessLocked ? 'Respuesta fijada - ya se puede puntuar' : status}
          </div>
        )}
      </div>

      <div className="grid w-full max-w-sm grid-cols-2 gap-3">
        <ScoreCard active={room.round % 2 === 1} label={room.names.player1 ?? 'Persona 1'} score={room.scores.player1} />
        <ScoreCard active={room.round % 2 === 0} label={room.names.player2 ?? 'Persona 2'} score={room.scores.player2} />
      </div>

      <Dial
        canMovePointer={isGuesser && !revealActive}
        coverOpen={visibleCoverOpen}
        guessAngle={state.guessAngle}
        isSpinning={state.isSpinning}
        onGuessChange={sendGuess}
        spinDurationMs={SPIN_DURATION_MS}
        wheelRotation={state.wheelRotation}
      />

      <div className="h-16 flex items-center justify-center gap-3">
        {isGuesser ? (
          <ActionButton
            label={state.guessLocked ? 'Fijado' : 'Adivinar'}
            icon={<EyeOff />}
            onClick={() => socket.emit('lock_guess')}
            variant="light"
            disabled={state.guessLocked || revealActive}
          />
        ) : (
          <>
            <ActionButton
              label="Girar"
              icon={<RefreshCw className={state.isSpinning ? 'animate-spin' : ''} />}
              onClick={() => socket.emit('spin')}
              disabled={revealActive}
            />
            <ActionButton
              label={state.coverOpen ? 'Tapar' : 'Ver'}
              icon={state.coverOpen ? <EyeOff /> : <Eye />}
              onClick={() => socket.emit('toggle_cover')}
              disabled={revealActive}
            />
            <ActionButton
              label="Puntuar"
              icon={<Flag />}
              onClick={() => socket.emit('finish_round')}
              variant="light"
              disabled={revealActive}
            />
          </>
        )}
        <button
          type="button"
          onClick={() => socket.emit('leave_room')}
          className="h-14 w-14 rounded-full bg-white text-[#202a32] flex items-center justify-center shadow-[0_14px_28px_rgba(15,23,42,0.12)] active:scale-95"
          aria-label="Salir de la sala"
        >
          <Unplug className="h-5 w-5" />
        </button>
      </div>

      {state.roundResult && <RoundResultOverlay names={room.names} result={state.roundResult} />}
    </>
  );
};

const ScoreCard = ({ active, label, score }: { active: boolean; label: string; score: number }) => (
  <div
    className={`rounded-[1.25rem] px-4 py-3 text-center shadow-[0_12px_28px_rgba(32,42,50,0.1)] ${
      active ? 'bg-[#202a32] text-white' : 'bg-white text-[#202a32]'
    }`}
  >
    <div className="truncate text-[11px] font-black uppercase tracking-[0.12em] opacity-70">{label}</div>
    <div className="text-3xl font-black leading-none mt-1">{score}</div>
  </div>
);

function getPlayerLabel(round: number, role: 'guesser' | 'spinner', names: RoomSnapshot['names']) {
  const player1IsGuessing = round % 2 === 1;

  if (role === 'guesser') {
    return player1IsGuessing ? names.player1 ?? 'Persona 1' : names.player2 ?? 'Persona 2';
  }

  return player1IsGuessing ? names.player2 ?? 'Persona 2' : names.player1 ?? 'Persona 1';
}

const RoundResultOverlay = ({
  names,
  result,
}: {
  names: RoomSnapshot['names'];
  result: NonNullable<GameSnapshot['roundResult']>;
}) => {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 200);
    return () => window.clearInterval(id);
  }, []);

  const secondsLeft = Math.max(1, Math.ceil((result.nextRoundAt - now) / 1000));
  const playerName = names[result.scoredPlayer] ?? (result.scoredPlayer === 'player1' ? 'Persona 1' : 'Persona 2');
  const resultText = result.score > 0 ? `${playerName} suma ${result.score}` : `${playerName} no suma`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#202a32]/20 px-5 backdrop-blur-[2px]">
      <div className="w-full max-w-xs rounded-[1.75rem] bg-white p-6 text-center shadow-[0_24px_60px_rgba(32,42,50,0.22)]">
        <div className="text-sm font-black uppercase tracking-[0.18em] text-[#7b6f63]">{resultText}</div>
        <div className="mt-3 text-6xl font-black leading-none text-[#202a32]">{result.score}</div>
        <div className="mt-4 rounded-full bg-[#f7f4ef] px-4 py-3 text-sm font-black uppercase tracking-[0.12em] text-[#52606a]">
          Siguiente ronda en {secondsLeft}...
        </div>
      </div>
    </div>
  );
};

export default OnlineGame;
