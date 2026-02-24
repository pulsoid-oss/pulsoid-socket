# @pulsoid/socket

Zero-dependency WebSocket client for consuming real-time heart rate data from [Pulsoid](https://pulsoid.net).

Supports two modes:
- **Standard** — stream your own heart rate
- **Room** — stream heart rate data from all members of a shared room

[Live Demo](https://pulsoid-oss.github.io/pulsoid-socket/) · [API Docs](https://docs.pulsoid.net/) · [Discord](https://discord.gg/tZktPS5)

## Getting started

### Obtain a token

> **Just want to test or use it for yourself?** Use [Manual Token Issuing](https://docs.pulsoid.net/access-token-management/manual-token-issuing) — no client credentials needed. Create a token in seconds and start receiving your heart rate data right away.

For production apps, choose the flow that fits your use case:

| Use case | Recommended flow |
| --- | --- |
| Personal use / testing | [Manual Token Issuing](https://docs.pulsoid.net/access-token-management/manual-token-issuing) (no client credentials needed) |
| Websites | [Implicit Grant](https://docs.pulsoid.net/access-token-management/oauth2-implicit-grant) |
| Desktop apps with deep links | [Implicit Grant](https://docs.pulsoid.net/access-token-management/oauth2-implicit-grant) |
| Backend servers | [Authorization Code Grant](https://docs.pulsoid.net/access-token-management/oauth2-authorization-code-grant) |
| Plugins / desktop apps | [Device Authorization Flow](https://docs.pulsoid.net/access-token-management/oauth-2-device-authorization-flow) |
| Enterprise | Contact [support@pulsoid.net](mailto:support@pulsoid.net) or [Discord](https://discord.gg/tZktPS5) |

For flows other than manual issuing, request client credentials via the [API request form](https://pulsoid.net/s/form-api). The token must have the `data:heart_rate:read` scope for standard mode, or `data:room:read` for room mode.

### Install

```bash
npm install @pulsoid/socket
```

## Basic usage

```javascript
import PulsoidSocket from '@pulsoid/socket';

const pulsocket = PulsoidSocket.create('YOUR_ACCESS_TOKEN');

pulsocket.on('open', () => {
  console.log('Connected');
});

pulsocket.on('heart-rate', (data) => {
  console.log(`Heart rate: ${data.heartRate} BPM`);
});

pulsocket.on('online', () => {
  console.log('Heart rate monitor is sending data');
});

pulsocket.on('offline', () => {
  console.log('No data from monitor for 30 seconds');
});

pulsocket.on('close', () => {
  console.log('Disconnected');
});

// connect() validates the token then opens the WebSocket
await pulsocket.connect();

// later…
pulsocket.disconnect();
```

## Room mode

```javascript
import { PulsoidSocket } from '@pulsoid/socket';
// or: import { PulsoidRoomSocket } from '@pulsoid/socket';

const room = PulsoidSocket.createRoom('YOUR_ACCESS_TOKEN', 'ROOM_ID', {
  // optional: filter which event kinds to subscribe to
  kinds: ['heart_rate', 'room_member_updated'],
});

room.on('heart-rate', (data) => {
  console.log(`${data.profileId}: ${data.bpm} BPM`);
});

room.on('room-member-updated', (data) => {
  console.log(`Member ${data.profileId} config updated`);
});

room.on('room-member-removed', (data) => {
  console.log(`Member ${data.profileId} left`);
});

room.on('room-updated', (data) => {
  console.log(`Room ${data.roomId} config updated`);
});

await room.connect();
```

## Using CDN

```html
<script crossorigin src="https://unpkg.com/@pulsoid/socket@2/dist/index.cjs.js"></script>
```

```javascript
const pulsocket = PulsoidSocket.create('YOUR_ACCESS_TOKEN');

pulsocket.on('heart-rate', (data) => {
  console.log(`Heart rate: ${data.heartRate}`);
});

pulsocket.connect();
```

---

## API

### PulsoidSocket

#### Static methods

| Method | Description |
| --- | --- |
| `PulsoidSocket.create(token, options?)` | Create a standard socket instance |
| `PulsoidSocket.createRoom(token, roomId, options?)` | Create a room socket instance |

#### Instance methods

| Method | Description |
| --- | --- |
| `connect()` | Validate the token and open the WebSocket. Returns a `Promise` that rejects with `PulsoidTokenError` if the token is invalid. |
| `disconnect()` | Close the connection and stop auto-reconnect |
| `on(event, callback)` | Add an event listener |
| `off(event, callback?)` | Remove a listener, or all listeners for the event if no callback is given |
| `isConnected()` | `true` if the WebSocket is open |
| `isOnline()` | `true` if the heart rate monitor is actively sending data |

#### Events

| Event | Callback | Description |
| --- | --- | --- |
| `'open'` | `(event: Event) => void` | Connection established |
| `'heart-rate'` | `(data: PulsoidHeartRateMessage) => void` | Heart rate data received |
| `'close'` | `(event: CloseEvent) => void` | Connection closed |
| `'error'` | `(event: Event) => void` | WebSocket error |
| `'online'` | `() => void` | Monitor started sending data |
| `'offline'` | `() => void` | No data from monitor for 30 seconds |
| `'reconnect'` | `(e: { attempt: number }) => void` | Reconnect attempt |
| `'token-error'` | `(e: PulsoidTokenError) => void` | Token validation failed during reconnect |

### PulsoidRoomSocket

Created via `PulsoidSocket.createRoom()` or imported directly:

```javascript
import { PulsoidRoomSocket } from '@pulsoid/socket';
const room = PulsoidRoomSocket.create(token, roomId, options?);
```

#### Events

Shares `open`, `close`, `error`, `reconnect`, and `token-error` with `PulsoidSocket`. Additional room events:

| Event | Callback | Description |
| --- | --- | --- |
| `'heart-rate'` | `(data: PulsoidRoomHeartRate) => void` | Heart rate from a room member |
| `'room-member-updated'` | `(data: PulsoidRoomMemberUpdated) => void` | A member's config was updated |
| `'room-member-removed'` | `(data: PulsoidRoomMemberRemoved) => void` | A member was removed from the room |
| `'room-updated'` | `(data: PulsoidRoomUpdated) => void` | The room config was updated |

---

## Types

### PulsoidSocketOptions

```typescript
interface PulsoidSocketOptions {
  reconnect?: ReconnectOptions;
}
```

### PulsoidRoomSocketOptions

```typescript
interface PulsoidRoomSocketOptions {
  kinds?: PulsoidRoomEventKind[];  // default: all kinds
  reconnect?: ReconnectOptions;
}

type PulsoidRoomEventKind =
  | 'heart_rate'
  | 'room_member_updated'
  | 'room_member_removed'
  | 'room_updated';
```

### ReconnectOptions

Reconnect interval formula: `Math.min(maxInterval, minInterval * 2^attempt)`

```typescript
interface ReconnectOptions {
  enable?: boolean;               // default: true
  reconnectMinInterval?: number;  // default: 2000 ms
  reconnectMaxInterval?: number;  // default: 10000 ms
  reconnectAttempts?: number;     // default: 100
}
```

### Data types

```typescript
interface PulsoidHeartRateMessage {
  heartRate: number;   // BPM
  measuredAt: number;  // Unix timestamp
}

interface PulsoidRoomHeartRate {
  profileId: string;
  bpm: number;
  timestamp: string;
}

interface PulsoidRoomMemberUpdated {
  profileId: string;
  config: Record<string, unknown>;
  timestamp: string;
}

interface PulsoidRoomMemberRemoved {
  profileId: string;
  timestamp: string;
}

interface PulsoidRoomUpdated {
  roomId: string;
  config: Record<string, unknown>;
  timestamp: string;
}
```

### PulsoidTokenError

```typescript
interface PulsoidTokenError {
  code: number;
  message: string;
}
```

| Code | Message | Description |
| --- | --- | --- |
| 7005 | `token_not_found` | Token is invalid or does not exist |
| 7006 | `token_expired` | Token has expired |
| 7007 | `premium_required` | Premium subscription required |
| 7008 | `insufficient_scope` | Token is missing the required scope |

## Links

- [Pulsoid](https://pulsoid.net) — official website
- [API Documentation](https://docs.pulsoid.net/) — how to obtain tokens and full API reference
- [Discord](https://discord.gg/tZktPS5) — community support
- [GitHub](https://github.com/pulsoid-oss/pulsoid-socket) — source code and issues
- [Live Demo](https://pulsoid-oss.github.io/pulsoid-socket/) — try it in the browser

## License

MIT
