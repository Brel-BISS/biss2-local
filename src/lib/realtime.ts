// ================================================================
//  BISS 2 — WebSocket Realtime (remplace Supabase Realtime)
// ================================================================
import { WS_URL } from './api';

type Handler = (data: unknown) => void;

class BissRealtime {
  private ws: WebSocket | null = null;
  private handlers = new Map<string, Set<Handler>>();
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  public connected = false;
  private onConnectCbs: Array<() => void> = [];

  connect() {
    if (this.ws?.readyState === WebSocket.OPEN) return;
    try {
      this.ws = new WebSocket(WS_URL);
      this.ws.onopen = () => {
        this.connected = true;
        this.onConnectCbs.forEach(cb => cb());
        console.log('[BISS Realtime] Connecté');
      };
      this.ws.onmessage = (e) => {
        try {
          const { event, data } = JSON.parse(e.data);
          this.handlers.get(event)?.forEach(h => h(data));
          this.handlers.get('*')?.forEach(h => h({ event, data }));
        } catch {}
      };
      this.ws.onclose = () => {
        this.connected = false;
        console.log('[BISS Realtime] Déconnecté — reconnexion dans 3s');
        this.reconnectTimer = setTimeout(() => this.connect(), 3000);
      };
      this.ws.onerror = () => this.ws?.close();
    } catch {}
  }

  on(event: string, handler: Handler): () => void {
    if (!this.handlers.has(event)) this.handlers.set(event, new Set());
    this.handlers.get(event)!.add(handler);
    return () => this.handlers.get(event)?.delete(handler);
  }

  onConnect(cb: () => void) {
    this.onConnectCbs.push(cb);
  }

  disconnect() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.ws?.close();
  }
}

export const realtime = new BissRealtime();
