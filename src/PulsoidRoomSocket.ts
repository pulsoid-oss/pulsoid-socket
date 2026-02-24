import PulsoidBaseSocket from './PulsoidBaseSocket';
import type {
  EventCallback,
  PulsoidRoomEventKind,
  PulsoidRoomHeartRate,
  PulsoidRoomMemberRemoved,
  PulsoidRoomMemberUpdated,
  PulsoidRoomSocketEventType,
  PulsoidRoomSocketOptions,
  PulsoidRoomUpdated,
  PulsoidTokenError,
} from './types';

const ALL_KINDS: PulsoidRoomEventKind[] = [
  'heart_rate',
  'room_member_updated',
  'room_member_removed',
  'room_updated',
];

class PulsoidRoomSocket extends PulsoidBaseSocket<PulsoidRoomSocketEventType> {
  protected get requiredScope(): string {
    return 'data:room:read';
  }

  protected get url(): string {
    const kinds = this.kinds.join(',');
    return `wss://dev.pulsoid.net/api/v2/data/rooms/${this.roomId}/real_time?access_token=${this.token}&kinds=${kinds}`;
  }

  protected getEventTypes(): PulsoidRoomSocketEventType[] {
    return [
      'open',
      'close',
      'error',
      'reconnect',
      'token-error',
      'heart-rate',
      'room-member-updated',
      'room-member-removed',
      'room-updated',
    ];
  }

  protected onMessageHandler(event: MessageEvent) {
    try {
      const message = JSON.parse(event.data);
      const { kind, timestamp } = message;

      switch (kind) {
        case 'heart_rate': {
          const { profile_id, bpm } = message.heart_rate;
          this.emitEvent('heart-rate', { profileId: profile_id, bpm, timestamp });
          break;
        }
        case 'room_member_updated': {
          const { profile_id, config } = message.room_member_updated;
          this.emitEvent('room-member-updated', {
            profileId: profile_id,
            config,
            timestamp,
          });
          break;
        }
        case 'room_member_removed': {
          const { profile_id } = message.room_member_removed;
          this.emitEvent('room-member-removed', {
            profileId: profile_id,
            timestamp,
          });
          break;
        }
        case 'room_updated': {
          const { room_id, config } = message.room_updated;
          this.emitEvent('room-updated', {
            roomId: room_id,
            config,
            timestamp,
          });
          break;
        }
      }
    } catch (e) {
      console.warn('[PulsoidRoomSocket] Malformed message:', event.data, e);
    }
  }

  private constructor(
    token: string,
    private roomId: string,
    private kinds: PulsoidRoomEventKind[],
    options: PulsoidRoomSocketOptions = {}
  ) {
    super(token, options.reconnect);
  }

  static create(
    token: string,
    roomId: string,
    options?: PulsoidRoomSocketOptions
  ): PulsoidRoomSocket {
    const kinds = options?.kinds ?? ALL_KINDS;
    return new PulsoidRoomSocket(token, roomId, kinds, options);
  }

  on(
    eventType: 'heart-rate',
    callback: (data: PulsoidRoomHeartRate) => void
  ): void;
  on(
    eventType: 'room-member-updated',
    callback: (data: PulsoidRoomMemberUpdated) => void
  ): void;
  on(
    eventType: 'room-member-removed',
    callback: (data: PulsoidRoomMemberRemoved) => void
  ): void;
  on(
    eventType: 'room-updated',
    callback: (data: PulsoidRoomUpdated) => void
  ): void;
  on(eventType: 'open', callback: (event: Event) => void): void;
  on(eventType: 'close', callback: (event: CloseEvent) => void): void;
  on(eventType: 'error', callback: (event: Event) => void): void;
  on(
    eventType: 'reconnect',
    callback: (e: { attempt: number }) => void
  ): void;
  on(
    eventType: 'token-error',
    callback: (e: PulsoidTokenError) => void
  ): void;
  on(eventType: PulsoidRoomSocketEventType, callback: EventCallback) {
    super.on(eventType, callback);
  }

  off(
    eventType: 'heart-rate',
    callback?: (data: PulsoidRoomHeartRate) => void
  ): void;
  off(
    eventType: 'room-member-updated',
    callback?: (data: PulsoidRoomMemberUpdated) => void
  ): void;
  off(
    eventType: 'room-member-removed',
    callback?: (data: PulsoidRoomMemberRemoved) => void
  ): void;
  off(
    eventType: 'room-updated',
    callback?: (data: PulsoidRoomUpdated) => void
  ): void;
  off(eventType: 'open', callback?: (event: Event) => void): void;
  off(eventType: 'close', callback?: (event: CloseEvent) => void): void;
  off(eventType: 'error', callback?: (event: Event) => void): void;
  off(
    eventType: 'reconnect',
    callback?: (e: { attempt: number }) => void
  ): void;
  off(
    eventType: 'token-error',
    callback?: (e: PulsoidTokenError) => void
  ): void;
  off(eventType: PulsoidRoomSocketEventType, callback?: EventCallback) {
    super.off(eventType, callback);
  }
}

export default PulsoidRoomSocket;
