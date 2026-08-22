/**
 * Minimal shapes for the fields we consume from the public (unofficial)
 * Fantasy Premier League API. These are intentionally partial — the real
 * responses have many more fields we don't use.
 */

export interface FplBootstrapTeam {
  id: number;
  name: string;
  short_name: string;
}

export interface FplBootstrapElement {
  id: number;
  first_name: string;
  second_name: string;
  web_name: string;
  team: number;
  element_type: 1 | 2 | 3 | 4; // 1=GK, 2=DEF, 3=MID, 4=FWD
}

export interface FplBootstrapEvent {
  id: number;
  name: string;
  deadline_time: string;
  is_current: boolean;
  is_next: boolean;
  finished: boolean;
}

export interface FplBootstrapStatic {
  teams: FplBootstrapTeam[];
  elements: FplBootstrapElement[];
  events: FplBootstrapEvent[];
}

export interface FplLiveElementStat {
  id: number;
  stats: {
    minutes: number;
    goals_scored: number;
    assists: number;
    clean_sheets: number;
    goals_conceded: number;
    own_goals: number;
    penalties_saved: number;
    penalties_missed: number;
    yellow_cards: number;
    red_cards: number;
    saves: number;
    bonus: number;
    total_points: number;
  };
}

export interface FplEventLive {
  elements: FplLiveElementStat[];
}

export const FPL_ELEMENT_TYPE_TO_POSITION = {
  1: "GK",
  2: "DEF",
  3: "MID",
  4: "FWD",
} as const;
