# @pulsoid/socket

Zero-dependency WebSocket client for consuming real-time heart rate data from [Pulsoid](https://pulsoid.net).

Supports two modes:
- **Standard** — stream your own heart rate
- **Room** — stream heart rate data from all members of a shared room

[Live Demo](https://pulsoid-oss.github.io/pulsoid-socket/) · [API Docs](https://docs.pulsoid.net/) · [Discord](https://discord.gg/tZktPS5)

## Table of contents

- [Getting started](#getting-started)
- [Basic usage](#basic-usage)
- [Room mode](#room-mode)
- [Using CDN](#using-cdn)
- [API](#api)
  - [PulsoidSocket](#pulsoidsocket)
  - [PulsoidRoomSocket](#pulsoidroomsocket)
- [Events](#events)
  - [Standard socket events](#standard-socket-events)
  - [Room socket events](#room-socket-events)
- [Types](#types)
  - [Options](#options)
  - [Data types](#data-types)
  - [Event types](#event-types)
  - [Error types](#error-types)
- [Reconnection](#reconnection)
- [Connection lifecycle](#connection-lifecycle)
- [Error handling](#error-handling)
- [Examples](#examples)
- [Links](#links)

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

For flows other than manual issuing, create API client credentials at [pulsoid.net/ui/api-clients](https://pulsoid.net/ui/api-clients).

**Required scopes:**

| Mode | Scope |
| --- | --- |
| Standard | `data:heart_rate:read` |
| Room | `data:room:read` |

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

Rooms allow multiple users to stream their heart rate data to a shared channel. All participants can see each other's heart rate in real time. Each event includes a `profileId` so you can identify individual members.

```javascript
import { PulsoidSocket } from '@pulsoid/socket';
// or: import { PulsoidRoomSocket } from '@pulsoid/socket';

const room = PulsoidSocket.createRoom('YOUR_ACCESS_TOKEN', 'ROOM_ID', {
  // optional: filter which event kinds to subscribe to (default: all)
  kinds: ['heart_rate', 'room_member_updated'],
});

room.on('heart-rate', (data) => {
  console.log(`${data.profileId}: ${data.bpm} BPM`);
});

room.on('room-member-updated', (data) => {
  console.log(`Member ${data.profileId} config updated`, data.config);
});

room.on('room-member-removed', (data) => {
  console.log(`Member ${data.profileId} left`);
});

room.on('room-updated', (data) => {
  console.log(`Room ${data.roomId} config updated`, data.config);
});

await room.connect();
```

### Room event kinds

When creating a room socket, you can filter which event kinds to subscribe to using the `kinds` option. By default all kinds are subscribed.

| Kind | Description |
| --- | --- |
| `'heart_rate'` | Heart rate updates from room members |
| `'room_member_updated'` | A member's configuration was changed |
| `'room_member_removed'` | A member was removed from the room |
| `'room_updated'` | The room's configuration was changed |

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

| Method | Returns | Description |
| --- | --- | --- |
| `PulsoidSocket.create(token, options?)` | `PulsoidSocket` | Create a standard socket instance. Takes a token string and optional `PulsoidSocketOptions`. |
| `PulsoidSocket.createRoom(token, roomId, options?)` | `PulsoidRoomSocket` | Create a room socket instance. Takes a token string, room ID string, and optional `PulsoidRoomSocketOptions`. |

#### Instance methods

| Method | Returns | Description |
| --- | --- | --- |
| `connect()` | `Promise<void>` | Validate the token via HTTP, then open the WebSocket. Rejects with `PulsoidTokenError` if the token is invalid, expired, or missing the required scope. No-ops if already connected or connecting. |
| `disconnect()` | `void` | Close the WebSocket connection, cancel any pending reconnection timers, and stop auto-reconnect. |
| `on(event, callback)` | `void` | Add an event listener. See [Events](#events) for typed signatures. |
| `off(event, callback?)` | `void` | Remove a specific listener, or all listeners for the event if no callback is given. |
| `isConnected()` | `boolean` | Returns `true` if the WebSocket is in the `OPEN` state. |
| `isOnline()` | `boolean` | Returns `true` if the heart rate monitor is actively sending data. Becomes `false` after 30 seconds of silence. **Standard mode only.** |

### PulsoidRoomSocket

Created via `PulsoidSocket.createRoom()` or imported directly:

```javascript
import { PulsoidRoomSocket } from '@pulsoid/socket';
const room = PulsoidRoomSocket.create(token, roomId, options?);
```

#### Static methods

| Method | Returns | Description |
| --- | --- | --- |
| `PulsoidRoomSocket.create(token, roomId, options?)` | `PulsoidRoomSocket` | Create a room socket instance. Takes a token string, room ID string, and optional `PulsoidRoomSocketOptions`. |

#### Instance methods

| Method | Returns | Description |
| --- | --- | --- |
| `connect()` | `Promise<void>` | Validate the token via HTTP, then open the WebSocket. Rejects with `PulsoidTokenError` on failure. |
| `disconnect()` | `void` | Close the connection and stop auto-reconnect. |
| `on(event, callback)` | `void` | Add an event listener. See [Room socket events](#room-socket-events). |
| `off(event, callback?)` | `void` | Remove a specific listener, or all listeners for the event. |
| `isConnected()` | `boolean` | Returns `true` if the WebSocket is in the `OPEN` state. |

> `PulsoidRoomSocket` does **not** have `isOnline()` — there is no single monitor to track since rooms have multiple members.

---

## Events

### Standard socket events

| Event | Callback signature | Description |
| --- | --- | --- |
| `'open'` | `(event: Event) => void` | WebSocket connection established. |
| `'heart-rate'` | `(data: PulsoidHeartRateMessage) => void` | Heart rate data received. `data.heartRate` is BPM, `data.measuredAt` is a Unix timestamp. |
| `'online'` | `() => void` | Heart rate monitor started sending data. Fires on the first message received. |
| `'offline'` | `() => void` | No data received from the monitor for 30 seconds (debounced). Also fires immediately when the connection closes if the monitor was online. |
| `'close'` | `(event: CloseEvent) => void` | WebSocket connection closed. Fires before auto-reconnect kicks in. |
| `'error'` | `(event: Event) => void` | WebSocket error occurred. |
| `'reconnect'` | `(e: { attempt: number }) => void` | Auto-reconnect attempt starting. `attempt` is 1-indexed. |
| `'token-error'` | `(e: PulsoidTokenError) => void` | Token validation failed during a reconnect attempt. Reconnection stops. See [Error types](#error-types). |

### Room socket events

Shares `open`, `close`, `error`, `reconnect`, and `token-error` with the standard socket (same signatures). Room-specific events:

| Event | Callback signature | Description |
| --- | --- | --- |
| `'heart-rate'` | `(data: PulsoidRoomHeartRate) => void` | Heart rate from a room member. `data.profileId` identifies the member, `data.bpm` is the heart rate, `data.timestamp` is an ISO 8601 string. |
| `'room-member-updated'` | `(data: PulsoidRoomMemberUpdated) => void` | A member's configuration was updated. `data.config` is an arbitrary key-value object. |
| `'room-member-removed'` | `(data: PulsoidRoomMemberRemoved) => void` | A member was removed from the room. |
| `'room-updated'` | `(data: PulsoidRoomUpdated) => void` | The room configuration was updated. `data.roomId` identifies the room, `data.config` is an arbitrary key-value object. |

> Room sockets do **not** emit `online` or `offline` events.

---

## Types

All types are exported from the package and can be imported for use with TypeScript:

```typescript
import type {
  PulsoidHeartRateMessage,
  PulsoidSocketOptions,
  PulsoidSocketEventType,
  PulsoidTokenError,
  ReconnectOptions,
  PulsoidRoomEventKind,
  PulsoidRoomHeartRate,
  PulsoidRoomMemberUpdated,
  PulsoidRoomMemberRemoved,
  PulsoidRoomUpdated,
  PulsoidRoomSocketOptions,
  PulsoidRoomSocketEventType,
} from '@pulsoid/socket';
```

### Options

#### `PulsoidSocketOptions`

```typescript
type PulsoidSocketOptions = {
  reconnect?: ReconnectOptions;
};
```

#### `PulsoidRoomSocketOptions`

```typescript
type PulsoidRoomSocketOptions = {
  kinds?: PulsoidRoomEventKind[];  // default: all kinds
  reconnect?: ReconnectOptions;
};
```

#### `ReconnectOptions`

```typescript
type ReconnectOptions = {
  enable?: boolean;               // default: true
  reconnectMinInterval?: number;  // default: 2000 ms
  reconnectMaxInterval?: number;  // default: 10000 ms
  reconnectAttempts?: number;     // default: 100
};
```

Reconnect interval uses exponential backoff: `Math.min(maxInterval, minInterval * 2^attempt)`

#### `PulsoidRoomEventKind`

```typescript
type PulsoidRoomEventKind =
  | 'heart_rate'
  | 'room_member_updated'
  | 'room_member_removed'
  | 'room_updated';
```

### Data types

#### `PulsoidHeartRateMessage`

Emitted by the standard socket's `'heart-rate'` event.

```typescript
type PulsoidHeartRateMessage = {
  heartRate: number;   // beats per minute
  measuredAt: number;  // Unix timestamp (milliseconds)
};
```

#### `PulsoidRoomHeartRate`

Emitted by the room socket's `'heart-rate'` event.

```typescript
type PulsoidRoomHeartRate = {
  profileId: string;   // unique member identifier
  bpm: number;         // beats per minute
  timestamp: string;   // ISO 8601 timestamp
};
```

#### `PulsoidRoomMemberUpdated`

Emitted by the room socket's `'room-member-updated'` event.

```typescript
type PulsoidRoomMemberUpdated = {
  profileId: string;                // unique member identifier
  config: Record<string, unknown>;  // arbitrary configuration object
  timestamp: string;                // ISO 8601 timestamp
};
```

#### `PulsoidRoomMemberRemoved`

Emitted by the room socket's `'room-member-removed'` event.

```typescript
type PulsoidRoomMemberRemoved = {
  profileId: string;  // unique member identifier
  timestamp: string;  // ISO 8601 timestamp
};
```

#### `PulsoidRoomUpdated`

Emitted by the room socket's `'room-updated'` event.

```typescript
type PulsoidRoomUpdated = {
  roomId: string;                   // room identifier
  config: Record<string, unknown>;  // arbitrary configuration object
  timestamp: string;                // ISO 8601 timestamp
};
```

### Event types

Union types representing all valid event names for each socket type. Useful for generic event handling code.

#### `PulsoidSocketEventType`

```typescript
type PulsoidSocketEventType =
  | 'open'
  | 'heart-rate'
  | 'error'
  | 'close'
  | 'online'
  | 'offline'
  | 'reconnect'
  | 'token-error';
```

#### `PulsoidRoomSocketEventType`

```typescript
type PulsoidRoomSocketEventType =
  | 'open'
  | 'close'
  | 'error'
  | 'reconnect'
  | 'token-error'
  | 'heart-rate'
  | 'room-member-updated'
  | 'room-member-removed'
  | 'room-updated';
```

### Error types

#### `PulsoidTokenError`

Thrown by `connect()` and emitted by the `'token-error'` event during reconnection.

```typescript
type PulsoidTokenError = {
  code: number;
  message: string;
};
```

| Code | Message | Description |
| --- | --- | --- |
| `7005` | `token_not_found` | Token is invalid or does not exist |
| `7006` | `token_expired` | Token has expired |
| `7007` | `premium_required` | Premium subscription required |
| `7008` | `insufficient_scope` | Token is missing the required scope (`data:heart_rate:read` or `data:room:read`) |

---

## Reconnection

Auto-reconnection is **enabled by default** with exponential backoff.

### Default behavior

| Setting | Default |
| --- | --- |
| Enabled | `true` |
| Min interval | `2000` ms |
| Max interval | `10000` ms |
| Max attempts | `100` |

### Reconnection flow

1. The WebSocket closes unexpectedly.
2. The library waits for `Math.min(maxInterval, minInterval * 2^attempt)` milliseconds.
3. A `'reconnect'` event is emitted with `{ attempt }` (1-indexed).
4. The token is re-validated via HTTP.
5. If the token is valid, a new WebSocket connection opens.
6. If the token is invalid, a `'token-error'` event is emitted and reconnection **stops**.
7. If the attempt limit is reached, reconnection **stops**.
8. On successful reconnection, the attempt counter resets.

### Backoff timing examples

| Attempt | Interval (default settings) |
| --- | --- |
| 1 | `min(10000, 2000 * 2^1)` = 4000 ms |
| 2 | `min(10000, 2000 * 2^2)` = 8000 ms |
| 3 | `min(10000, 2000 * 2^3)` = 10000 ms (capped) |
| 4+ | 10000 ms (stays at max) |

### Disabling reconnection

```javascript
const socket = PulsoidSocket.create(token, {
  reconnect: { enable: false },
});
```

### Custom reconnection settings

```javascript
const socket = PulsoidSocket.create(token, {
  reconnect: {
    enable: true,
    reconnectMinInterval: 1000,   // start retrying after 1s
    reconnectMaxInterval: 30000,  // cap at 30s
    reconnectAttempts: 10,        // give up after 10 attempts
  },
});
```

### Monitoring reconnection

```javascript
socket.on('reconnect', (e) => {
  console.log(`Reconnect attempt #${e.attempt}`);
});

socket.on('token-error', (e) => {
  console.error(`Reconnection stopped — token error ${e.code}: ${e.message}`);
});
```

---

## Connection lifecycle

### Standard socket

```
create() → connect() → [token validation] → [WebSocket open]
                                                   │
                                    ┌──────────────┤
                                    ▼              ▼
                                  'open'     'token-error'
                                    │         (connect rejects)
                                    ▼
                              'heart-rate' ──→ 'online'
                                    │
                              (30s silence)
                                    │
                                    ▼
                                'offline'
                                    │
                              (connection lost)
                                    │
                                    ▼
                                 'close'
                                    │
                         ┌──────────┴──────────┐
                         ▼                      ▼
                   (reconnect on)         (reconnect off)
                         │                    (done)
                         ▼
                    'reconnect'
                         │
                  [token validation]
                         │
                    ┌────┴────┐
                    ▼         ▼
                 'open'  'token-error'
                              (stops)
```

### `isOnline()` behavior (standard mode only)

- Returns `false` initially.
- Becomes `true` on the first `'heart-rate'` message (emits `'online'`).
- Stays `true` as long as messages keep arriving.
- Reverts to `false` after **30 seconds** of silence (emits `'offline'`).
- Immediately reverts to `false` if the connection closes while online.

### `disconnect()` behavior

Calling `disconnect()`:
1. Cancels any pending reconnection timers.
2. Disables auto-reconnect for this connection.
3. Closes the WebSocket.
4. The `'close'` event fires, but no reconnect will follow.

---

## Error handling

### During initial connection

`connect()` returns a Promise that rejects with a `PulsoidTokenError` if the token is invalid:

```javascript
try {
  await socket.connect();
} catch (error) {
  // error is PulsoidTokenError
  console.error(`Connection failed: ${error.code} — ${error.message}`);

  switch (error.code) {
    case 7005: // token_not_found
      console.error('Token does not exist. Check your token value.');
      break;
    case 7006: // token_expired
      console.error('Token has expired. Obtain a new one.');
      break;
    case 7007: // premium_required
      console.error('A Pulsoid premium subscription is required.');
      break;
    case 7008: // insufficient_scope
      console.error('Token is missing the required scope.');
      break;
  }
}
```

### During reconnection

If the token becomes invalid while reconnecting, the error is emitted as a `'token-error'` event instead of rejecting a promise:

```javascript
socket.on('token-error', (error) => {
  // Reconnection has stopped — handle the error
  console.error(`Token error during reconnect: ${error.code} — ${error.message}`);
});
```

### WebSocket errors

WebSocket-level errors are emitted via the `'error'` event. These are typically followed by a `'close'` event and auto-reconnection:

```javascript
socket.on('error', (event) => {
  console.error('WebSocket error', event);
});
```

### Malformed messages

Malformed or missing data in incoming messages is handled internally — a warning is logged to the console and the message is silently skipped. No `'heart-rate'` event is emitted for invalid messages.

---

## Examples

### Standard mode with full event handling

```typescript
import PulsoidSocket, { type PulsoidHeartRateMessage } from '@pulsoid/socket';

const socket = PulsoidSocket.create('YOUR_TOKEN');

socket.on('open', () => console.log('Connected'));
socket.on('close', () => console.log('Disconnected'));
socket.on('error', (e) => console.error('WebSocket error', e));
socket.on('online', () => console.log('Monitor online'));
socket.on('offline', () => console.log('Monitor offline (30s silence)'));
socket.on('reconnect', (e) => console.log(`Reconnecting, attempt #${e.attempt}`));
socket.on('token-error', (e) => console.error(`Token error: ${e.code} ${e.message}`));

socket.on('heart-rate', (data: PulsoidHeartRateMessage) => {
  console.log(`${data.heartRate} BPM at ${new Date(data.measuredAt).toISOString()}`);
});

try {
  await socket.connect();
} catch (error) {
  console.error('Failed to connect:', error);
}

// Check connection state
console.log('Connected:', socket.isConnected());
console.log('Online:', socket.isOnline());

// Clean up when done
socket.disconnect();
```

### Room mode with member tracking

```typescript
import { PulsoidRoomSocket, type PulsoidRoomHeartRate } from '@pulsoid/socket';

const members = new Map<string, number>(); // profileId → latest BPM

const room = PulsoidRoomSocket.create('YOUR_TOKEN', 'ROOM_ID');

room.on('heart-rate', (data: PulsoidRoomHeartRate) => {
  members.set(data.profileId, data.bpm);
  console.log(`[${data.timestamp}] ${data.profileId}: ${data.bpm} BPM`);
});

room.on('room-member-removed', (data) => {
  members.delete(data.profileId);
  console.log(`${data.profileId} left the room`);
});

room.on('room-member-updated', (data) => {
  console.log(`${data.profileId} config:`, data.config);
});

room.on('room-updated', (data) => {
  console.log(`Room ${data.roomId} config:`, data.config);
});

await room.connect();
```

### Room mode with filtered event kinds

Subscribe only to heart rate updates to reduce traffic:

```javascript
const room = PulsoidSocket.createRoom('YOUR_TOKEN', 'ROOM_ID', {
  kinds: ['heart_rate'],
});

room.on('heart-rate', (data) => {
  console.log(`${data.profileId}: ${data.bpm} BPM`);
});

// room-member-updated, room-member-removed, room-updated events
// will NOT be received since those kinds weren't subscribed to

await room.connect();
```

### Managing event listeners

```javascript
const socket = PulsoidSocket.create(token);

const handler = (data) => console.log(data.heartRate);

// Add listener
socket.on('heart-rate', handler);

// Remove specific listener
socket.off('heart-rate', handler);

// Remove ALL listeners for an event
socket.off('heart-rate');
```

---

## Module formats

The library ships in three formats:

| Format | File | Usage |
| --- | --- | --- |
| ES Module | `dist/index.es.js` | `import` (bundlers, modern Node.js) |
| CommonJS | `dist/index.cjs.js` | `require()` (Node.js) |
| UMD | `dist/index.umd.js` | `<script>` tag (exposes global `PulsoidSocket`) |

TypeScript declarations are included at `dist/index.d.ts`.

## Links

- [Pulsoid](https://pulsoid.net) — official website
- [API Documentation](https://docs.pulsoid.net/) — how to obtain tokens and full API reference
- [Discord](https://discord.gg/tZktPS5) — community support
- [GitHub](https://github.com/pulsoid-oss/pulsoid-socket) — source code and issues
- [Live Demo](https://pulsoid-oss.github.io/pulsoid-socket/) — try it in the browser

## License

MIT
