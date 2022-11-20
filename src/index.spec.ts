import WS from 'jest-websocket-mock';
import {PulsoidSocket} from './index';

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

afterEach(() => {
  webSocketServerMock?.close();
});

describe('Pusloid Socket', () => {
  it('should have public methods', () => {
    openConnection();
    const pulsocket = new PulsoidSocket(TEST_TOKEN);

    expect(pulsocket).toHaveProperty('on');
    expect(pulsocket).toHaveProperty('off');
    expect(pulsocket).toHaveProperty('connect');
    expect(pulsocket).toHaveProperty('disconnect');
    expect(pulsocket).toHaveProperty('isConnected');
  });

  it('should connect to WS server', async () => {
    openConnection();
    const pulsocket = new PulsoidSocket(TEST_TOKEN);

    expect(pulsocket.isConnected()).toBe(false);

    pulsocket.connect();

    await webSocketServerMock.connected;

    expect(pulsocket.isConnected()).toBe(true);
  });

  describe('events', () => {
    describe('"open"', () => {
      it('should call on("open") handler after connecting webSocket', async () => {
        openConnection();
        const pulsocket = new PulsoidSocket(TEST_TOKEN);
        const mockOnOpen = jest.fn();

        pulsocket.on('open', mockOnOpen);

        pulsocket.connect();
        await waitForConnection();

        expect(mockOnOpen).toHaveBeenCalled();
        expect(mockOnOpen).toHaveBeenCalledTimes(1);
      });

      it('should not call on("open") if webSocket was not connected (rejected by server)', async () => {
        openConnection({verifyClient: () => false});
        const pulsocket = new PulsoidSocket(TEST_TOKEN);
        const mockOnOpen = jest.fn();

        pulsocket.on('open', mockOnOpen);

        pulsocket.connect();
        await waitForConnection();

        expect(mockOnOpen).not.toHaveBeenCalled();
      });

      it('should not call on("open") after off("open")', async () => {
        openConnection();
        const pulsocket = new PulsoidSocket(TEST_TOKEN);
        const mockOnOpen = jest.fn();

        pulsocket.on('open', mockOnOpen);
        pulsocket.off('open', mockOnOpen);

        pulsocket.connect();
        await waitForConnection();

        expect(mockOnOpen).not.toHaveBeenCalled();
      });

      it('should not call on("open") after off("open") without arguments', async () => {
        openConnection();
        const pulsocket = new PulsoidSocket(TEST_TOKEN);
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
        const pulsocket = new PulsoidSocket(TEST_TOKEN);
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

    describe('"message"', () => {
      it('should call onmessage handler after receiving message from webSocket', async () => {
        openConnection();
        const pulsocket = new PulsoidSocket(TEST_TOKEN);
        const mockOnMessage = jest.fn();

        pulsocket.on('message', mockOnMessage);

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
        const pulsocket = new PulsoidSocket(TEST_TOKEN);
        const mockOnMessage = jest.fn();

        pulsocket.on('message', mockOnMessage);

        pulsocket.connect();
        await waitForConnection();

        expect(mockOnMessage).not.toHaveBeenCalled();

        webSocketServerMock.send(
          JSON.stringify({data: {heart_rate: 60}, measured_at: 1609459200000})
        );

        expect(mockOnMessage).toHaveBeenCalled();
        expect(mockOnMessage).toHaveBeenCalledTimes(1);

        pulsocket.off('message', mockOnMessage);

        webSocketServerMock.send(
          JSON.stringify({data: {heart_rate: 76}, measured_at: 1609459201000})
        );
        expect(mockOnMessage).toHaveBeenCalledTimes(1);
      });
    });

    describe('"error"', () => {
      it('should call onerror handler after receiving error from webSocket', async () => {
        openConnection();
        const pulsocket = new PulsoidSocket(TEST_TOKEN);
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
        const pulsocket = new PulsoidSocket(TEST_TOKEN);
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

    it('should be able to call all assigned hanndlers', async () => {
      openConnection();
      const pulsocket = new PulsoidSocket(TEST_TOKEN);
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
      pulsocket.on('message', mockOnMessage1);
      pulsocket.on('message', mockOnMessage2);
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
});
