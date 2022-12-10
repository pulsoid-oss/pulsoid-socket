import WS from 'jest-websocket-mock';
import PulsoidSocket from './index';

const TEST_TOKEN = 'token';
let webSocketServerMock: WS;

const openConnection = (options?: ConstructorParameters<typeof WS>[1]) => {
  webSocketServerMock = new WS(
    `wss://dev.pulsoid.net/api/v1/data/real_time?access_token=${TEST_TOKEN}`,
    options
  );
};

const waitForConnection = async () => {
  await Promise.race([
    webSocketServerMock.connected,
    new Promise((r) => setTimeout(r, 20)),
  ]);
};

describe('Pusloid Socket', () => {
  let pulsocket: PulsoidSocket;
  afterEach(() => {
    pulsocket?.disconnect();
    webSocketServerMock?.close();
  });

  it('should have public methods', () => {
    openConnection();
    pulsocket = new PulsoidSocket(TEST_TOKEN);

    expect(pulsocket).toHaveProperty('on');
    expect(pulsocket).toHaveProperty('off');
    expect(pulsocket).toHaveProperty('connect');
    expect(pulsocket).toHaveProperty('disconnect');
    expect(pulsocket).toHaveProperty('isConnected');
  });

  it('should connect to WS server', async () => {
    openConnection();
    pulsocket = new PulsoidSocket(TEST_TOKEN);

    expect(pulsocket.isConnected()).toBe(false);

    pulsocket.connect();

    await webSocketServerMock.connected;

    expect(pulsocket.isConnected()).toBe(true);
  });

  describe('events', () => {
    describe('"open"', () => {
      it('should call on("open") handler after connecting webSocket', async () => {
        openConnection();
        pulsocket = new PulsoidSocket(TEST_TOKEN);
        const mockOnOpen = jest.fn();

        pulsocket.on('open', mockOnOpen);

        pulsocket.connect();
        await waitForConnection();

        expect(mockOnOpen).toHaveBeenCalled();
        expect(mockOnOpen).toHaveBeenCalledTimes(1);
      });

      it('should not call on("open") if webSocket was not connected (rejected by server)', async () => {
        openConnection({verifyClient: () => false});
        pulsocket = new PulsoidSocket(TEST_TOKEN);
        const mockOnOpen = jest.fn();

        pulsocket.on('open', mockOnOpen);

        pulsocket.connect();
        await waitForConnection();

        expect(mockOnOpen).not.toHaveBeenCalled();
      });

      it('should not call on("open") after off("open")', async () => {
        openConnection();
        pulsocket = new PulsoidSocket(TEST_TOKEN);
        const mockOnOpen = jest.fn();

        pulsocket.on('open', mockOnOpen);
        pulsocket.off('open', mockOnOpen);

        pulsocket.connect();
        await waitForConnection();

        expect(mockOnOpen).not.toHaveBeenCalled();
      });

      it('should not call on("open") after off("open") without arguments', async () => {
        openConnection();
        pulsocket = new PulsoidSocket(TEST_TOKEN);
        const mockOnOpen = jest.fn();

        pulsocket.on('open', mockOnOpen);
        pulsocket.off('open');

        pulsocket.connect();
        await waitForConnection();

        expect(mockOnOpen).not.toHaveBeenCalled();
      });
    });

    describe('"close"', () => {
      it('should call onclose handler after disconnecting webSocket', async () => {
        openConnection();
        pulsocket = new PulsoidSocket(TEST_TOKEN);
        const mockOnClose = jest.fn();

        pulsocket.on('close', mockOnClose);

        pulsocket.connect();
        await waitForConnection();

        expect(mockOnClose).not.toHaveBeenCalled();

        pulsocket.disconnect();

        await webSocketServerMock.closed;

        expect(mockOnClose).toHaveBeenCalled();
        expect(mockOnClose).toHaveBeenCalledTimes(1);
      });
    });

    describe('"heart-rate"', () => {
      it('should call handler after receiving message from webSocket', async () => {
        openConnection();
        pulsocket = new PulsoidSocket(TEST_TOKEN);
        const mockOnMessage = jest.fn();

        pulsocket.on('heart-rate', mockOnMessage);

        pulsocket.connect();
        await waitForConnection();

        expect(mockOnMessage).not.toHaveBeenCalled();

        webSocketServerMock.send(
          JSON.stringify({data: {heart_rate: 60}, measured_at: 1609459200000})
        );

        expect(mockOnMessage).toHaveBeenCalled();
        expect(mockOnMessage).toHaveBeenCalledTimes(1);
        expect(mockOnMessage).toHaveBeenCalledWith({
          heartRate: 60,
          measuredAt: 1609459200000,
        });

        webSocketServerMock.send(
          JSON.stringify({data: {heart_rate: 76}, measured_at: 1609459201000})
        );
        expect(mockOnMessage).toHaveBeenCalledTimes(2);
        expect(mockOnMessage).toHaveBeenCalledWith({
          heartRate: 76,
          measuredAt: 1609459201000,
        });
      });

      it('should not call onmessage handler after off("message")', async () => {
        openConnection();
        pulsocket = new PulsoidSocket(TEST_TOKEN);
        const mockOnMessage = jest.fn();

        pulsocket.on('heart-rate', mockOnMessage);

        pulsocket.connect();
        await waitForConnection();

        expect(mockOnMessage).not.toHaveBeenCalled();

        webSocketServerMock.send(
          JSON.stringify({data: {heart_rate: 60}, measured_at: 1609459200000})
        );

        expect(mockOnMessage).toHaveBeenCalled();
        expect(mockOnMessage).toHaveBeenCalledTimes(1);

        pulsocket.off('heart-rate', mockOnMessage);

        webSocketServerMock.send(
          JSON.stringify({data: {heart_rate: 76}, measured_at: 1609459201000})
        );
        expect(mockOnMessage).toHaveBeenCalledTimes(1);
      });
    });

    describe('"error"', () => {
      it('should call onerror handler after receiving error from webSocket', async () => {
        openConnection();
        pulsocket = new PulsoidSocket(TEST_TOKEN);
        const mockOnError = jest.fn();

        pulsocket.on('error', mockOnError);

        pulsocket.connect();
        await waitForConnection();

        expect(mockOnError).not.toHaveBeenCalled();

        webSocketServerMock.error();

        expect(mockOnError).toHaveBeenCalled();
        expect(mockOnError).toHaveBeenCalledTimes(1);
      });

      it('should not call onerror handler after off("error")', async () => {
        openConnection();
        pulsocket = new PulsoidSocket(TEST_TOKEN);
        const mockOnError = jest.fn();

        pulsocket.on('error', mockOnError);

        pulsocket.connect();
        await waitForConnection();

        expect(mockOnError).not.toHaveBeenCalled();

        pulsocket.off('error');

        expect(mockOnError).not.toHaveBeenCalled();
        expect(mockOnError).toHaveBeenCalledTimes(0);
      });
    });

    describe('"online"', () => {
      it('should call handler after receiving first message from webSocket', async () => {
        openConnection();
        pulsocket = new PulsoidSocket(TEST_TOKEN);
        const mockOnOnline = jest.fn();

        pulsocket.on('online', mockOnOnline);

        pulsocket.connect();
        await waitForConnection();

        expect(mockOnOnline).not.toHaveBeenCalled();

        webSocketServerMock.send(
          JSON.stringify({data: {heart_rate: 60}, measured_at: 1609459200000})
        );

        expect(mockOnOnline).toHaveBeenCalled();
        expect(mockOnOnline).toHaveBeenCalledTimes(1);

        webSocketServerMock.send(
          JSON.stringify({data: {heart_rate: 76}, measured_at: 1609459201000})
        );

        expect(mockOnOnline).toHaveBeenCalledTimes(1);
      });

      it('should fire before the "heart-rate" event', async () => {
        openConnection();
        pulsocket = new PulsoidSocket(TEST_TOKEN);
        const mockOnOnline = jest.fn();
        const mockOnHeartRate = jest.fn();

        pulsocket.on('heart-rate', mockOnHeartRate);
        pulsocket.on('online', mockOnOnline);

        pulsocket.connect();
        await waitForConnection();

        expect(mockOnOnline).not.toHaveBeenCalled();

        webSocketServerMock.send(
          JSON.stringify({data: {heart_rate: 60}, measured_at: 1609459200000})
        );

        expect(mockOnOnline).toHaveBeenCalled();
        expect(mockOnOnline).toHaveBeenCalledTimes(1);

        const onlineEmittedBeforeHeartRate =
          mockOnOnline.mock.invocationCallOrder[0] <
          mockOnHeartRate.mock.invocationCallOrder[0];

        expect(onlineEmittedBeforeHeartRate).toBe(true);
      });
    });

    describe('"offline"', () => {
      it('should call handler after receiving first message from webSocket', async () => {
        jest.useFakeTimers();
        openConnection();
        pulsocket = new PulsoidSocket(TEST_TOKEN);
        const mockOnOffline = jest.fn();

        pulsocket.on('offline', mockOnOffline);

        pulsocket.connect();

        jest.runAllTimers();
        await waitForConnection();
        jest.runAllTimers();

        expect(jest.getTimerCount()).toBe(0);

        webSocketServerMock.send(
          JSON.stringify({data: {heart_rate: 60}, measured_at: 1609459200000})
        );

        expect(mockOnOffline).not.toHaveBeenCalled();

        expect(jest.getTimerCount()).toBe(1);
        jest.runAllTimers();

        expect(mockOnOffline).toHaveBeenCalled();
        expect(mockOnOffline).toHaveBeenCalledTimes(1);
        jest.useRealTimers();
      });

      it('should call handler when connection is closed if heart rate monitor is online', async () => {
        openConnection();
        pulsocket = new PulsoidSocket(TEST_TOKEN);
        const mockOnOffline = jest.fn();

        pulsocket.on('offline', mockOnOffline);

        pulsocket.connect();

        await waitForConnection();

        expect(jest.getTimerCount()).toBe(0);

        webSocketServerMock.send(
          JSON.stringify({data: {heart_rate: 60}, measured_at: 1609459200000})
        );

        expect(mockOnOffline).not.toHaveBeenCalled();

        pulsocket.disconnect();
        await webSocketServerMock.closed;

        expect(mockOnOffline).toHaveBeenCalled();
        expect(mockOnOffline).toHaveBeenCalledTimes(1);
      });

      it('should fire before close event', async () => {
        openConnection();
        pulsocket = new PulsoidSocket(TEST_TOKEN);
        const mockOnOffline = jest.fn();
        const mockOnClose = jest.fn();

        pulsocket.on('offline', mockOnOffline);
        pulsocket.on('close', mockOnClose);

        pulsocket.connect();

        await waitForConnection();

        expect(jest.getTimerCount()).toBe(0);

        webSocketServerMock.send(
          JSON.stringify({data: {heart_rate: 60}, measured_at: 1609459200000})
        );

        expect(mockOnOffline).not.toHaveBeenCalled();

        pulsocket.disconnect();
        await webSocketServerMock.closed;

        expect(mockOnOffline).toHaveBeenCalled();
        expect(mockOnOffline).toHaveBeenCalledTimes(1);

        const offlineEmittedBeforeClose =
          mockOnOffline.mock.invocationCallOrder[0] <
          mockOnClose.mock.invocationCallOrder[0];

        expect(offlineEmittedBeforeClose).toBe(true);
      });

      it('should not call handler when connection is closed and heart rate monitor is offline', async () => {
        openConnection();
        pulsocket = new PulsoidSocket(TEST_TOKEN);
        const mockOnOffline = jest.fn();

        pulsocket.on('offline', mockOnOffline);

        pulsocket.connect();

        await waitForConnection();

        expect(jest.getTimerCount()).toBe(0);

        expect(mockOnOffline).not.toHaveBeenCalled();

        pulsocket.disconnect();

        expect(mockOnOffline).not.toHaveBeenCalled();
      });
    });

    it('should be able to call all assigned hanndlers', async () => {
      openConnection();
      pulsocket = new PulsoidSocket(TEST_TOKEN);
      const mockOnOpen1 = jest.fn();
      const mockOnOpen2 = jest.fn();
      const mockOnOpen3 = jest.fn();
      const mockOnClose1 = jest.fn();
      const mockOnClose2 = jest.fn();
      const mockOnMessage1 = jest.fn();
      const mockOnMessage2 = jest.fn();
      const mockOnError1 = jest.fn();
      const mockOnError2 = jest.fn();

      pulsocket.on('open', mockOnOpen1);
      pulsocket.on('open', mockOnOpen2);
      pulsocket.on('open', mockOnOpen3);
      pulsocket.on('close', mockOnClose1);
      pulsocket.on('close', mockOnClose2);
      pulsocket.on('heart-rate', mockOnMessage1);
      pulsocket.on('heart-rate', mockOnMessage2);
      pulsocket.on('error', mockOnError1);
      pulsocket.on('error', mockOnError2);

      pulsocket.off('open', mockOnOpen2);

      pulsocket.connect();

      await waitForConnection();

      expect(mockOnOpen1).toHaveBeenCalled();
      expect(mockOnOpen1).toHaveBeenCalledTimes(1);
      expect(mockOnOpen2).not.toHaveBeenCalled();
      expect(mockOnOpen3).toHaveBeenCalled();
      expect(mockOnOpen3).toHaveBeenCalledTimes(1);

      webSocketServerMock.send(
        JSON.stringify({data: {heart_rate: 60}, measured_at: 1609459200000})
      );

      expect(mockOnMessage1).toHaveBeenCalled();
      expect(mockOnMessage1).toHaveBeenCalledTimes(1);
      expect(mockOnMessage2).toHaveBeenCalled();
      expect(mockOnMessage2).toHaveBeenCalledTimes(1);

      webSocketServerMock.error();

      expect(mockOnError1).toHaveBeenCalled();
      expect(mockOnError1).toHaveBeenCalledTimes(1);
      expect(mockOnError2).toHaveBeenCalled();
      expect(mockOnError2).toHaveBeenCalledTimes(1);

      pulsocket.disconnect();
      await webSocketServerMock.closed;

      expect(mockOnClose1).toHaveBeenCalled();
      expect(mockOnClose1).toHaveBeenCalledTimes(1);
      expect(mockOnClose2).toHaveBeenCalled();
      expect(mockOnClose2).toHaveBeenCalledTimes(1);
    });
  });

  describe('reconnect flow', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });
    afterEach(() => {
      pulsocket?.disconnect();
      jest.runAllTimers();
      jest.useRealTimers();
    });

    it('should reconnect after 5 seconds', async () => {
      openConnection();
      pulsocket = new PulsoidSocket(TEST_TOKEN, {
        reconnect: {
          enable: true,
          reconnectMinInterval: 5000,
          reconnectMaxInterval: 10000,
        },
      });
      const mockOnReconnect = jest.fn();

      pulsocket.on('reconnect', mockOnReconnect);

      pulsocket.connect();

      jest.runAllTimers();
      await waitForConnection();

      expect(pulsocket.isConnected()).toBe(true);

      webSocketServerMock.error();
      await webSocketServerMock.closed;

      expect(pulsocket.isConnected()).toBe(false);

      openConnection();
      jest.advanceTimersByTime(5500);
      await waitForConnection();

      expect(mockOnReconnect).toHaveBeenCalled();
      expect(mockOnReconnect).toHaveBeenCalledTimes(1);

      expect(pulsocket.isConnected()).toBe(true);
    });

    it('should reconnect try to reconnect 3 times by default', async () => {
      openConnection();
      pulsocket = new PulsoidSocket(TEST_TOKEN);
      const mockOnReconnect = jest.fn();

      pulsocket.on('reconnect', mockOnReconnect);

      pulsocket.connect();

      jest.runAllTimers();
      await waitForConnection();

      expect(pulsocket.isConnected()).toBe(true);

      webSocketServerMock.error();
      await webSocketServerMock.closed;

      jest.runAllTimers();

      expect(mockOnReconnect).toHaveBeenCalledTimes(3);

      expect(pulsocket.isConnected()).toBe(false);
    });

    it('should reconnect set amount of times', async () => {
      openConnection();
      const RECONNECT_ATTEMPTS = 5;
      pulsocket = new PulsoidSocket(TEST_TOKEN, {
        reconnect: {reconnectAttempts: RECONNECT_ATTEMPTS},
      });

      const mockOnReconnect = jest.fn();
      pulsocket.on('reconnect', mockOnReconnect);

      pulsocket.connect();

      jest.runAllTimers();
      await waitForConnection();

      expect(pulsocket.isConnected()).toBe(true);

      webSocketServerMock.error();
      await webSocketServerMock.closed;

      jest.runAllTimers();

      expect(mockOnReconnect).toHaveBeenCalledTimes(RECONNECT_ATTEMPTS);

      expect(pulsocket.isConnected()).toBe(false);
    });

    it('should reconnect with progressive interval', async () => {
      openConnection();
      pulsocket = new PulsoidSocket(TEST_TOKEN, {
        reconnect: {
          enable: true,
          reconnectMinInterval: 1000,
          reconnectMaxInterval: 10000,
        },
      });

      const mockOnReconnect = jest.fn();
      pulsocket.on('reconnect', mockOnReconnect);

      pulsocket.connect();

      jest.runAllTimers();
      await waitForConnection();

      webSocketServerMock.error();
      await webSocketServerMock.closed;

      expect(mockOnReconnect).toHaveBeenCalledTimes(0);

      jest.advanceTimersByTime(999);
      expect(mockOnReconnect).toHaveBeenCalledTimes(0);
      jest.advanceTimersByTime(1);
      expect(mockOnReconnect).toHaveBeenCalledTimes(1);

      jest.advanceTimersByTime(1999);
      expect(mockOnReconnect).toHaveBeenCalledTimes(1);
      jest.advanceTimersByTime(10);
      expect(mockOnReconnect).toHaveBeenCalledTimes(2);
      jest.advanceTimersByTime(3990);
      expect(mockOnReconnect).toHaveBeenCalledTimes(2);
      jest.advanceTimersByTime(100);
      expect(mockOnReconnect).toHaveBeenCalledTimes(3);
    });

    it('should not reconnect if reconnect is disabled', async () => {
      openConnection();
      pulsocket = new PulsoidSocket(TEST_TOKEN, {
        reconnect: {enable: false},
      });

      const mockOnReconnect = jest.fn();
      pulsocket.on('reconnect', mockOnReconnect);

      pulsocket.connect();
      jest.runAllTimers();
      await waitForConnection();

      webSocketServerMock.error();
      await webSocketServerMock.closed;

      jest.runAllTimers();

      expect(mockOnReconnect).not.toHaveBeenCalled();
    });
  });
});
