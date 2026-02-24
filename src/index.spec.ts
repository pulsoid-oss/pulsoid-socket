import WS from 'jest-websocket-mock';
import PulsoidSocket from './index';
import { flushPromises, mockFetchSuccess, mockFetchError } from './test-utils';

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

  beforeEach(() => {
    mockFetchSuccess(['data:heart_rate:read']);
  });

  afterEach(() => {
    pulsocket?.disconnect();
    webSocketServerMock?.close();
  });

  it('should have public methods', () => {
    openConnection();
    pulsocket = PulsoidSocket.create(TEST_TOKEN);

    expect(pulsocket).toHaveProperty('on');
    expect(pulsocket).toHaveProperty('off');
    expect(pulsocket).toHaveProperty('connect');
    expect(pulsocket).toHaveProperty('disconnect');
    expect(pulsocket).toHaveProperty('isConnected');
  });

  it('should connect to WS server', async () => {
    openConnection();
    pulsocket = PulsoidSocket.create(TEST_TOKEN);

    expect(pulsocket.isConnected()).toBe(false);

    await pulsocket.connect();

    await webSocketServerMock.connected;

    expect(pulsocket.isConnected()).toBe(true);
  });

  describe('events', () => {
    describe('"open"', () => {
      it('should call on("open") handler after connecting webSocket', async () => {
        openConnection();
        pulsocket = PulsoidSocket.create(TEST_TOKEN);
        const mockOnOpen = vi.fn();

        pulsocket.on('open', mockOnOpen);

        await pulsocket.connect();
        await waitForConnection();

        expect(mockOnOpen).toHaveBeenCalled();
        expect(mockOnOpen).toHaveBeenCalledTimes(1);
      });

      it('should not call on("open") if webSocket was not connected (rejected by server)', async () => {
        openConnection({verifyClient: () => false});
        pulsocket = PulsoidSocket.create(TEST_TOKEN);
        const mockOnOpen = vi.fn();

        pulsocket.on('open', mockOnOpen);

        await pulsocket.connect();
        await waitForConnection();

        expect(mockOnOpen).not.toHaveBeenCalled();
      });

      it('should not call on("open") after off("open")', async () => {
        openConnection();
        pulsocket = PulsoidSocket.create(TEST_TOKEN);
        const mockOnOpen = vi.fn();

        pulsocket.on('open', mockOnOpen);
        pulsocket.off('open', mockOnOpen);

        await pulsocket.connect();
        await waitForConnection();

        expect(mockOnOpen).not.toHaveBeenCalled();
      });

      it('should not call on("open") after off("open") without arguments', async () => {
        openConnection();
        pulsocket = PulsoidSocket.create(TEST_TOKEN);
        const mockOnOpen = vi.fn();

        pulsocket.on('open', mockOnOpen);
        pulsocket.off('open');

        await pulsocket.connect();
        await waitForConnection();

        expect(mockOnOpen).not.toHaveBeenCalled();
      });
    });

    describe('"close"', () => {
      it('should call onclose handler after disconnecting webSocket', async () => {
        openConnection();
        pulsocket = PulsoidSocket.create(TEST_TOKEN);
        const mockOnClose = vi.fn();

        pulsocket.on('close', mockOnClose);

        await pulsocket.connect();
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
        pulsocket = PulsoidSocket.create(TEST_TOKEN);
        const mockOnMessage = vi.fn();

        pulsocket.on('heart-rate', mockOnMessage);

        await pulsocket.connect();
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
        pulsocket = PulsoidSocket.create(TEST_TOKEN);
        const mockOnMessage = vi.fn();

        pulsocket.on('heart-rate', mockOnMessage);

        await pulsocket.connect();
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
        pulsocket = PulsoidSocket.create(TEST_TOKEN);
        const mockOnError = vi.fn();

        pulsocket.on('error', mockOnError);

        await pulsocket.connect();
        await waitForConnection();

        expect(mockOnError).not.toHaveBeenCalled();

        webSocketServerMock.error();

        expect(mockOnError).toHaveBeenCalled();
        expect(mockOnError).toHaveBeenCalledTimes(1);
      });

      it('should not call onerror handler after off("error")', async () => {
        openConnection();
        pulsocket = PulsoidSocket.create(TEST_TOKEN);
        const mockOnError = vi.fn();

        pulsocket.on('error', mockOnError);

        await pulsocket.connect();
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
        pulsocket = PulsoidSocket.create(TEST_TOKEN);
        const mockOnOnline = vi.fn();

        pulsocket.on('online', mockOnOnline);

        await pulsocket.connect();
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
        pulsocket = PulsoidSocket.create(TEST_TOKEN);
        const mockOnOnline = vi.fn();
        const mockOnHeartRate = vi.fn();

        pulsocket.on('heart-rate', mockOnHeartRate);
        pulsocket.on('online', mockOnOnline);

        await pulsocket.connect();
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
        vi.useFakeTimers();
        openConnection();
        pulsocket = PulsoidSocket.create(TEST_TOKEN);
        const mockOnOffline = vi.fn();

        pulsocket.on('offline', mockOnOffline);

        await pulsocket.connect();
        vi.runAllTimers();
        await waitForConnection();
        vi.runAllTimers();

        expect(vi.getTimerCount()).toBe(0);

        webSocketServerMock.send(
          JSON.stringify({data: {heart_rate: 60}, measured_at: 1609459200000})
        );

        expect(mockOnOffline).not.toHaveBeenCalled();

        expect(vi.getTimerCount()).toBe(1);
        vi.runAllTimers();

        expect(mockOnOffline).toHaveBeenCalled();
        expect(mockOnOffline).toHaveBeenCalledTimes(1);
        vi.useRealTimers();
      });

      it('should call handler when connection is closed if heart rate monitor is online', async () => {
        openConnection();
        pulsocket = PulsoidSocket.create(TEST_TOKEN);
        const mockOnOffline = vi.fn();

        pulsocket.on('offline', mockOnOffline);

        await pulsocket.connect();

        await waitForConnection();

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
        pulsocket = PulsoidSocket.create(TEST_TOKEN);
        const mockOnOffline = vi.fn();
        const mockOnClose = vi.fn();

        pulsocket.on('offline', mockOnOffline);
        pulsocket.on('close', mockOnClose);

        await pulsocket.connect();

        await waitForConnection();

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
        pulsocket = PulsoidSocket.create(TEST_TOKEN);
        const mockOnOffline = vi.fn();

        pulsocket.on('offline', mockOnOffline);

        await pulsocket.connect();

        await waitForConnection();

        expect(mockOnOffline).not.toHaveBeenCalled();

        pulsocket.disconnect();

        expect(mockOnOffline).not.toHaveBeenCalled();
      });
    });

    it('should be able to call all assigned hanndlers', async () => {
      openConnection();
      pulsocket = PulsoidSocket.create(TEST_TOKEN);
      const mockOnOpen1 = vi.fn();
      const mockOnOpen2 = vi.fn();
      const mockOnOpen3 = vi.fn();
      const mockOnClose1 = vi.fn();
      const mockOnClose2 = vi.fn();
      const mockOnMessage1 = vi.fn();
      const mockOnMessage2 = vi.fn();
      const mockOnError1 = vi.fn();
      const mockOnError2 = vi.fn();

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

      await pulsocket.connect();

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
      vi.useFakeTimers();
    });
    afterEach(() => {
      pulsocket?.disconnect();
      vi.runAllTimers();
      vi.useRealTimers();
    });

    it('should reconnect after 5 seconds', async () => {
      openConnection();
      pulsocket = PulsoidSocket.create(TEST_TOKEN, {
        reconnect: {
          enable: true,
          reconnectMinInterval: 5000,
          reconnectMaxInterval: 10000,
        },
      });
      const mockOnReconnect = vi.fn();

      pulsocket.on('reconnect', mockOnReconnect);

      await pulsocket.connect();
      vi.runAllTimers();
      await flushPromises();

      expect(pulsocket.isConnected()).toBe(true);

      webSocketServerMock.error();
      await webSocketServerMock.closed;
      await flushPromises();

      expect(pulsocket.isConnected()).toBe(false);

      openConnection();
      vi.advanceTimersByTime(5500);
      await flushPromises();
      vi.runAllTimers();
      await flushPromises();

      expect(mockOnReconnect).toHaveBeenCalled();
      expect(mockOnReconnect).toHaveBeenCalledTimes(1);

      expect(pulsocket.isConnected()).toBe(true);
    });

    it('should reconnect try to reconnect 100 times by default', async () => {
      openConnection();
      pulsocket = PulsoidSocket.create(TEST_TOKEN);
      const mockOnReconnect = vi.fn();

      pulsocket.on('reconnect', mockOnReconnect);

      await pulsocket.connect();
      vi.runAllTimers();
      await waitForConnection();

      expect(pulsocket.isConnected()).toBe(true);

      webSocketServerMock.error();
      await webSocketServerMock.closed;
      await flushPromises();

      for (let i = 0; i < 200; i++) {
        vi.runOnlyPendingTimers();
        await flushPromises();
      }

      expect(mockOnReconnect).toHaveBeenCalledTimes(100);

      expect(pulsocket.isConnected()).toBe(false);
    });

    it('should reconnect set amount of times', async () => {
      openConnection();
      const RECONNECT_ATTEMPTS = 5;
      pulsocket = PulsoidSocket.create(TEST_TOKEN, {
        reconnect: {reconnectAttempts: RECONNECT_ATTEMPTS},
      });

      const mockOnReconnect = vi.fn();
      pulsocket.on('reconnect', mockOnReconnect);

      await pulsocket.connect();
      vi.runAllTimers();
      await waitForConnection();

      expect(pulsocket.isConnected()).toBe(true);

      webSocketServerMock.error();
      await webSocketServerMock.closed;
      await flushPromises();

      for (let i = 0; i < RECONNECT_ATTEMPTS * 2; i++) {
        vi.runOnlyPendingTimers();
        await flushPromises();
      }

      expect(mockOnReconnect).toHaveBeenCalledTimes(RECONNECT_ATTEMPTS);

      expect(pulsocket.isConnected()).toBe(false);
    });

    it('should reconnect with progressive interval', async () => {
      openConnection();
      pulsocket = PulsoidSocket.create(TEST_TOKEN, {
        reconnect: {
          enable: true,
          reconnectMinInterval: 1000,
          reconnectMaxInterval: 10000,
        },
      });

      const mockOnReconnect = vi.fn();
      pulsocket.on('reconnect', mockOnReconnect);

      await pulsocket.connect();
      vi.runAllTimers();
      await waitForConnection();

      webSocketServerMock.error();
      await webSocketServerMock.closed;
      await flushPromises();

      expect(mockOnReconnect).toHaveBeenCalledTimes(0);

      vi.advanceTimersByTime(999);
      expect(mockOnReconnect).toHaveBeenCalledTimes(0);
      vi.advanceTimersByTime(1);
      expect(mockOnReconnect).toHaveBeenCalledTimes(1);
      await flushPromises();
      await flushPromises();

      vi.advanceTimersByTime(1999);
      expect(mockOnReconnect).toHaveBeenCalledTimes(1);
      vi.advanceTimersByTime(10);
      expect(mockOnReconnect).toHaveBeenCalledTimes(2);
      await flushPromises();
      await flushPromises();
      vi.advanceTimersByTime(3990);
      expect(mockOnReconnect).toHaveBeenCalledTimes(2);
      vi.advanceTimersByTime(100);
      expect(mockOnReconnect).toHaveBeenCalledTimes(3);
    });

    it('should reconnect reconnect second time', async () => {
      openConnection();
      pulsocket = PulsoidSocket.create(TEST_TOKEN, {
        reconnect: {
          enable: true,
          reconnectMinInterval: 1000,
          reconnectMaxInterval: 10000,
        },
      });

      const mockOnReconnect = vi.fn();
      pulsocket.on('reconnect', mockOnReconnect);

      await pulsocket.connect();
      vi.runAllTimers();
      await flushPromises();

      webSocketServerMock.error();
      await webSocketServerMock.closed;
      await flushPromises();

      expect(mockOnReconnect).toHaveBeenCalledTimes(0);

      vi.advanceTimersByTime(999);
      expect(mockOnReconnect).toHaveBeenCalledTimes(0);
      vi.advanceTimersByTime(1);
      expect(mockOnReconnect).toHaveBeenCalledTimes(1);
      await flushPromises();
      await flushPromises();

      vi.advanceTimersByTime(1999);
      expect(mockOnReconnect).toHaveBeenCalledTimes(1);
      vi.advanceTimersByTime(10);
      expect(mockOnReconnect).toHaveBeenCalledTimes(2);
      await flushPromises();
      await flushPromises();
      vi.advanceTimersByTime(3990);
      expect(mockOnReconnect).toHaveBeenCalledTimes(2);
      vi.advanceTimersByTime(100);
      expect(mockOnReconnect).toHaveBeenCalledTimes(3);
    });

    it('should not fire close events while reconnecting', async () => {
      openConnection();
      pulsocket = PulsoidSocket.create(TEST_TOKEN, {
        reconnect: {
          enable: true,
          reconnectMinInterval: 1000,
          reconnectMaxInterval: 10000,
        },
      });

      const mockOnReconnect = vi.fn();
      const mockOnClose = vi.fn();
      pulsocket.on('reconnect', mockOnReconnect);
      pulsocket.on('close', mockOnClose);

      await pulsocket.connect();
      vi.runAllTimers();
      await waitForConnection();

      webSocketServerMock.error();
      await webSocketServerMock.closed;
      await flushPromises();

      expect(mockOnReconnect).toHaveBeenCalledTimes(0);

      // Fire first reconnect
      vi.runOnlyPendingTimers();
      await flushPromises();
      vi.runOnlyPendingTimers();
      await flushPromises();

      expect(mockOnReconnect).toHaveBeenCalledTimes(1);
      expect(mockOnClose).toHaveBeenCalledTimes(1);

      // Fire second reconnect
      vi.runOnlyPendingTimers();
      await flushPromises();
      vi.runOnlyPendingTimers();
      await flushPromises();

      expect(mockOnReconnect).toHaveBeenCalledTimes(2);
      expect(mockOnClose).toHaveBeenCalledTimes(1);

      // Fire third reconnect
      vi.runOnlyPendingTimers();
      await flushPromises();
      vi.runOnlyPendingTimers();
      await flushPromises();

      expect(mockOnReconnect).toHaveBeenCalledTimes(3);
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should not reconnect if reconnect is disabled', async () => {
      openConnection();
      pulsocket = PulsoidSocket.create(TEST_TOKEN, {
        reconnect: {enable: false},
      });

      const mockOnReconnect = vi.fn();
      pulsocket.on('reconnect', mockOnReconnect);

      await pulsocket.connect();
      vi.runAllTimers();
      await waitForConnection();

      webSocketServerMock.error();
      await webSocketServerMock.closed;

      vi.runAllTimers();

      expect(mockOnReconnect).not.toHaveBeenCalled();
    });
  });

  describe('token validation', () => {
    it('should reject connect() with token error when token is not found', async () => {
      mockFetchError(7005, 'token_not_found');
      openConnection();
      pulsocket = PulsoidSocket.create(TEST_TOKEN);

      await expect(pulsocket.connect()).rejects.toEqual({
        code: 7005,
        message: 'token_not_found',
      });

      expect(pulsocket.isConnected()).toBe(false);
    });

    it('should reject connect() with token error when token is expired', async () => {
      mockFetchError(7006, 'token_expired');
      openConnection();
      pulsocket = PulsoidSocket.create(TEST_TOKEN);

      await expect(pulsocket.connect()).rejects.toEqual({
        code: 7006,
        message: 'token_expired',
      });

      expect(pulsocket.isConnected()).toBe(false);
    });

    it('should reject connect() with token error when premium is required', async () => {
      mockFetchError(7007, 'premium_required');
      openConnection();
      pulsocket = PulsoidSocket.create(TEST_TOKEN);

      await expect(pulsocket.connect()).rejects.toEqual({
        code: 7007,
        message: 'premium_required',
      });

      expect(pulsocket.isConnected()).toBe(false);
    });

    it('should not open WebSocket when token validation fails', async () => {
      mockFetchError(7005, 'token_not_found');
      openConnection();
      pulsocket = PulsoidSocket.create(TEST_TOKEN);
      const mockOnOpen = vi.fn();

      pulsocket.on('open', mockOnOpen);

      await pulsocket.connect().catch(() => {});

      expect(mockOnOpen).not.toHaveBeenCalled();
      expect(pulsocket.isConnected()).toBe(false);
    });

    it('should call fetch with correct authorization header', async () => {
      openConnection();
      pulsocket = PulsoidSocket.create(TEST_TOKEN);

      await pulsocket.connect();
      await waitForConnection();

      expect(global.fetch).toHaveBeenCalledWith(
        'https://dev.pulsoid.net/api/v1/token/validate',
        { headers: { Authorization: `Bearer ${TEST_TOKEN}` } }
      );
    });

    it('should reject connect() when token lacks data:heart_rate:read scope', async () => {
      mockFetchSuccess(['data:room:read']);
      openConnection();
      pulsocket = PulsoidSocket.create(TEST_TOKEN);

      await expect(pulsocket.connect()).rejects.toEqual({
        code: 7008,
        message: 'insufficient_scope',
      });

      expect(pulsocket.isConnected()).toBe(false);
    });
  });

  describe('token validation on reconnect (1006 close)', () => {
    it('should emit token-error and stop reconnecting when token becomes invalid', async () => {
      vi.useFakeTimers();
      openConnection();
      pulsocket = PulsoidSocket.create(TEST_TOKEN, {
        reconnect: { enable: true },
      });
      const mockTokenError = vi.fn();
      const mockOnReconnect = vi.fn();

      pulsocket.on('token-error', mockTokenError);
      pulsocket.on('reconnect', mockOnReconnect);

      await pulsocket.connect();
      vi.runAllTimers();
      await waitForConnection();

      // Token becomes invalid after initial connection
      mockFetchError(7006, 'token_expired');

      // Close with 1006 (abnormal closure — browser behavior for rejected upgrades)
      webSocketServerMock.close({ code: 1006, reason: '', wasClean: false });
      await flushPromises();

      vi.runOnlyPendingTimers();
      await flushPromises();

      expect(mockTokenError).toHaveBeenCalledWith({
        code: 7006,
        message: 'token_expired',
      });
      expect(mockOnReconnect).toHaveBeenCalledTimes(1);
      vi.useRealTimers();
    });

  });
});
