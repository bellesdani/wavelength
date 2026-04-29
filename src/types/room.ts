export interface GameSnapshot {
  coverOpen: boolean;
  guessAngle: number;
  guessLocked: boolean;
  isSpinning: boolean;
  roundResult: RoundResult | null;
  wheelRotation: number;
}

export interface RoundResult {
  nextRoundAt: number;
  score: number;
  scoredPlayer: PlayerSlot;
}

export interface RoomSnapshot {
  code: string;
  names: PlayerNames;
  players: number;
  role: PlayerRole;
  round: number;
  scores: Scoreboard;
  state: GameSnapshot;
}

export type PlayerRole = 'guesser' | 'spinner';

export type PlayerSlot = 'player1' | 'player2';

export type Scoreboard = Record<PlayerSlot, number>;

export type PlayerNames = Record<PlayerSlot, string | null>;

export const SPIN_DURATION_MS = 1500;
