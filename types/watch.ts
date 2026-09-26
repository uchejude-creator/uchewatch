export type PlaybackAction = "play" | "pause" | "seek" | "video";
export interface WatchRoom {
  id: string;
  host_user_id: string;
  title: string;
  room_code: string;
  video_provider: "youtube";
  video_id: string;
  created_at: string;
  is_active: boolean;
  playback_position: number;
  is_playing: boolean;
  playback_updated_at: string;
  revision: number;
  last_actor_id: string | null;
  last_action: PlaybackAction;
}
export interface Participant {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
}
export interface ChatMessage {
  id: string;
  room_id: string;
  user_id: string;
  display_name: string;
  message: string;
  created_at: string;
}
export interface Reaction {
  id: string;
  emoji: string;
  user_id: string;
}
export const REACTION_GROUPS = [
  { label: "All the love", emojis: ["❤️", "🩷", "💜", "💙", "🩵", "🤍", "🧡", "💛", "💚", "💖", "💕", "💞", "💓", "💗", "💘", "💝", "❤️‍🔥", "💌"] },
  { label: "Just for you", emojis: ["🥰", "😍", "😘", "😚", "😙", "💋", "🫶", "🤗", "🫂", "🌹", "🌷", "💐", "🦋", "✨"] },
  { label: "Every little feeling", emojis: ["😂", "🤣", "🥹", "😭", "😮", "🤩", "🔥", "👏", "🙌", "🎉", "🍿", "🥂"] },
] as const;
export const REACTIONS: readonly string[] = REACTION_GROUPS.flatMap((group) => [...group.emojis]);
export type ConnectionState =
  "connecting" | "connected" | "reconnecting" | "offline";
