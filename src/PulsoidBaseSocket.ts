import type {
  EventCallback,
  PulsoidTokenError,
  ReconnectOptions,
  ResolvedReconnectOptions,
} from './types';

abstract class PulsoidBaseSocket<TEventType extends string> {
  private static reconnectDefaultOptions: ResolvedReconnectOptions = {
    enable: true,
    reconnectMinInterval: 2000,
    reconnectMaxInterval: 10000,
    reconnectAttempts: 100,
  };

  private websocket: WebSocket | null = null;
  private shouldReconnect: boolean;
  private reconnectTryCount = 0;
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  private reconnectOptions: ResolvedReconnectOptions;
  private eventTypeToEventHandlersMap: Record<string, EventCallback[]>;

  protected abstract get url(): string;
  protected abstract getEventTypes(): TEventType[];
  protected abstract onMessageHandler(event: MessageEvent): void;
  protected abstract get requiredScope(): string;

  protected onFirstCloseCleanup(): void {}
  protected onDisconnect(): void {}

  private onOpenEventHandler = (event: Event) => {
    this.emitEvent('open' as TEventType, event);

    if (this.reconnectTryCount > 0) {
      this.resetReconnectData();
    }
  };

  private onCloseEventHandler = (event: CloseEvent) => {
    const isReconnectInProgress = this.reconnectTryCount > 0;

    if (!isReconnectInProgress) {
      this.onFirstCloseCleanup();

      this.emitEvent('close' as TEventType, event);

      this.clearEventHandlers();
    }

    if (
      this.shouldReconnect &&
      this.reconnectTryCount < this.reconnectOptions.reconnectAttempts
    ) {
      this.reconnect();
    } else if (isReconnectInProgress) {
      this.clearEventHandlers();
    }

    this.shouldReconnect = this.reconnectOptions.enable;
  };

  private onErrorEventHandler = (event: Event) => {
    this.emitEvent('error' as TEventType, event);
  };

  private onReconnectEventHandler = () => {
    this.emitEvent('reconnect' as TEventType, {
      attempt: this.reconnectTryCount,
    });
  };

  private boundOnMessageHandler = (event: MessageEvent) => {
    this.onMessageHandler(event);
  };

  private assignEventHandlers() {
    if (!this.websocket) return;
    this.websocket.addEventListener('open', this.onOpenEventHandler);
    this.websocket.addEventListener(
      'close',
      this.onCloseEventHandler as EventListener
    );
    this.websocket.addEventListener(
      'message',
      this.boundOnMessageHandler as EventListener
    );
    this.websocket.addEventListener('error', this.onErrorEventHandler);
  }

  private clearEventHandlers() {
    if (!this.websocket) return;
    this.websocket.removeEventListener('open', this.onOpenEventHandler);
    this.websocket.removeEventListener(
      'close',
      this.onCloseEventHandler as EventListener
    );
    this.websocket.removeEventListener(
      'message',
      this.boundOnMessageHandler as EventListener
    );
    this.websocket.removeEventListener('error', this.onErrorEventHandler);
  }

  private resetReconnectData() {
    this.reconnectTryCount = 0;
    if (this.reconnectTimeout !== null) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
  }

  private reconnect() {
    if (this.reconnectTimeout !== null) {
      return;
    }

    this.reconnectTimeout = setTimeout(() => {
      this.reconnectTimeout = null;

      this.reconnectTryCount++;
      this.onReconnectEventHandler();

      this.validateToken()
        .then(() => {
          try {
            this.openSocketConnection();
          } catch {
            if (
              this.reconnectTryCount < this.reconnectOptions.reconnectAttempts
            ) {
              this.reconnect();
            }
          }
        })
        .catch((error: PulsoidTokenError) => {
          this.emitTokenError(error);
        });
    }, this.getReconnectInterval());
  }

  private getReconnectInterval() {
    const { reconnectMinInterval, reconnectMaxInterval } =
      this.reconnectOptions;

    const interval =
      reconnectMinInterval * Math.pow(2, this.reconnectTryCount);

    return Math.min(interval, reconnectMaxInterval);
  }

  protected async validateToken(): Promise<void> {
    const response = await fetch(
      'https://dev.pulsoid.net/api/v1/token/validate',
      {
        headers: { Authorization: `Bearer ${this.token}` },
      }
    );

    const body = await response.json();

    if (!response.ok) {
      const error: PulsoidTokenError = {
        code: body.error_code,
        message: body.error_message,
      };
      throw error;
    }

    const scopes: string[] = body.scopes ?? [];
    if (!scopes.includes(this.requiredScope)) {
      const error: PulsoidTokenError = {
        code: 7008,
        message: 'insufficient_scope',
      };
      throw error;
    }
  }

  private emitTokenError(error: PulsoidTokenError) {
    this.emitEvent('token-error' as TEventType, error);
  }

  private openSocketConnection() {
    this.clearEventHandlers();
    this.websocket = new WebSocket(this.url);
    this.assignEventHandlers();
  }

  protected constructor(
    protected readonly token: string,
    reconnectOptions: ReconnectOptions = {}
  ) {
    this.reconnectOptions = {
      ...PulsoidBaseSocket.reconnectDefaultOptions,
      ...reconnectOptions,
    };

    this.shouldReconnect = this.reconnectOptions.enable;

    this.eventTypeToEventHandlersMap = {};
    for (const type of this.getEventTypes()) {
      this.eventTypeToEventHandlersMap[type] = [];
    }
  }

  protected emitEvent(type: TEventType, ...args: unknown[]) {
    const handlers = this.eventTypeToEventHandlersMap[type];
    if (handlers) {
      handlers.forEach((callback) => callback(...args));
    }
  }

  on(eventType: TEventType, callback: EventCallback) {
    this.eventTypeToEventHandlersMap[eventType].push(callback);
  }

  off(eventType: TEventType, callback?: EventCallback) {
    if (callback) {
      this.eventTypeToEventHandlersMap[eventType] =
        this.eventTypeToEventHandlersMap[eventType].filter(
          (cb) => cb !== callback
        );
    } else {
      this.eventTypeToEventHandlersMap[eventType] = [];
    }
  }

  async connect() {
    if (
      this.websocket?.readyState === WebSocket.OPEN ||
      this.websocket?.readyState === WebSocket.CONNECTING
    ) {
      return;
    }

    await this.validateToken();

    this.resetReconnectData();
    this.openSocketConnection();
  }

  disconnect() {
    this.onDisconnect();
    this.resetReconnectData();
    this.shouldReconnect = false;

    this.websocket?.close();
  }

  isConnected = () => {
    return this.websocket?.readyState === WebSocket.OPEN;
  };
}

export default PulsoidBaseSocket;
