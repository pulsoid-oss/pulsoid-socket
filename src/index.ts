export type PulsoidSocketOptions = {
  format?: 'json' | 'plain';
};

export type PulsoidMessageJsonResponse = {
  heartRate: number;
  measuredAt: number;
};

export type PulsoidSocketEventType = 'open' | 'message' | 'error' | 'close';
export type PulsoidSocketEventHandler =
  | typeof WebSocket.prototype.onopen
  | ((data: {heartRate: number; measuredAt: number}) => void)
  | typeof WebSocket.prototype.onerror
  | typeof WebSocket.prototype.onclose;

const normalizeMessageBeData = (data: string) => {
  try {
    const message = JSON.parse(data);
    return {
      heartRate: message?.data?.heart_rate,
      measuredAt: message?.measured_at,
    };
  } catch {
    return {};
  }
};

export class PulsoidSocket {
  private websocket: WebSocket;

  private get url(): string {
    return `wss://dev.pulsoid.net/api/v1/data/real_time?access_token=${this.token}`;
  }

  private eventTypeToEventHandlersMap: {
    [key in PulsoidSocketEventType]: PulsoidSocketEventHandler[];
  } = {open: [], message: [], error: [], close: []};

  private addOnOpenEventHandler = () => {
    this.websocket.onopen = (event) => {
      this.eventTypeToEventHandlersMap.open?.forEach((callback) =>
        callback?.call(this.websocket, event)
      );
    };
  };

  private addOnCloseEventHandler = () => {
    this.websocket.onclose = (event) => {
      this.eventTypeToEventHandlersMap.close?.forEach((callback) =>
        callback?.call(this.websocket, event)
      );
    };
  };

  private addOnMessageEventHandler = () => {
    this.websocket.onmessage = (event) => {
      this.eventTypeToEventHandlersMap.message?.forEach((callback) => {
        const data = normalizeMessageBeData(event?.data);
        const messageData =
          this.options.format === 'json' ? data : `${data.heartRate}`;

        callback?.call(this.websocket, messageData);
      });
    };
  };

  private addOnErrorEventHandler = () => {
    this.websocket.onerror = (event) => {
      this.eventTypeToEventHandlersMap.error?.forEach((callback) =>
        callback?.call(this.websocket, event)
      );
    };
  };

  constructor(
    private token: string,
    private options: PulsoidSocketOptions = {}
  ) {
    if (options.format === undefined) {
      options.format = 'json';
    }
  }

  on(
    eventType: 'message',
    callback: (data: PulsoidMessageJsonResponse) => void
  ): void;
  on(eventType: 'open', callback: typeof WebSocket.prototype.onopen): void;
  on(eventType: 'close', callback: typeof WebSocket.prototype.onclose): void;
  on(eventType: 'error', callback: typeof WebSocket.prototype.onerror): void;
  on(eventType: PulsoidSocketEventType, callback: PulsoidSocketEventHandler) {
    this.eventTypeToEventHandlersMap[eventType].push(callback);
  }

  off(
    eventType: 'message',
    callback?: (data: PulsoidMessageJsonResponse) => void
  ): void;
  off(eventType: 'open', callback?: typeof WebSocket.prototype.onopen): void;
  off(eventType: 'close', callback?: typeof WebSocket.prototype.onclose): void;
  off(eventType: 'error', callback?: typeof WebSocket.prototype.onerror): void;
  off(eventType: PulsoidSocketEventType, callback?: PulsoidSocketEventHandler) {
    if (callback) {
      this.eventTypeToEventHandlersMap[eventType] =
        this.eventTypeToEventHandlersMap[eventType].filter(
          (cb) => cb !== callback
        );
    } else {
      this.eventTypeToEventHandlersMap[eventType] = [];
    }
  }

  connect() {
    this.websocket = new WebSocket(this.url);

    this.addOnCloseEventHandler();
    this.addOnMessageEventHandler();
    this.addOnOpenEventHandler();
    this.addOnErrorEventHandler();
  }

  disconnect() {
    this.websocket.close();
  }

  isConnected = () => {
    return this.websocket.readyState === WebSocket.OPEN;
  };
}
