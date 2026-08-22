export const POSITIONS = ["GK", "DEF", "MID", "FWD"] as const;
export type Position = (typeof POSITIONS)[number];

export const SQUAD_SIZE = 15;
export const STARTING_XI_SIZE = 11;
export const MIN_STARTING_GOALKEEPERS = 1;
export const MAX_LEAGUE_USERS = 8;

export const SQUAD_POSITION_REQUIREMENTS: Record<Position, number> = {
  GK: 2,
  DEF: 5,
  MID: 5,
  FWD: 3,
};

export const MATCH_POINTS = {
  WIN: 3,
  TIE: 1,
  LOSS: 0,
} as const;

export interface PlayerGameweekScore {
  playerId: string;
  position: Position;
  points: number;
}
