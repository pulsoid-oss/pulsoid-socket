import {debounce} from './utils/debounce';

export type PulsoidMessageJsonResponse = {
  heartRate: number;
  measuredAt: number;
};

export type PulsoidSocketOptions = {
  reconnect?: {
    enable?: boolean;
    reconnectMinInterval?: number;
    reconnectMaxInterval?: number;
    reconnectAttempts?: number;
  };
};

export type PulsoidSocketEventType =
  | 'open'
  | 'heart-rate'
  | 'error'
  | 'close'
  | 'online'
  | 'reconnect'
  | 'offline';

export type PulsoidSocketEventHandler =
  | typeof WebSocket.prototype.onopen
  | ((data: {heartRate: number; measuredAt: number}) => void)
  | typeof WebSocket.prototype.onerror
  | typeof WebSocket.prototype.onclose
  | ((e: {attempt: number}) => void)
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
  private static reconnectDefaultOptions = {
    enable: true,
    reconnectMinInterval: 2000,
    reconnectMaxInterval: 10000,
    reconnectAttempts: 3,
  };

  private websocket: WebSocket;
  private online = false;
  private shouldReconnect = true;
  private reconnectTryCount = 0;
  private reconnectTimeout: NodeJS.Timeout;

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
    reconnect: [],
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
    if (this.online) {
      this.onOfflineEventHandler();
      this.debounceOfflineEvent.cancel();
    }

    this.eventTypeToEventHandlersMap.close?.forEach((callback) =>
      callback?.call(this.websocket, event)
    );

    this.clearEventHandlers();

    if (
      this.shouldReconnect &&
      this.reconnectTryCount < this.options.reconnect.reconnectAttempts
    ) {
      this.reconnect();
    }

    this.shouldReconnect = this.options?.reconnect?.enable;
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

  onReconnectEventHandler = () => {
    this.eventTypeToEventHandlersMap.reconnect?.forEach((callback) =>
      callback?.call(this.websocket, {attempt: this.reconnectTryCount})
    );
  };

  private onHeartRateEventHandler = (event: MessageEvent) => {
    const data = normalizeMessageBeData(event?.data);

    this.onOnlineEventHandler();

    this.eventTypeToEventHandlersMap['heart-rate']?.forEach((callback) => {
      callback?.call(this.websocket, data);
    });
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

  private resetReconnectData() {
    this.reconnectTryCount = 0;
    clearTimeout(this.reconnectTimeout);
  }

  private reconnect() {
    if (this.reconnectTimeout) {
      return;
    }

    this.reconnectTimeout = setTimeout(() => {
      try {
        this.reconnectTryCount++;

        this.onReconnectEventHandler();
        this.openSocketConnection();
      } catch (error) {
        if (this.reconnectTryCount < this.options.reconnect.reconnectAttempts) {
          this.reconnect();
        }
      }

      this.reconnectTimeout = null;
    }, this.getReconnectInterval());
  }

  private getReconnectInterval() {
    const {reconnectMinInterval, reconnectMaxInterval} = this.options.reconnect;

    const interval = reconnectMinInterval * Math.pow(2, this.reconnectTryCount);

    return Math.min(interval, reconnectMaxInterval);
  }

  private openSocketConnection() {
    this.websocket = new WebSocket(this.url);
    this.assignEventHandlers();
  }

  constructor(
    private token: string,
    private options: PulsoidSocketOptions = {}
  ) {
    options.reconnect = {
      ...PulsoidSocket.reconnectDefaultOptions,
      ...(options.reconnect || {}),
    };

    this.shouldReconnect = options.reconnect.enable;
  }

  on(
    eventType: 'heart-rate',
    callback: (data: PulsoidMessageJsonResponse) => void
  ): void;
  on(eventType: 'open', callback: typeof WebSocket.prototype.onopen): void;
  on(eventType: 'close', callback: typeof WebSocket.prototype.onclose): void;
  on(eventType: 'error', callback: typeof WebSocket.prototype.onerror): void;
  on(eventType: 'online', callback: () => void): void;
  on(eventType: 'offline', callback: () => void): void;
  on(eventType: 'reconnect', callback: (e: {attempt: number}) => void): void;
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
  off(eventType: 'reconnect', callback?: (e: {attempt: number}) => void): void;
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
    this.resetReconnectData();

    this.openSocketConnection();
  }

  disconnect() {
    this.resetReconnectData();
    this.shouldReconnect = false;

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
