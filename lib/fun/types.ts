export type RoundKind =
  | "ready"
  | "compliment"
  | "prediction"
  | "rating"
  | "rather"
  | "thisthat"
  | "truths"
  | "favorite"
  | "goodnight";
export interface FunEvent {
  id: string;
  kind: "burst" | "kiss" | "note" | "popcorn";
  by: string;
  to?: string;
  at: string;
  text: string;
}
export interface Pick {
  id: string;
  video: string;
  title: string;
  note: string;
  by: string;
  surprise: boolean;
}
export interface Moment {
  id: string;
  video: string;
  position: number;
  text: string;
  by: string;
}
export interface FunRound {
  id: string;
  kind: RoundKind;
  prompt: string;
  users: string[];
  submitted: string[];
  at: string;
  answers?: Record<string, string>;
  guesses?: Record<string, string>;
  lies?: Record<string, string>;
  revealed_at?: string;
  starts_at?: string;
}
export interface Ticket {
  title: string;
  names: string;
  note: string;
  at: string;
}
export interface FunState {
  mood: "violet" | "rose" | "midnight";
  queue: Pick[];
  song?: Pick;
  picked?: Pick;
  moments: Moment[];
  events: FunEvent[];
  statuses: Record<string, string>;
  aliases: Record<string, string>;
  bingo: Record<string, string[]>;
  popcorn: Record<string, number>;
  round?: FunRound | null;
  night?: { at: string; messages: Record<string, string> } | null;
  ticket?: Ticket;
}
export interface FunRecord {
  room_id: string;
  revision: number;
  state: FunState;
  updated_at: string;
}
export type FunAction = (
  action: string,
  data?: Record<string, unknown>,
) => Promise<void>;
export const EMPTY_FUN: FunState = {
  mood: "violet",
  queue: [],
  moments: [],
  events: [],
  statuses: {},
  aliases: {},
  bingo: {},
  popcorn: {},
};
