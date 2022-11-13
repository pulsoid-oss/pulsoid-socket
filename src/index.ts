export type PulsoidSocketOptions = {
  test?: boolean;
  format?: 'json' | 'plain';
  reconnect?: boolean;
};

export type PulsoidSocketEventType = 'open' | 'message' | 'error' | 'close';

export class PulsoidSocket {
  private websocket: WebSocket;

  private get url(): string {
    return `wss://dev.pulsoid.net/api/v1/data/real_time?access_token=${this.token}`;
  }

  private eventTypeToEventMap: {
    [key in PulsoidSocketEventType]: (
      callback:
        | typeof this.websocket.onopen
        | typeof this.websocket.onmessage
        | typeof this.websocket.onerror
        | typeof this.websocket.onclose
        | null
    ) => void;
  } = {
    open: (callback: typeof this.websocket.onopen) => {
      this.websocket.onopen = callback;
    },
    message: (callback: typeof this.websocket.onmessage) => {
      this.websocket.onmessage = callback;
    },
    error: (callback: typeof this.websocket.onerror) => {
      this.websocket.onerror = callback;
    },
    close: (callback: typeof this.websocket.onclose) => {
      this.websocket.onclose = callback;
    },
  };

  constructor(private token: string, private options?: PulsoidSocketOptions) {}

  on(eventType: PulsoidSocketEventType, callback: (event: Event) => void) {
    const eventFn = this.eventTypeToEventMap[eventType];

    if (this.websocket) {
      this.websocket.onopen = callback;
    } else {
      // Implement a queue to assign the callback to the event when the socket is connected
    }
  }

  connect() {
    this.websocket = new WebSocket(this.url);
  }

  disconnect() {
    this.websocket.close();
  }

  isConnected = () => {
    return this.websocket.readyState === WebSocket.OPEN;
  };
}
