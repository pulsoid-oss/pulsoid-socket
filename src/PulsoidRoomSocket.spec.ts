import WS from 'jest-websocket-mock';
import PulsoidSocket from './index';
import { flushPromises, mockFetchSuccess, mockFetchError } from './test-utils';

const TEST_TOKEN = 'room-token';
const TEST_ROOM_ID = 'room-123';
let webSocketServerMock: WS;

const ALL_KINDS = 'heart_rate,room_member_updated,room_member_removed,room_updated';

const openConnection = (
  kinds = ALL_KINDS,
  options?: ConstructorParameters<typeof WS>[1]
) => {
  webSocketServerMock = new WS(
    `wss://dev.pulsoid.net/api/v2/data/rooms/${TEST_ROOM_ID}/real_time?access_token=${TEST_TOKEN}&kinds=${kinds}`,
    options
  );
};

const waitForConnection = async () => {
  await Promise.race([
    webSocketServerMock.connected,
    new Promise((r) => setTimeout(r, 20)),
  ]);
};

describe('PulsoidRoomSocket', () => {
  let roomSocket: ReturnType<typeof PulsoidSocket.createRoom>;

  beforeEach(() => {
    mockFetchSuccess(['data:room:read']);
  });

  afterEach(() => {
    roomSocket?.disconnect();
    webSocketServerMock?.close();
  });

  it('should create instance via PulsoidSocket.createRoom()', () => {
    openConnection();
    roomSocket = PulsoidSocket.createRoom(TEST_TOKEN, TEST_ROOM_ID);

    expect(roomSocket).toHaveProperty('on');
    expect(roomSocket).toHaveProperty('off');
    expect(roomSocket).toHaveProperty('connect');
    expect(roomSocket).toHaveProperty('disconnect');
    expect(roomSocket).toHaveProperty('isConnected');
  });

  it('should connect with correct URL including all default kinds', async () => {
    openConnection();
    roomSocket = PulsoidSocket.createRoom(TEST_TOKEN, TEST_ROOM_ID);

    await roomSocket.connect();
    await webSocketServerMock.connected;

    expect(roomSocket.isConnected()).toBe(true);
  });

  it('should connect with custom kinds filter', async () => {
    const kinds = 'heart_rate,room_updated';
    openConnection(kinds);
    roomSocket = PulsoidSocket.createRoom(TEST_TOKEN, TEST_ROOM_ID, {
      kinds: ['heart_rate', 'room_updated'],
    });

    await roomSocket.connect();
    await webSocketServerMock.connected;

    expect(roomSocket.isConnected()).toBe(true);
  });

  describe('token validation', () => {
    it('should reject connect() when token is invalid', async () => {
      mockFetchError(7005, 'token_not_found');
      openConnection();
      roomSocket = PulsoidSocket.createRoom(TEST_TOKEN, TEST_ROOM_ID);

      await expect(roomSocket.connect()).rejects.toEqual({
        code: 7005,
        message: 'token_not_found',
      });

      expect(roomSocket.isConnected()).toBe(false);
    });

    it('should call fetch with correct authorization header', async () => {
      openConnection();
      roomSocket = PulsoidSocket.createRoom(TEST_TOKEN, TEST_ROOM_ID);

      await roomSocket.connect();
      await waitForConnection();

      expect(global.fetch).toHaveBeenCalledWith(
        'https://dev.pulsoid.net/api/v1/token/validate',
        { headers: { Authorization: `Bearer ${TEST_TOKEN}` } }
      );
    });

    it('should reject connect() when token lacks data:room:read scope', async () => {
      mockFetchSuccess(['data:heart_rate:read']);
      openConnection();
      roomSocket = PulsoidSocket.createRoom(TEST_TOKEN, TEST_ROOM_ID);

      await expect(roomSocket.connect()).rejects.toEqual({
        code: 7008,
        message: 'insufficient_scope',
      });

      expect(roomSocket.isConnected()).toBe(false);
    });
  });

  describe('events', () => {
    describe('"heart-rate"', () => {
      it('should parse heart_rate messages and emit heart-rate event', async () => {
        openConnection();
        roomSocket = PulsoidSocket.createRoom(TEST_TOKEN, TEST_ROOM_ID);
        const mockHandler = vi.fn();

        roomSocket.on('heart-rate', mockHandler);

        await roomSocket.connect();
        await waitForConnection();

        webSocketServerMock.send(
          JSON.stringify({
            kind: 'heart_rate',
            timestamp: '2024-01-15T10:30:00Z',
            heart_rate: { profile_id: 'user-1', bpm: 85 },
          })
        );

        expect(mockHandler).toHaveBeenCalledTimes(1);
        expect(mockHandler).toHaveBeenCalledWith({
          profileId: 'user-1',
          bpm: 85,
          timestamp: '2024-01-15T10:30:00Z',
        });
      });
    });

    describe('"room-member-updated"', () => {
      it('should parse room_member_updated messages', async () => {
        openConnection();
        roomSocket = PulsoidSocket.createRoom(TEST_TOKEN, TEST_ROOM_ID);
        const mockHandler = vi.fn();

        roomSocket.on('room-member-updated', mockHandler);

        await roomSocket.connect();
        await waitForConnection();

        webSocketServerMock.send(
          JSON.stringify({
            kind: 'room_member_updated',
            timestamp: '2024-01-15T10:30:00Z',
            room_member_updated: {
              profile_id: 'user-2',
              config: { color: 'red' },
            },
          })
        );

        expect(mockHandler).toHaveBeenCalledTimes(1);
        expect(mockHandler).toHaveBeenCalledWith({
          profileId: 'user-2',
          config: { color: 'red' },
          timestamp: '2024-01-15T10:30:00Z',
        });
      });
    });

    describe('"room-member-removed"', () => {
      it('should parse room_member_removed messages', async () => {
        openConnection();
        roomSocket = PulsoidSocket.createRoom(TEST_TOKEN, TEST_ROOM_ID);
        const mockHandler = vi.fn();

        roomSocket.on('room-member-removed', mockHandler);

        await roomSocket.connect();
        await waitForConnection();

        webSocketServerMock.send(
          JSON.stringify({
            kind: 'room_member_removed',
            timestamp: '2024-01-15T10:31:00Z',
            room_member_removed: { profile_id: 'user-3' },
          })
        );

        expect(mockHandler).toHaveBeenCalledTimes(1);
        expect(mockHandler).toHaveBeenCalledWith({
          profileId: 'user-3',
          timestamp: '2024-01-15T10:31:00Z',
        });
      });
    });

    describe('"room-updated"', () => {
      it('should parse room_updated messages', async () => {
        openConnection();
        roomSocket = PulsoidSocket.createRoom(TEST_TOKEN, TEST_ROOM_ID);
        const mockHandler = vi.fn();

        roomSocket.on('room-updated', mockHandler);

        await roomSocket.connect();
        await waitForConnection();

        webSocketServerMock.send(
          JSON.stringify({
            kind: 'room_updated',
            timestamp: '2024-01-15T10:32:00Z',
            room_updated: { room_id: 'room-123', config: { name: 'My Room' } },
          })
        );

        expect(mockHandler).toHaveBeenCalledTimes(1);
        expect(mockHandler).toHaveBeenCalledWith({
          roomId: 'room-123',
          config: { name: 'My Room' },
          timestamp: '2024-01-15T10:32:00Z',
        });
      });
    });

    describe('"open" and "close"', () => {
      it('should emit open event on connection', async () => {
        openConnection();
        roomSocket = PulsoidSocket.createRoom(TEST_TOKEN, TEST_ROOM_ID);
        const mockOnOpen = vi.fn();

        roomSocket.on('open', mockOnOpen);

        await roomSocket.connect();
        await waitForConnection();

        expect(mockOnOpen).toHaveBeenCalledTimes(1);
      });

      it('should emit close event on disconnect', async () => {
        openConnection();
        roomSocket = PulsoidSocket.createRoom(TEST_TOKEN, TEST_ROOM_ID);
        const mockOnClose = vi.fn();

        roomSocket.on('close', mockOnClose);

        await roomSocket.connect();
        await waitForConnection();

        roomSocket.disconnect();
        await webSocketServerMock.closed;

        expect(mockOnClose).toHaveBeenCalledTimes(1);
      });
    });

    it('should log malformed JSON and not emit events', async () => {
      openConnection();
      roomSocket = PulsoidSocket.createRoom(TEST_TOKEN, TEST_ROOM_ID);
      const mockHandler = vi.fn();
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation();

      roomSocket.on('heart-rate', mockHandler);

      await roomSocket.connect();
      await waitForConnection();

      webSocketServerMock.send('not valid json{{{');

      expect(mockHandler).not.toHaveBeenCalled();
      expect(warnSpy).toHaveBeenCalledWith(
        '[PulsoidRoomSocket] Malformed message:',
        'not valid json{{{',
        expect.any(Error)
      );

      warnSpy.mockRestore();
    });

    it('should support off() to remove handlers', async () => {
      openConnection();
      roomSocket = PulsoidSocket.createRoom(TEST_TOKEN, TEST_ROOM_ID);
      const mockHandler = vi.fn();

      roomSocket.on('heart-rate', mockHandler);

      await roomSocket.connect();
      await waitForConnection();

      webSocketServerMock.send(
        JSON.stringify({
          kind: 'heart_rate',
          timestamp: '2024-01-15T10:30:00Z',
          heart_rate: { profile_id: 'user-1', bpm: 85 },
        })
      );

      expect(mockHandler).toHaveBeenCalledTimes(1);

      roomSocket.off('heart-rate', mockHandler);

      webSocketServerMock.send(
        JSON.stringify({
          kind: 'heart_rate',
          timestamp: '2024-01-15T10:30:01Z',
          heart_rate: { profile_id: 'user-1', bpm: 90 },
        })
      );

      expect(mockHandler).toHaveBeenCalledTimes(1);
    });
  });

  describe('reconnect flow', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });
    afterEach(() => {
      roomSocket?.disconnect();
      vi.runAllTimers();
      vi.useRealTimers();
    });

    it('should reconnect after configured interval', async () => {
      openConnection();
      roomSocket = PulsoidSocket.createRoom(TEST_TOKEN, TEST_ROOM_ID, {
        reconnect: {
          enable: true,
          reconnectMinInterval: 5000,
          reconnectMaxInterval: 10000,
        },
      });
      const mockOnReconnect = vi.fn();

      roomSocket.on('reconnect', mockOnReconnect);

      await roomSocket.connect();
      vi.runAllTimers();
      await flushPromises();

      expect(roomSocket.isConnected()).toBe(true);

      webSocketServerMock.error();
      await webSocketServerMock.closed;
      await flushPromises();

      expect(roomSocket.isConnected()).toBe(false);

      openConnection();
      vi.advanceTimersByTime(5500);
      await flushPromises();
      vi.runAllTimers();
      await flushPromises();

      expect(mockOnReconnect).toHaveBeenCalledTimes(1);
      expect(roomSocket.isConnected()).toBe(true);
    });

    it('should not reconnect if reconnect is disabled', async () => {
      openConnection();
      roomSocket = PulsoidSocket.createRoom(TEST_TOKEN, TEST_ROOM_ID, {
        reconnect: { enable: false },
      });

      const mockOnReconnect = vi.fn();
      roomSocket.on('reconnect', mockOnReconnect);

      await roomSocket.connect();
      vi.runAllTimers();
      await waitForConnection();

      webSocketServerMock.error();
      await webSocketServerMock.closed;

      vi.runAllTimers();

      expect(mockOnReconnect).not.toHaveBeenCalled();
    });
  });

  describe('token validation on reconnect (1006 close)', () => {
    it('should emit token-error when token becomes invalid', async () => {
      vi.useFakeTimers();
      openConnection();
      roomSocket = PulsoidSocket.createRoom(TEST_TOKEN, TEST_ROOM_ID, {
        reconnect: { enable: true },
      });
      const mockTokenError = vi.fn();
      const mockOnReconnect = vi.fn();

      roomSocket.on('token-error', mockTokenError);
      roomSocket.on('reconnect', mockOnReconnect);

      await roomSocket.connect();
      vi.runAllTimers();
      await waitForConnection();

      mockFetchError(7006, 'token_expired');

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
