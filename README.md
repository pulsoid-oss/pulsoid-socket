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
import PulsoidSocket from 'pulsoid-socket';

const pulsocket = new PulsoidSocket('YOUR_AUTH_TOKEN');

pulsocket.on('open', (event) => {
  console.log('Start listening to heart rate data');
});
pulsocket.on('heart-rate', (data) => {
  console.log(`Current heart rate is ${data.heartRate}`);
});
pulsocket.on('close', (event) => {
  console.log('Stop listening to heart rate data');
});

pulsocket.connect();
```

## Using CDN

You can also use the client directly from CDN. The client is available on [unpkg](https://unpkg.com/@pulsoid/socket@1.1.0/dist/index.js) and [jsdelivr](https://cdn.jsdelivr.net/npm/@pulsoid/socket).

Check the [codepen example](https://codepen.io/xmityaz/pen/PoaVdRK) on basic PulsoidSocket usage with CDN

---

## API

### List of available Methods on PulsoidSocket instance

| Method                                                       | Description                                                                                                  |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------ |
| `constructor(token: string, options?: PulsoidSocketOptions)` | Creates a new instance of the client.                                                                        |
| `connect()`                                                  | Connects to the websocket server                                                                             |
| `disconnect()`                                               | Disconnects from the websocket server                                                                        |
| `on(eventType: EventType, callback: Callback `               | Adds a listener for the specified event type.                                                                |
| `off(eventType: EventType, callback?: Callback)`             | Removes a listener for the specified event type. Removes all handlers if callback parameter is not specified |
| `isConnected()`                                              | Returns true if socket connection is alive                                                                   |

### List of available `EventType`'s for `on` method

| Event Type     | Callback Type                           | Description                                                                                         |
| -------------- | --------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `'open'`       | `(event: Event) => void`                | Called when the connection is established                                                           |
| `'heart-rate'` | `(heartRate: HeartRateMessage) => void` | Called when heart rate message is recieved                                                          |
| `'close'`      | `(event: CloseEvent) => void`           | Called when the connection is closed                                                                |
| `'error'`      | `(error: PulsoidSocketError) => void`   | Called when an error occurs                                                                         |
| `'online'`     | `() => void`                            | Called when heart rate monitor device sends first message                                           |
| `'offline'`    | `() => void`                            | Called when there are no incomming messages from heart rate monitor device for more than 30 seconds |
| `'reconnect'`  | `(event: {attempt: number}) => void`    | Called when the client is trying to reconnect                                                       |

`PulsoidSocketOptions` interface:

```typescript
interface PulsoidSocketOptions {
  // Reconnect timing formula:
  // Math.min(maxInterval, minInterval * Math.pow(2, attempt))
  reconnect?: {
    // Turn on/off the reconnect option. true by default
    enabled?: boolean;

    // Base value for reconnect interval. 2000 by default
    reconnectMinInterval?: number;

    // Max value for reconnect interval. 10000 by default
    reconnectMaxInterval?: number;

    // Number of attempts before stopping the reconect. 3 by default
    reconnectAttempts?: number;
  };
}
```

`HeartRateMessage` format:

```typescript
interface HeartRateMessage {
  measuredAt: number; // Unix timestamp
  heartRate: number; // Heart rate in BPM
}
```

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
