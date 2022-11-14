# pulsoid-socket

Zero dependency client for consuming [Heart Rate Data](https://github.com/pulsoid-oss/pulsoid-api/wiki/Heart-Rate-Data-API#read-heart-rate-via-websocket) from [pulsoid-api](https://github.com/pulsoid-oss/pulsoid-api).

## Getting started

To install the package with npm, run:

```bash
npm install pulsoid-socket
```

or with yarn:

```bash
yarn add pulsoid-socket
```

## Basic usage

In order to use the client, you need to have a valid authorization token. Check out how to get one [here](https://github.com/pulsoid-oss/pulsoid-api/wiki/OAuth2-Authorization-Code-Grant);

```javascript
import {PulsoidSocket} from 'pulsoid-socket';

const pulsocket = new PulsoidSocket('YOUR_AUTH_TOKEN');

pulsocket.on('open', ((event) => {
  console.log('Start listening to heart rate data');
});
pulsocket.on('message', (message) => {
  console.log(`Current heart rate is ${message.heartRate}`);
});
pulsocket.on('close', (event) => {
  console.log('Stop listening to heart rate data');
});

pulsocket.connect();
```

## API

### List of available Methods on PulsoidSocket instance

| Method                                                       | Description                                                                                               |
| ------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------- |
| `constructor(token: string, options?: PulsoidSocketOptions)` | Creates a new instance of the client.                                                                     |
| `connect()`                                                  | Connects to the websocket server                                                                          |
| `disconnect()`                                               | Disconnects from the websocket server                                                                     |
| `on(eventType: EventType, callback: Callback `               | Adds a listener for the specified event type.                                                             |
| `off(eventType: EventType, callback?: Callback)`             | Removes a listener for the specified event type. Removes all handlers if callback parameter is not passed |
| Callback function to be called when an error occurs          |
| `isConnected()`                                              | Returns true if socket connection is alive                                                                |

### List of available `EventType`'s for `on` method

| Event Type  | Callback Type                         | Description                               |
| ----------- | ------------------------------------- | ----------------------------------------- |
| `'open'`    | `(event: Event) => void`              | Called when the connection is established |
| `'message'` | `(event: Message) => void`            | Called when a message is received         |
| `'close'`   | `(event: CloseEvent) => void`         | Called when the connection is closed      |
| `'error'`   | `(error: PulsoidSocketError) => void` | Called when an error occurs               |

`PulsoidSocketOptions` interface:

```typescript
interface PulsoidSocketOptions {
  format?: 'plain' | 'json'; // default: 'json'
}
```

`Message` format (when `format` is set to `json`):

```typescript
interface Message {
  measuredAt: number; // Unix timestamp
  heartRate: number; // Heart rate in BPM
}
```

`Message` format (when `format` is set to `plain`) is a string with heart rate value in BPM.

`PulsoidSocketError` interface:

```typescript
interface PulsoidSocketError {
  code: number; // Error code
}
```

specification of error codes:
| Code | Description |
| ---- | ----------- |
| 412 | User doesn't have any heart rate data |
