"use client";

/** Realtime WebSocket hook — pushes API events into TanStack Query caches. */
import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { API_URL } from "@/lib/api";

export type WsEvent =
  | { type: "trade"; data: unknown }
  | { type: "alert"; data: unknown }
  | { type: "position"; data: unknown };

export function useWebSocket(): void {
  const queryClient = useQueryClient();

  useEffect(() => {
    const wsUrl = API_URL.replace(/^http/, "ws") + "/ws";
    let socket: WebSocket | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let closed = false;

    const connect = (): void => {
      socket = new WebSocket(wsUrl);
      socket.onmessage = (event: MessageEvent<string>) => {
        let parsed: WsEvent | null = null;
        try {
          parsed = JSON.parse(event.data) as WsEvent;
        } catch {
          return;
        }
        if (!parsed) return;
        if (parsed.type === "trade") {
          void queryClient.invalidateQueries({ queryKey: ["trades"] });
          void queryClient.invalidateQueries({ queryKey: ["stats"] });
        } else if (parsed.type === "alert") {
          void queryClient.invalidateQueries({ queryKey: ["alerts"] });
          void queryClient.invalidateQueries({ queryKey: ["stats"] });
        } else if (parsed.type === "position") {
          void queryClient.invalidateQueries({ queryKey: ["positions"] });
        }
      };
      socket.onclose = () => {
        if (!closed) {
          reconnectTimer = setTimeout(connect, 3000);
        }
      };
    };

    connect();
    return () => {
      closed = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      socket?.close();
    };
  }, [queryClient]);
}
