import { useEffect, useMemo, useState } from 'react';
import { DoorOpen, Eye, EyeOff, Flag, Link2, RefreshCw, Unplug } from 'lucide-react';
import { io } from 'socket.io-client';
import type { Socket } from 'socket.io-client';
import ActionButton from './ActionButton';
import Dial from './Dial';
import type { GameSnapshot, PlayerSlot, RoomSnapshot, RoundHistoryEntry } from '../types/room';
import { DEFAULT_SPIN_DURATION_MS } from '../types/room';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL ?? 'http://localhost:3001';

const initialState: GameSnapshot = {
  coverOpen: false,
  guessAngle: 90,
  guessLocked: false,
  isSpinning: false,
  roundResult: null,
  spinDurationMs: DEFAULT_SPIN_DURATION_MS,
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
      <section className="w-full max-w-sm rounded-[1.5rem] bg-[#f7f4ef] p-5 shadow-[0_18px_40px_rgba(32,42,50,0.14)] sm:rounded-[1.75rem] sm:p-6">
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
    <section className="flex h-full min-h-0 w-full max-w-[430px] flex-col items-center justify-between gap-2 overflow-hidden rounded-none bg-[#f7f4ef] px-1 py-1 sm:h-[720px] sm:max-h-[calc(100dvh-2.5rem)] sm:max-w-[520px] sm:rounded-[1.75rem] sm:px-6 sm:py-5 sm:shadow-[0_22px_60px_rgba(32,42,50,0.16)]">
      <div className="grid w-full shrink-0 grid-cols-[3rem_1fr_3rem] items-start gap-2">
        <div />
        <div className="flex min-w-0 flex-col items-center gap-1.5 sm:gap-2">
          <div className="max-w-full truncate rounded-full bg-white px-4 py-2 text-[11px] font-black uppercase tracking-[0.1em] text-[#52606a] shadow-[0_10px_22px_rgba(32,42,50,0.1)] sm:px-5 sm:text-sm sm:tracking-[0.14em]">
            Sala {room.code} - Ronda {room.round} - {room.players}/2
          </div>
          <div className="max-w-full truncate rounded-full bg-[#202a32] px-4 py-2 text-[11px] font-black uppercase tracking-[0.1em] text-white shadow-[0_10px_22px_rgba(32,42,50,0.14)] sm:px-5 sm:text-xs sm:tracking-[0.14em]">
            {myPlayerLabel} - {isGuesser ? 'Adivina' : 'Gira y mira'}
          </div>
          {(status || state.guessLocked) && (
            <div className="max-w-full truncate rounded-full bg-white px-4 py-2 text-[11px] font-bold text-[#7b6f63] shadow-[0_10px_20px_rgba(32,42,50,0.08)] sm:text-xs">
              {state.guessLocked ? 'Respuesta fijada - ya se puede puntuar' : status}
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={() => socket.emit('leave_room')}
          className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-[#202a32] shadow-[0_12px_24px_rgba(15,23,42,0.12)] active:scale-95 sm:h-14 sm:w-14"
          aria-label="Salir de la sala"
        >
          <Unplug className="h-5 w-5" />
        </button>
      </div>

      <div className="grid w-full max-w-sm shrink-0 grid-cols-2 gap-2 sm:gap-3">
        <ScoreCard
          active={room.round % 2 === 1}
          highlight={state.roundResult?.scoredPlayer === 'player1' && state.roundResult.score > 0}
          label={room.names.player1 ?? 'Persona 1'}
          score={room.scores.player1}
        />
        <ScoreCard
          active={room.round % 2 === 0}
          highlight={state.roundResult?.scoredPlayer === 'player2' && state.roundResult.score > 0}
          label={room.names.player2 ?? 'Persona 2'}
          score={room.scores.player2}
        />
      </div>

      <RoundHistory history={room.history} names={room.names} />

      <Dial
        canMovePointer={isGuesser && !revealActive}
        coverOpen={visibleCoverOpen}
        guessAngle={state.guessAngle}
        isSpinning={state.isSpinning}
        onGuessChange={sendGuess}
        spinDurationMs={state.spinDurationMs}
        wheelRotation={state.wheelRotation}
      />

      <div className={`grid w-full shrink-0 gap-2 ${isGuesser ? 'max-w-sm grid-cols-1' : 'max-w-md grid-cols-3'} sm:flex sm:h-16 sm:items-center sm:justify-center sm:gap-3`}>
        {isGuesser ? (
          <ActionButton
            className="w-full"
            label={state.guessLocked ? 'Fijado' : 'Adivinar'}
            icon={<EyeOff />}
            onClick={() => socket.emit('lock_guess')}
            variant="light"
            disabled={state.guessLocked || revealActive}
          />
        ) : (
          <>
            <ActionButton
              className="w-full"
              label="Girar"
              icon={<RefreshCw className={state.isSpinning ? 'animate-spin' : ''} />}
              onClick={() => socket.emit('spin')}
              disabled={revealActive}
            />
            <ActionButton
              className="w-full"
              label={state.coverOpen ? 'Tapar' : 'Ver'}
              icon={state.coverOpen ? <EyeOff /> : <Eye />}
              onClick={() => socket.emit('toggle_cover')}
              disabled={revealActive}
            />
            <ActionButton
              className="w-full"
              label="Puntuar"
              icon={<Flag />}
              onClick={() => socket.emit('finish_round')}
              variant="light"
              disabled={revealActive}
            />
          </>
        )}
      </div>

      {state.roundResult && <RoundResultOverlay names={room.names} result={state.roundResult} />}
    </section>
  );
};

const ScoreCard = ({ active, highlight, label, score }: { active: boolean; highlight?: boolean; label: string; score: number }) => (
  <div
    className={`rounded-[1rem] px-3 py-2 text-center shadow-[0_10px_22px_rgba(32,42,50,0.1)] sm:rounded-[1.25rem] sm:px-4 sm:py-3 ${
      active ? 'bg-[#202a32] text-white' : 'bg-white text-[#202a32]'
    } ${highlight ? 'animate-score-pop' : ''}`}
  >
    <div className="truncate text-[10px] font-black uppercase tracking-[0.1em] opacity-70 sm:text-[11px] sm:tracking-[0.12em]">{label}</div>
    <div className="mt-1 text-2xl font-black leading-none sm:text-3xl">{score}</div>
  </div>
);

const RoundHistory = ({ history, names }: { history: RoundHistoryEntry[]; names: RoomSnapshot['names'] }) => {
  const recent = history.slice(-6).reverse();

  if (recent.length === 0) {
    return <div className="h-0 shrink-0 sm:h-7" />;
  }

  return (
    <div className="flex h-7 w-full max-w-sm shrink-0 items-center justify-center gap-1.5 overflow-hidden sm:gap-2">
      {recent.map((entry) => {
        const playerName = names[entry.scoredPlayer] ?? getPlayerShortLabel(entry.scoredPlayer);
        const theme = getScoreTheme(entry.score);

        return (
          <div
            key={`${entry.round}-${entry.scoredPlayer}`}
            className={`flex h-7 min-w-0 items-center gap-1 rounded-full px-2 text-[10px] font-black uppercase tracking-[0.08em] shadow-[0_8px_16px_rgba(32,42,50,0.08)] sm:px-3 ${theme.history}`}
            aria-label={`Ronda ${entry.round}: ${playerName} suma ${entry.score}`}
          >
            <span className="hidden max-w-16 truncate sm:inline">{playerName}</span>
            <span>{entry.score > 0 ? `+${entry.score}` : '0'}</span>
          </div>
        );
      })}
    </div>
  );
};

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
  const theme = getScoreTheme(result.score);

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex items-end justify-center px-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] sm:pointer-events-auto sm:inset-0 sm:items-center sm:bg-[#202a32]/20 sm:px-5 sm:pb-0 sm:backdrop-blur-[2px]">
      <div className={`animate-reveal-pop relative w-full max-w-sm overflow-hidden rounded-[1.25rem] px-4 py-3 shadow-[0_18px_42px_rgba(32,42,50,0.22)] sm:max-w-xs sm:rounded-[1.75rem] sm:p-6 sm:text-center sm:shadow-[0_24px_60px_rgba(32,42,50,0.22)] ${theme.panel}`}>
        <div className={`absolute inset-x-0 top-0 h-1 ${theme.bar}`} />
        <div className="flex items-center justify-between gap-4 sm:block">
          <div className="min-w-0 text-left sm:text-center">
            <div className={`mb-1 text-[10px] font-black uppercase tracking-[0.16em] sm:text-xs ${theme.kicker}`}>{theme.title}</div>
            <div className={`truncate text-xs font-black uppercase tracking-[0.14em] sm:text-sm sm:tracking-[0.18em] ${theme.text}`}>
              {resultText}
            </div>
            <div className={`mt-1 rounded-full px-3 py-2 text-xs font-black uppercase tracking-[0.08em] sm:mt-4 sm:px-4 sm:py-3 sm:text-sm sm:tracking-[0.12em] ${theme.timer}`}>
              Siguiente ronda en {secondsLeft}...
            </div>
          </div>
          <div className={`animate-score-burst shrink-0 text-5xl font-black leading-none sm:mt-3 sm:text-7xl ${theme.score}`}>
            {result.score > 0 ? `+${result.score}` : '0'}
          </div>
        </div>
      </div>
    </div>
  );
};

