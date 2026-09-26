"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { getSupabase } from "@/lib/supabase/client";
import {
  REACTIONS,
  type ChatMessage,
  type ConnectionState,
  type Participant,
  type PlaybackAction,
  type Reaction,
  type WatchRoom,
} from "@/types/watch";
const mergeMessages = (a: ChatMessage[], b: ChatMessage[]) =>
  [...new Map([...a, ...b].map((m) => [m.id, m])).values()]
    .sort((a, b) => a.created_at.localeCompare(b.created_at))
    .slice(-200);
export function useRoom(initialRoom: WatchRoom, userId: string) {
  const [room, setRoom] = useState(initialRoom);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [people, setPeople] = useState<Participant[]>([]);
  const [connection, setConnection] = useState<ConnectionState>("connecting");
  const [error, setError] = useState("");
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [offset, setOffset] = useState(0);
  const channel = useRef<RealtimeChannel | null>(null);
  const reactionTimes = useRef(new Map<string, number>());
  const timers = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());
  const acceptRoom = useCallback(
    (next: WatchRoom) =>
      setRoom((previous) =>
        next.revision >= previous.revision ? next : previous,
      ),
    [],
  );
  const showReaction = useCallback((reaction: Reaction) => {
    if (
      !REACTIONS.some((e) => e === reaction.emoji) ||
      typeof reaction.id !== "string" ||
      typeof reaction.user_id !== "string"
    )
      return;
    const now = Date.now();
    if (now - (reactionTimes.current.get(reaction.user_id) || 0) < 450) return;
    reactionTimes.current.set(reaction.user_id, now);
    setReactions((previous) => [...previous.slice(-15), reaction]);
    const timer = setTimeout(() => {
      setReactions((previous) => previous.filter((r) => r.id !== reaction.id));
      timers.current.delete(timer);
    }, 2600);
    timers.current.add(timer);
  }, []);
  useEffect(() => {
    const supabase = getSupabase();
    let disposed = false;
    let localChannel: RealtimeChannel;
    let members: Participant[] = [];
    let onlineIds = new Set<string>();
    let requestCount = 0;
    const updatePeople = () => {
      if (!disposed) setPeople(members.filter((p) => onlineIds.has(p.user_id)));
    };
    const fetchMembers = async () => {
      const { data, error } = await supabase
        .from("room_participants")
        .select("user_id,display_name,avatar_url")
        .eq("room_id", initialRoom.id);
      if (error) throw error;
      members = data || [];
      updatePeople();
    };
    const refresh = async () => {
      const current = ++requestCount;
      const start = Date.now();
      const [
        { data: snapshot, error: snapshotError },
        { data: chat, error: chatError },
      ] = await Promise.all([
        supabase.rpc("room_snapshot", { p_room_id: initialRoom.id }),
        supabase
          .from("room_messages")
          .select("*")
          .eq("room_id", initialRoom.id)
          .order("created_at", { ascending: false })
          .limit(200),
      ]);
      if (disposed) return;
      if (snapshotError || chatError) throw snapshotError || chatError;
      if (!snapshot?.room)
        throw new Error("Room access is no longer available");
      acceptRoom(snapshot.room);
      if (current === requestCount)
        setOffset(Date.parse(snapshot.server_time) - (start + Date.now()) / 2);
      setMessages((previous) => mergeMessages(previous, chat || []));
      await fetchMembers();
      if (!disposed && localChannel?.state === "joined")
        setConnection("connected");
    };
    const recover = () =>
      refresh().catch((error) => {
        console.error("Room refresh failed", error);
        if (!disposed)
          setError(
            "We couldn’t refresh this room. Your connection may be interrupted.",
          );
      });
    async function connect() {
      try {
        await supabase.realtime.setAuth();
        if (disposed) return;
        localChannel = supabase.channel(`room:${initialRoom.id}`, {
          config: {
            private: true,
            presence: { key: userId },
            broadcast: { self: false, ack: true },
          },
        });
        channel.current = localChannel;
        localChannel
          .on("presence", { event: "sync" }, () => {
            onlineIds = new Set(Object.keys(localChannel.presenceState()));
            updatePeople();
          })
          .on("broadcast", { event: "reaction" }, ({ payload }) => {
            if (members.some((p) => p.user_id === payload?.user_id))
              showReaction(payload);
          })
          .on(
            "postgres_changes",
            {
              event: "UPDATE",
              schema: "public",
              table: "watch_rooms",
              filter: `id=eq.${initialRoom.id}`,
            },
            ({ new: next }) => {
              if (!disposed) acceptRoom(next as WatchRoom);
            },
          )
          .on(
            "postgres_changes",
            {
              event: "INSERT",
              schema: "public",
              table: "room_messages",
              filter: `room_id=eq.${initialRoom.id}`,
            },
            ({ new: message }) => {
              if (!disposed)
                setMessages((previous) =>
                  mergeMessages(previous, [message as ChatMessage]),
                );
            },
          )
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "room_participants",
              filter: `room_id=eq.${initialRoom.id}`,
            },
            () => {
              void fetchMembers().catch((error) => {
                console.error("Participant refresh failed", error);
                if (!disposed) setError("The people list couldn’t refresh.");
              });
            },
          )
          .subscribe(async (status) => {
            if (disposed) return;
            if (status === "SUBSCRIBED") {
              try {
                await refresh();
                if (disposed) return;
                const result = await localChannel.track({ user_id: userId });
                if (result !== "ok")
                  throw new Error("Presence subscription failed");
                setConnection("connected");
              } catch (error) {
                console.error("Room subscription failed", error);
                if (!disposed) {
                  setConnection("reconnecting");
                  setError(
                    "The room connection needs a moment. Please retry if it doesn’t reconnect.",
                  );
                }
              }
            } else if (
              status === "CHANNEL_ERROR" ||
              status === "TIMED_OUT" ||
              status === "CLOSED"
            ) {
              setConnection(navigator.onLine ? "reconnecting" : "offline");
            }
          });
      } catch (error) {
        console.error("Realtime connection failed", error);
        if (!disposed) {
          setConnection("reconnecting");
          setError(
            "Couldn’t connect to your room. Please reload to try again.",
          );
        }
      }
    }
    void connect();
    const online = () => {
      setConnection("reconnecting");
      void recover();
    };
    const offline = () => setConnection("offline");
    const visible = () => {
      if (document.visibilityState === "visible") void recover();
    };
    window.addEventListener("online", online);
    window.addEventListener("offline", offline);
    document.addEventListener("visibilitychange", visible);
    // Recovery fetch repairs missed database events without broadcasting artificial play commands.
    const interval = setInterval(() => {
      if (navigator.onLine && document.visibilityState === "visible")
        void recover();
    }, 20000);
    const reactionTimers = timers.current;
    return () => {
      disposed = true;
      clearInterval(interval);
      window.removeEventListener("online", online);
      window.removeEventListener("offline", offline);
      document.removeEventListener("visibilitychange", visible);
      if (localChannel) void supabase.removeChannel(localChannel);
      channel.current = null;
      reactionTimers.forEach(clearTimeout);
      reactionTimers.clear();
    };
  }, [initialRoom.id, userId, acceptRoom, showReaction]);
  const playback = useCallback(
    async (action: PlaybackAction, position: number, videoId?: string) => {
      try {
        if (!navigator.onLine) throw new Error("Offline");
        const { data, error } = await getSupabase().rpc("set_playback", {
          p_room_id: initialRoom.id,
          p_action: action,
          p_position: position,
          p_video_id: videoId || null,
        });
        if (error) throw error;
        acceptRoom(data);
        return data as WatchRoom;
      } catch (error) {
        console.error("Playback update failed", error);
        setError(
          "That playback change couldn’t reach the room. Please try again.",
        );
        throw error;
      }
    },
    [initialRoom.id, acceptRoom],
  );
  const sendMessage = useCallback(
    async (message: string, id: string) => {
      const { data, error } = await getSupabase().rpc("send_room_message", {
        p_room_id: initialRoom.id,
        p_message: message,
        p_id: id,
      });
      if (error) {
        console.error("Message failed", error);
        throw new Error(
          "Your message wasn’t sent. It’s still here—please try again.",
        );
      }
      setMessages((previous) => mergeMessages(previous, [data]));
    },
    [initialRoom.id],
  );
  const react = useCallback(
    async (emoji: string) => {
      if (connection !== "connected") return;
      const reaction = { id: crypto.randomUUID(), emoji, user_id: userId };
      showReaction(reaction);
      try {
        const result = await channel.current?.send({
          type: "broadcast",
          event: "reaction",
          payload: reaction,
        });
        if (result !== "ok") throw new Error("Broadcast was not acknowledged");
      } catch (error) {
        console.error("Reaction delivery failed", error);
        setError("Your reaction couldn’t reach the room. Please try again.");
      }
    },
    [connection, userId, showReaction],
  );
  return {
    room,
    messages,
    people,
    connection,
    error,
    reactions,
    offset,
    playback,
    sendMessage,
    react,
    clearError: () => setError(""),
  };
}
