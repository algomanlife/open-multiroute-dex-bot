/**
 * WebSocket broadcast hub — fans out trade/alert/position events to all
 * connected dashboard clients.
 */
import type { WebSocket } from "ws";

export type WsEvent =
  | { type: "trade"; data: unknown }
  | { type: "alert"; data: unknown }
  | { type: "position"; data: unknown };

class BroadcastHub {
  private readonly sockets = new Set<WebSocket>();

  add(socket: WebSocket): void {
    this.sockets.add(socket);
    socket.on("close", () => this.sockets.delete(socket));
  }

  publish(event: WsEvent): void {
    const payload = JSON.stringify(event);
    for (const socket of this.sockets) {
      if (socket.readyState === socket.OPEN) socket.send(payload);
    }
  }

  get clientCount(): number {
    return this.sockets.size;
  }
}

export const broadcastHub = new BroadcastHub();
