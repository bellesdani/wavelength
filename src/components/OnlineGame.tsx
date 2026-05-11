import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, DoorOpen, Eye, EyeOff, Flag, Link2, RefreshCw, Unplug } from 'lucide-react';
import { io } from 'socket.io-client';
import type { Socket } from 'socket.io-client';
import ActionButton from './ActionButton';
import Dial from './Dial';
import type { GameSnapshot, PlayerSlot, RoomSnapshot, RoundHistoryEntry } from '../types/room';
import { DEFAULT_SPIN_DURATION_MS } from '../types/room';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || (import.meta.env.DEV ? 'http://localhost:3001' : window.location.origin);
const PLAYER_ID_STORAGE_KEY = 'wavelength-mini-player-id';

const initialState: GameSnapshot = {
  coverOpen: false,
  guessAngle: 90,
  guessLocked: false,
  isSpinning: false,
  roundResult: null,
  spinDurationMs: DEFAULT_SPIN_DURATION_MS,
  wheelRotation: 90,
};

interface OnlineGameProps {
  onBack: () => void;
}

const OnlineGame = ({ onBack }: OnlineGameProps) => {
  const playerId = useMemo(() => getOrCreatePlayerId(), []);
  const socket = useMemo<Socket>(
    () =>
      io(SOCKET_URL, {
        autoConnect: false,
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 500,
        reconnectionDelayMax: 3000,
        timeout: 10000,
      }),
    [],
  );
  const [room, setRoom] = useState<RoomSnapshot | null>(null);
  const [joinCode, setJoinCode] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [serverTimeOffset, setServerTimeOffset] = useState(0);
  const [status, setStatus] = useState('Sin conectar');
  const [state, setState] = useState<GameSnapshot>(initialState);
  const currentRoomCodeRef = useRef<string | null>(null);
  const playerNameRef = useRef(playerName);

  useEffect(() => {
    playerNameRef.current = playerName;
  }, [playerName]);

  useEffect(() => {
    socket.connect();

    socket.on('connect', () => {
      const roomCode = currentRoomCodeRef.current;
      const currentPlayerName = playerNameRef.current.trim();

      if (roomCode && currentPlayerName) {
        setStatus('Reconectando sala...');
        socket.emit('resume_room', roomCode, currentPlayerName, playerId);
        return;
      }

      setStatus('Conectado');
    });
    socket.on('disconnect', () => setStatus(currentRoomCodeRef.current ? 'Reconectando...' : 'Desconectado'));
    socket.on('room_state', (snapshot: RoomSnapshot) => {
      const serverTime = typeof snapshot.serverTime === 'number' && Number.isFinite(snapshot.serverTime) ? snapshot.serverTime : Date.now();
      setServerTimeOffset(serverTime - Date.now());
      currentRoomCodeRef.current = snapshot.code;
      setRoom(snapshot);
      setState(snapshot.state);
      setStatus('');
    });
    socket.on('room_error', (message: string) => setStatus(message));
    socket.on('room_notice', (message: string) => setStatus(message));
    socket.on('left_room', () => {
      currentRoomCodeRef.current = null;
      setRoom(null);
      setState(initialState);
      setStatus('Conectado');
    });

    return () => {
      socket.disconnect();
      socket.removeAllListeners();
    };
  }, [playerId, socket]);

  const createRoom = () => {
    if (!validatePlayerName(playerName)) {
      setStatus('Pon tu nombre para jugar');
      return;
    }

    socket.emit('create_room', playerName.trim(), playerId);
  };

  const joinRoom = () => {
    if (!validatePlayerName(playerName)) {
      setStatus('Pon tu nombre para jugar');
      return;
    }

    const code = joinCode.trim().toUpperCase();
    if (code) {
      socket.emit('join_room', code, playerName.trim(), playerId);
      return;
    }

    setStatus('Escribe el codigo de sala');
  };

  const sendGuess = (guessAngle: number) => {
    if (room?.role !== 'guesser') return;

    setState((current) => ({ ...current, guessAngle }));
    socket.emit('set_guess', guessAngle);
  };

  if (!room) {
    const playerNameRequired = status === 'Pon tu nombre para jugar' && !validatePlayerName(playerName);

    return (
      <section className="app-panel relative w-full max-w-sm rounded-lg p-5 backdrop-blur sm:p-6">
        <button
          type="button"
          onClick={onBack}
          className="icon-button absolute left-4 top-4 flex h-11 w-11 items-center justify-center rounded-lg text-[#17222b] transition hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98]"
          aria-label="Volver atras"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>

        <div className="mb-5 text-center">
          <h2 className="text-xl font-black uppercase text-[#17222b]">Sala online</h2>
          <p className="mt-1 text-sm font-semibold text-[#7b6f63]">{status}</p>
        </div>

        <div className="flex flex-col gap-3">
          <input
            value={playerName}
            onChange={(event) => {
              setPlayerName(event.target.value);
              if (status === 'Pon tu nombre para jugar') {
                setStatus('Conectado');
              }
            }}
            placeholder="Tu nombre"
            maxLength={18}
            required
            aria-invalid={playerNameRequired}
            className={`form-field h-14 rounded-lg border-2 px-5 text-center text-base font-black text-[#17222b] outline-none transition focus:border-[#17222b] ${
              playerNameRequired ? 'border-[#d63a31]' : 'border-[#d8d0c6]'
            }`}
          />

          <ActionButton label="Crear sala" icon={<Link2 />} onClick={createRoom} />

          <div className="flex gap-2">
            <input
              value={joinCode}
              onChange={(event) => setJoinCode(event.target.value.toUpperCase())}
              placeholder="CODIGO"
              maxLength={6}
              className="form-field h-14 min-w-0 flex-1 rounded-lg border-2 border-[#d8d0c6] px-5 text-center text-lg font-black uppercase text-[#17222b] outline-none transition focus:border-[#17222b]"
            />
            <button
              type="button"
              onClick={joinRoom}
              className="flex h-14 w-14 items-center justify-center rounded-lg bg-[#17222b] text-white shadow-[0_14px_28px_rgba(23,34,43,0.16)] transition hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98]"
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
  const headerStatus = state.guessLocked && !revealActive ? 'Respuesta fijada - ya se puede puntuar' : status;
  const leaveRoom = () => {
    currentRoomCodeRef.current = null;
    socket.emit('leave_room');
  };
  const goBack = () => {
    leaveRoom();
    onBack();
  };
  const actionButtons = isGuesser ? (
    <ActionButton
      className="h-full w-full"
      label={state.guessLocked ? 'Fijado' : 'Adivinar'}
      icon={<EyeOff />}
      onClick={() => socket.emit('lock_guess')}
      variant="light"
      disabled={state.guessLocked || revealActive}
    />
  ) : (
    <>
      <ActionButton
        className="h-full w-full"
        label="Girar"
        icon={<RefreshCw className={state.isSpinning ? 'animate-spin' : ''} />}
        onClick={() => socket.emit('spin')}
        disabled={revealActive}
      />
      <ActionButton
        className="h-full w-full"
        label={state.coverOpen ? 'Tapar' : 'Ver'}
        icon={state.coverOpen ? <EyeOff /> : <Eye />}
        onClick={() => socket.emit('toggle_cover')}
        disabled={revealActive}
      />
      <ActionButton
        className="h-full w-full"
        label="Puntuar"
        icon={<Flag />}
        onClick={() => socket.emit('finish_round')}
        variant="light"
        disabled={revealActive}
      />
    </>
  );

  return (
    <section className="app-panel online-game-panel game-surface grid min-h-0 w-full max-w-[430px] grid-rows-[auto_minmax(0,1fr)_auto] items-center gap-2 overflow-visible rounded-none px-1 py-1 sm:max-w-[560px] sm:rounded-lg sm:px-6 sm:py-5">
      <div className="grid w-full shrink-0 grid-cols-[3rem_1fr_3rem] items-start gap-2 sm:grid-cols-[3.5rem_1fr_3.5rem]">
        <button
          type="button"
          onClick={goBack}
          className="icon-button flex h-12 w-12 items-center justify-center rounded-lg text-[#17222b] transition hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] sm:h-14 sm:w-14"
          aria-label="Volver atras"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex min-w-0 flex-col items-center gap-1.5 sm:gap-2">
          <div className="status-chip flex h-8 max-w-full items-center truncate rounded-lg px-4 text-[11px] font-black uppercase text-[#52606a] sm:h-9 sm:px-5 sm:text-sm">
            Sala {room.code} - Ronda {room.round} - {room.players}/2
          </div>
          <div className="status-chip-dark flex h-8 max-w-full items-center truncate rounded-lg px-4 text-[11px] font-black uppercase text-white sm:h-9 sm:px-5 sm:text-xs">
            {myPlayerLabel} - {isGuesser ? 'Adivina' : 'Gira y mira'}
          </div>
          <div
            className={`status-chip flex max-w-full items-center truncate rounded-lg text-[10px] font-bold text-[#7b6f63] transition-all sm:h-8 sm:px-4 sm:text-xs ${
              headerStatus ? 'h-7 px-4 opacity-100' : 'h-0 px-0 opacity-0 sm:opacity-0'
            }`}
            aria-hidden={!headerStatus}
          >
            {headerStatus || 'Sin avisos'}
          </div>
        </div>
        <button
          type="button"
          onClick={leaveRoom}
          className="icon-button flex h-12 w-12 items-center justify-center rounded-lg text-[#17222b] transition hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] sm:h-14 sm:w-14"
          aria-label="Salir de la sala"
        >
          <Unplug className="h-5 w-5" />
        </button>
      </div>

      <div className="flex min-h-0 w-full flex-col items-center justify-center gap-1 overflow-visible sm:justify-between sm:gap-2">
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
          className="online-dial"
          coverOpen={visibleCoverOpen}
          guessAngle={state.guessAngle}
          isSpinning={state.isSpinning}
          onGuessChange={sendGuess}
          spinDurationMs={state.spinDurationMs}
          wheelRotation={state.wheelRotation}
        />
      </div>

      <div
        className={`mx-auto grid h-12 w-full shrink-0 justify-self-center gap-2 self-end sm:h-14 sm:items-center sm:justify-center sm:gap-3 ${
          isGuesser ? 'max-w-sm grid-cols-1' : 'max-w-md grid-cols-3'
        }`}
      >
        {actionButtons}
      </div>

      {state.roundResult && <RoundResultOverlay names={room.names} result={state.roundResult} serverTimeOffset={serverTimeOffset} />}
    </section>
  );
};

const ScoreCard = ({ active, highlight, label, score }: { active: boolean; highlight?: boolean; label: string; score: number }) => (
  <div
    className={`rounded-lg px-3 py-2 text-center shadow-[0_10px_22px_rgba(23,34,43,0.1)] sm:px-4 sm:py-3 ${
      active ? 'bg-[#17222b] text-white' : 'status-chip text-[#17222b]'
    } ${highlight ? 'animate-score-pop' : ''}`}
  >
    <div className="truncate text-[10px] font-black uppercase opacity-70 sm:text-[11px]">{label}</div>
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
            className={`flex h-7 min-w-0 items-center gap-1 rounded-lg px-2 text-[10px] font-black uppercase shadow-[0_8px_16px_rgba(32,42,50,0.08)] sm:px-3 ${theme.history}`}
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

function validatePlayerName(playerName: string) {
  return playerName.trim().length > 0;
}

function getOrCreatePlayerId() {
  if (typeof window === 'undefined') return createPlayerId();

  try {
    const existing = window.localStorage.getItem(PLAYER_ID_STORAGE_KEY);
    if (existing) return existing;

    const playerId = createPlayerId();
    window.localStorage.setItem(PLAYER_ID_STORAGE_KEY, playerId);
    return playerId;
  } catch {
    return createPlayerId();
  }
}

function createPlayerId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

const RoundResultOverlay = ({
  names,
  result,
  serverTimeOffset,
}: {
  names: RoomSnapshot['names'];
  result: NonNullable<GameSnapshot['roundResult']>;
  serverTimeOffset: number;
}) => {
  const [now, setNow] = useState(Date.now() + serverTimeOffset);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now() + serverTimeOffset), 200);
    return () => window.clearInterval(id);
  }, [serverTimeOffset]);

  const rawSecondsLeft = Number.isFinite(result.nextRoundAt) ? Math.ceil((result.nextRoundAt - now) / 1000) : 3;
  const secondsLeft = Math.min(3, Math.max(1, rawSecondsLeft));
  const playerName = names[result.scoredPlayer] ?? (result.scoredPlayer === 'player1' ? 'Persona 1' : 'Persona 2');
  const resultText = result.score > 0 ? `${playerName} suma ${result.score}` : `${playerName} no suma`;
  const theme = getScoreTheme(result.score);

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex items-end justify-center px-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] sm:pointer-events-auto sm:inset-0 sm:items-center sm:bg-[#17222b]/22 sm:px-5 sm:pb-0 sm:backdrop-blur-[2px]">
      <div className={`animate-reveal-pop relative w-full max-w-sm overflow-hidden rounded-lg px-4 py-3 shadow-[0_18px_42px_rgba(23,34,43,0.22)] sm:max-w-xs sm:p-6 sm:text-center sm:shadow-[0_24px_60px_rgba(23,34,43,0.22)] ${theme.panel}`}>
        <div className={`absolute inset-x-0 top-0 h-1 ${theme.bar}`} />
        <div className="flex items-center justify-between gap-4 sm:block">
          <div className="min-w-0 text-left sm:text-center">
            <div className={`mb-1 text-[10px] font-black uppercase sm:text-xs ${theme.kicker}`}>{theme.title}</div>
            <div className={`truncate text-xs font-black uppercase sm:text-sm ${theme.text}`}>
              {resultText}
            </div>
            <div className={`mt-1 rounded-lg px-3 py-2 text-xs font-black uppercase sm:mt-4 sm:px-4 sm:py-3 sm:text-sm ${theme.timer}`}>
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
