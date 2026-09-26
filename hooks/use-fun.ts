"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { getSupabase } from "@/lib/supabase/client";
import { EMPTY_FUN, type FunRecord } from "@/lib/fun/types";
export function useFun(roomId: string, connected: boolean) {
  const [record, setRecord] = useState<FunRecord | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const pending = useRef(false);
  const accept = useCallback(
    (next: FunRecord) =>
      setRecord((prev) =>
        !prev || next.revision >= prev.revision ? next : prev,
      ),
    [],
  );
  useEffect(() => {
    let disposed = false;
    const db = getSupabase();
    const refresh = async () => {
      const { data, error } = await db
        .from("room_fun")
        .select("*")
        .eq("room_id", roomId)
        .maybeSingle();
      if (disposed) return;
      if (error) {
        console.error("Date-night refresh failed", error.code);
        setError(
          "Your date-night corner couldn’t load. Check your connection and try again.",
        );
        return;
      }
      if (data) accept(data as FunRecord);
      setLoaded(true);
      setError((previous) =>
        previous.startsWith("Your date-night corner") ? "" : previous,
      );
    };
    const channel = db
      .channel(`fun:${roomId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "room_fun",
          filter: `room_id=eq.${roomId}`,
        },
        ({ new: next }: { new: Partial<FunRecord> }) => {
          if (!disposed && "state" in next) accept(next as FunRecord);
        },
      )
      .subscribe((status: string) => {
        if (status === "SUBSCRIBED") void refresh();
      });
    void refresh();
    const visible = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    document.addEventListener("visibilitychange", visible);
    const interval = setInterval(() => {
      if (navigator.onLine && document.visibilityState === "visible")
        void refresh();
    }, 15000);
    return () => {
      disposed = true;
      clearInterval(interval);
      document.removeEventListener("visibilitychange", visible);
      void db.removeChannel(channel);
    };
  }, [roomId, accept]);
  const act = useCallback(
    async (action: string, data: Record<string, unknown> = {}) => {
      if (pending.current) throw new Error("One moment…");
      if (!connected || !loaded)
        throw new Error("Wait until your room reconnects.");
      pending.current = true;
      setBusy(true);
      setError("");
      try {
        const { data: next, error } = await getSupabase().rpc("fun_action", {
          p_room: roomId,
          p_action: action,
          p_data: data,
          p_request: crypto.randomUUID(),
        });
        if (error) throw error;
        accept(next as FunRecord);
      } catch (error) {
        console.error("Date-night action failed", error);
        const message =
          "That little moment didn’t reach the room. It may have changed—refresh, or try again in a few seconds.";
        setError(message);
        throw new Error(message);
      } finally {
        pending.current = false;
        setBusy(false);
      }
    },
    [roomId, connected, loaded, accept],
  );
  return {
    state: record?.state || EMPTY_FUN,
    act,
    busy,
    loaded,
    error,
    clearError: () => setError(""),
  };
}
