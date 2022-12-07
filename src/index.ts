import {debounce} from './utils/debounce';

export type PulsoidMessageJsonResponse = {
  heartRate: number;
  measuredAt: number;
};

export type PulsoidSocketEventType =
  | 'open'
  | 'heart-rate'
  | 'error'
  | 'close'
  | 'online'
  | 'offline';

export type PulsoidSocketEventHandler =
  | typeof WebSocket.prototype.onopen
  | ((data: {heartRate: number; measuredAt: number}) => void)
  | typeof WebSocket.prototype.onerror
  | typeof WebSocket.prototype.onclose
  | (() => void);

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

class PulsoidSocket {
  private websocket: WebSocket;
  private online = false;

  private get url(): string {
    return `wss://dev.pulsoid.net/api/v1/data/real_time?access_token=${this.token}`;
  }

  private eventTypeToEventHandlersMap: {
    [key in PulsoidSocketEventType]: PulsoidSocketEventHandler[];
  } = {
    open: [],
    'heart-rate': [],
    error: [],
    close: [],
    online: [],
    offline: [],
  };

  private debounceOfflineEvent = debounce(
    () => this.onOfflineEventHandler(),
    30000
  );

  private onOfflineEventHandler = () => {
    if (this.online) {
      this.eventTypeToEventHandlersMap.offline.forEach((callback: () => void) =>
        callback()
      );

      this.online = false;
    }
  };

  private onOpenEventHandler = (event: Event) => {
    this.eventTypeToEventHandlersMap.open?.forEach((callback) =>
      callback?.call(this.websocket, event)
    );
  };
  private addOnOpenEventHandler = () => {
    this.websocket.addEventListener('open', this.onOpenEventHandler);
  };

  private onCloseEventHandler = (event: CloseEvent) => {
    this.eventTypeToEventHandlersMap.close?.forEach((callback) =>
      callback?.call(this.websocket, event)
    );

    this.clearEventHandlers();

    if (this.online) {
      this.onOfflineEventHandler();
      this.debounceOfflineEvent.cancel();
    }
  };
  private addOnCloseEventHandler = () => {
    this.websocket.addEventListener('close', this.onCloseEventHandler);
  };

  private onOnlineEventHandler = () => {
    if (!this.online) {
      this.eventTypeToEventHandlersMap.online?.forEach((callback: () => void) =>
        callback()
      );

      this.online = true;
    }

    this.debounceOfflineEvent();
  };

  private onHeartRateEventHandler = (event: MessageEvent) => {
    const data = normalizeMessageBeData(event?.data);

    this.eventTypeToEventHandlersMap['heart-rate']?.forEach((callback) => {
      callback?.call(this.websocket, data);
    });

    this.onOnlineEventHandler();
  };
  private addOnMessageEventHandler = () => {
    this.websocket.addEventListener('message', this.onHeartRateEventHandler);
  };

  private onErrorEventHandler = (event: Event) => {
    this.eventTypeToEventHandlersMap.error?.forEach((callback) =>
      callback?.call(this.websocket, event)
    );
  };
  private addOnErrorEventHandler = () => {
    this.websocket.addEventListener('error', this.onErrorEventHandler);
  };

  private assignEventHandlers() {
    this.addOnCloseEventHandler();
    this.addOnMessageEventHandler();
    this.addOnOpenEventHandler();
    this.addOnErrorEventHandler();
  }

  private clearEventHandlers() {
    this.websocket.removeEventListener('open', this.onOpenEventHandler);
    this.websocket.removeEventListener('close', this.onCloseEventHandler);
    this.websocket.removeEventListener(
      'heart-rate',
      this.onHeartRateEventHandler
    );
    this.websocket.removeEventListener('error', this.onErrorEventHandler);
  }

  constructor(private token: string) {}

  on(
    eventType: 'heart-rate',
    callback: (data: PulsoidMessageJsonResponse) => void
  ): void;
  on(eventType: 'open', callback: typeof WebSocket.prototype.onopen): void;
  on(eventType: 'close', callback: typeof WebSocket.prototype.onclose): void;
  on(eventType: 'error', callback: typeof WebSocket.prototype.onerror): void;
  on(eventType: 'online', callback: () => void): void;
  on(eventType: 'offline', callback: () => void): void;
  on(eventType: PulsoidSocketEventType, callback: PulsoidSocketEventHandler) {
    this.eventTypeToEventHandlersMap[eventType].push(callback);
  }

  off(
    eventType: 'heart-rate',
    callback?: (data: PulsoidMessageJsonResponse) => void
  ): void;
  off(eventType: 'open', callback?: typeof WebSocket.prototype.onopen): void;
  off(eventType: 'close', callback?: typeof WebSocket.prototype.onclose): void;
  off(eventType: 'error', callback?: typeof WebSocket.prototype.onerror): void;
  off(eventType: 'online', callback?: () => void): void;
  off(eventType: 'offline', callback?: () => void): void;
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

    this.assignEventHandlers();
  }

  disconnect() {
    this.websocket?.close();
  }

  isConnected = () => {
    return this.websocket?.readyState === WebSocket.OPEN;
  };

  isOnline = () => {
    return this.online;
  };
}

export default PulsoidSocket;
