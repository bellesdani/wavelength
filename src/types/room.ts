export interface GameSnapshot {
  coverOpen: boolean;
  guessAngle: number;
  guessLocked: boolean;
  isSpinning: boolean;
  roundResult: RoundResult | null;
  spinDurationMs: number;
  wheelRotation: number;
}

export interface RoundResult {
  nextRoundAt: number;
  score: number;
  scoredPlayer: PlayerSlot;
}

export interface RoomSnapshot {
  code: string;
  history: RoundHistoryEntry[];
  names: PlayerNames;
  players: number;
  role: PlayerRole;
  round: number;
  scores: Scoreboard;
  state: GameSnapshot;
}

export interface RoundHistoryEntry {
  round: number;
  score: number;
  scoredPlayer: PlayerSlot;
}

export type PlayerRole = 'guesser' | 'spinner';

export type PlayerSlot = 'player1' | 'player2';

export type Scoreboard = Record<PlayerSlot, number>;

export type PlayerNames = Record<PlayerSlot, string | null>;

export const DEFAULT_SPIN_DURATION_MS = 1800;
export const MAX_EXTRA_TURNS = 7;
export const MIN_EXTRA_TURNS = 4;
export const SPIN_DURATION_RANGE_MS = {
  max: 2600,
  min: 1300,
};