function getPlayerShortLabel(slot: PlayerSlot) {
  return slot === 'player1' ? 'P1' : 'P2';
}

function getScoreTheme(score: number) {
  if (score === 3) {
    return {
      bar: 'bg-[#d63a31]',
      history: 'bg-[#d63a31] text-white',
      kicker: 'text-[#8f221d]',
      panel: 'bg-[#fff6ef]',
      score: 'text-[#d63a31]',
      text: 'text-[#5b2a22]',
      timer: 'bg-white text-[#7b3a31]',
      title: 'Clavado',
    };
  }

  if (score === 2) {
    return {
      bar: 'bg-[#f28a2e]',
      history: 'bg-[#f28a2e] text-[#2f2114]',
      kicker: 'text-[#9b4e13]',
      panel: 'bg-[#fff8ed]',
      score: 'text-[#f28a2e]',
      text: 'text-[#5d3b18]',
      timer: 'bg-white text-[#7b4b1b]',
      title: 'Muy cerca',
    };
  }

  if (score === 1) {
    return {
      bar: 'bg-[#f4d438]',
      history: 'bg-[#f4d438] text-[#3b2f1b]',
      kicker: 'text-[#846d11]',
      panel: 'bg-[#fffbe7]',
      score: 'text-[#b99a0f]',
      text: 'text-[#574812]',
      timer: 'bg-white text-[#6f5d14]',
      title: 'Rasca punto',
    };
  }

  return {
    bar: 'bg-[#7d8a92]',
    history: 'bg-white text-[#52606a]',
    kicker: 'text-[#66737c]',
    panel: 'bg-white',
    score: 'text-[#52606a]',
    text: 'text-[#52606a]',
    timer: 'bg-[#f7f4ef] text-[#52606a]',
    title: 'Nada',
  };
}

export default OnlineGame;
