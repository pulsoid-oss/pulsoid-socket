// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type EventCallback = (...args: any[]) => void;

export type PulsoidTokenError = {
  code: number;
  message: string;
};

export type ReconnectOptions = {
  enable?: boolean;
  reconnectMinInterval?: number;
  reconnectMaxInterval?: number;
  reconnectAttempts?: number;
};

export type ResolvedReconnectOptions = {
  enable: boolean;
  reconnectMinInterval: number;
  reconnectMaxInterval: number;
  reconnectAttempts: number;
};

// PulsoidSocket types

export type PulsoidHeartRateMessage = {
  heartRate: number;
  measuredAt: number;
};

export type PulsoidSocketOptions = {
  reconnect?: ReconnectOptions;
};

export type PulsoidSocketEventType =
  | 'open'
  | 'heart-rate'
  | 'error'
  | 'close'
  | 'online'
  | 'reconnect'
  | 'offline'
  | 'token-error';

// PulsoidRoomSocket types

export type PulsoidRoomEventKind =
  | 'heart_rate'
  | 'room_member_updated'
  | 'room_member_removed'
  | 'room_updated';

export type PulsoidRoomHeartRate = {
  profileId: string;
  bpm: number;
  timestamp: string;
};

export type PulsoidRoomMemberUpdated = {
  profileId: string;
  config: Record<string, unknown>;
  timestamp: string;
};

export type PulsoidRoomMemberRemoved = {
  profileId: string;
  timestamp: string;
};

export type PulsoidRoomUpdated = {
  roomId: string;
  config: Record<string, unknown>;
  timestamp: string;
};

export type PulsoidRoomSocketOptions = {
  kinds?: PulsoidRoomEventKind[];
  reconnect?: ReconnectOptions;
};

export type PulsoidRoomSocketEventType =
  | 'open'
  | 'close'
  | 'error'
  | 'reconnect'
  | 'token-error'
  | 'heart-rate'
  | 'room-member-updated'
  | 'room-member-removed'
  | 'room-updated';
