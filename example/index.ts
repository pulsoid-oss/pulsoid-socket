import {PulsoidSocket} from '../src';

const PULSOID_TOKEN = 'YOUR_PULSOID_TOKEN';

const pulsocket = new PulsoidSocket(PULSOID_TOKEN);

pulsocket.on('open', (event: Event) => {
  console.log('Connected', event);

  const reconnectBtn = document.getElementById('reconnect');
  if (reconnectBtn) {
    document.body.removeChild(reconnectBtn);
  }

  const hbEl = document.createElement('div');
  hbEl.id = 'heart-rate';
  hbEl.style.fontSize = '100px';
  hbEl.innerHTML = '--';

  const disconnectBtn = document.createElement('button');
  disconnectBtn.id = 'disconnect';
  disconnectBtn.innerText = 'Disconnect';
  disconnectBtn.onclick = () => {
    pulsocket.disconnect();
  };

  document.body.append(hbEl);
  document.body.append(disconnectBtn);
});

pulsocket.on('message', (data) => {
  console.log('message', data);
  document.getElementById('heart-rate').innerHTML = String(data.heartRate);
});

pulsocket.on('error', (data) => {
  console.warn('error: ', data);
});

pulsocket.on('close', (data) => {
  console.log('close', data);

  document.body.removeChild(document.getElementById('heart-rate'));
  document.body.removeChild(document.getElementById('disconnect'));

  const reconnectBtn = document.createElement('button');
  reconnectBtn.id = 'reconnect';
  reconnectBtn.innerText = 'Reconnect';
  reconnectBtn.onclick = () => {
    pulsocket.connect();
  };

  document.body.appendChild(reconnectBtn);
});

pulsocket.connect();
