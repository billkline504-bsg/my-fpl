import type { League } from "../lib/api";

export type RootStackParamList = {
  Home: undefined;
  LeagueDetail: { league: League };
};
