import { debounce } from './utils/debounce';
import PulsoidBaseSocket from './PulsoidBaseSocket';
import PulsoidRoomSocket from './PulsoidRoomSocket';
import type {
  EventCallback,
  PulsoidHeartRateMessage,
  PulsoidSocketEventType,
  PulsoidSocketOptions,
  PulsoidTokenError,
  PulsoidRoomSocketOptions,
} from './types';

const normalizeMessageData = (data: string): PulsoidHeartRateMessage | null => {
  try {
    const message = JSON.parse(data);
    const heartRate = message?.data?.heart_rate;
    const measuredAt = message?.measured_at;

    if (typeof heartRate !== 'number' || typeof measuredAt !== 'number') {
      console.warn('[PulsoidSocket] Missing or invalid fields:', data);
      return null;
    }

    return { heartRate, measuredAt };
  } catch (e) {
    console.warn('[PulsoidSocket] Malformed message:', data, e);
    return null;
  }
};

class PulsoidSocket extends PulsoidBaseSocket<PulsoidSocketEventType> {
  private online = false;

  private debounceOfflineEvent = debounce(
    () => this.onOfflineEventHandler(),
    30000
  );

  protected get requiredScope(): string {
    return 'data:heart_rate:read';
  }

  protected get url(): string {
    return `wss://dev.pulsoid.net/api/v1/data/real_time?access_token=${this.token}`;
  }

  protected getEventTypes(): PulsoidSocketEventType[] {
    return [
      'open',
      'heart-rate',
      'error',
      'close',
      'online',
      'offline',
      'reconnect',
      'token-error',
    ];
  }

  protected onMessageHandler(event: MessageEvent) {
    const data = normalizeMessageData(event?.data);

    this.onOnlineEventHandler();

    if (data) {
      this.emitEvent('heart-rate', data);
    }
  }

  protected onFirstCloseCleanup(): void {
    if (this.online) {
      this.onOfflineEventHandler();
      this.debounceOfflineEvent.cancel();
    }
  }

  protected onDisconnect(): void {
    this.debounceOfflineEvent.cancel();
  }

  private onOfflineEventHandler = () => {
    if (this.online) {
      this.emitEvent('offline');
      this.online = false;
    }
  };

  private onOnlineEventHandler = () => {
    if (!this.online) {
      this.emitEvent('online');
      this.online = true;
    }

    this.debounceOfflineEvent();
  };

  private constructor(token: string, userOptions: PulsoidSocketOptions = {}) {
    super(token, userOptions.reconnect);
  }

  static create(token: string, options?: PulsoidSocketOptions): PulsoidSocket {
    return new PulsoidSocket(token, options);
  }

  static createRoom(
    token: string,
    roomId: string,
    options?: PulsoidRoomSocketOptions
  ): PulsoidRoomSocket {
    return PulsoidRoomSocket.create(token, roomId, options);
  }

  on(
    eventType: 'heart-rate',
    callback: (data: PulsoidHeartRateMessage) => void
  ): void;
  on(eventType: 'open', callback: (event: Event) => void): void;
  on(eventType: 'close', callback: (event: CloseEvent) => void): void;
  on(eventType: 'error', callback: (event: Event) => void): void;
  on(eventType: 'online', callback: () => void): void;
  on(eventType: 'offline', callback: () => void): void;
  on(
    eventType: 'reconnect',
    callback: (e: { attempt: number }) => void
  ): void;
  on(
    eventType: 'token-error',
    callback: (e: PulsoidTokenError) => void
  ): void;
  on(eventType: PulsoidSocketEventType, callback: EventCallback) {
    super.on(eventType, callback);
  }

  off(
    eventType: 'heart-rate',
    callback?: (data: PulsoidHeartRateMessage) => void
  ): void;
  off(eventType: 'open', callback?: (event: Event) => void): void;
  off(eventType: 'close', callback?: (event: CloseEvent) => void): void;
  off(eventType: 'error', callback?: (event: Event) => void): void;
  off(eventType: 'online', callback?: () => void): void;
  off(eventType: 'offline', callback?: () => void): void;
  off(
    eventType: 'reconnect',
    callback?: (e: { attempt: number }) => void
  ): void;
  off(
    eventType: 'token-error',
    callback?: (e: PulsoidTokenError) => void
  ): void;
  off(eventType: PulsoidSocketEventType, callback?: EventCallback) {
    super.off(eventType, callback);
  }

  isOnline = () => {
    return this.online;
  };
}

export default PulsoidSocket;
