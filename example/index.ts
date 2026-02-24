import { PulsoidSocket, PulsoidRoomSocket } from '../src';

let socket: PulsoidSocket | PulsoidRoomSocket | null = null;

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

const tokenInput = $<HTMLInputElement>('token-input');
const roomInput = $<HTMLInputElement>('room-input');
const connectBtn = $<HTMLButtonElement>('connect-btn');
const disconnectBtn = $<HTMLButtonElement>('disconnect-btn');
const dashboard = $('dashboard');
const statusRow = $('status-row');
const bpmValue = $('bpm-value');
const bpmRing = $('bpm-ring');
const logList = $('log-list');
const logEmpty = $('log-empty');

function formatTime(): string {
  return new Date().toLocaleTimeString('en-US', {
    hour12: false,
    fractionalSecondDigits: 3,
  } as Intl.DateTimeFormatOptions);
}

function addLogEntry(event: string, data?: unknown) {
  logEmpty.style.display = 'none';
  const entry = document.createElement('div');
  entry.className = 'log-entry';
  const dataStr =
    data !== undefined
      ? typeof data === 'object'
        ? JSON.stringify(data)
        : String(data)
      : '';
  entry.innerHTML =
    `<span class="log-time">${formatTime()}</span>` +
    `<span class="log-tag ${event}">${event}</span>` +
    `<span class="log-data">${dataStr}</span>`;
  logList.prepend(entry);
}

function renderStatus(
  items: { label: string; value: string; dot?: string }[],
) {
  statusRow.innerHTML = items
    .map(
      (item) =>
        `<div class="status-item" data-label="${item.label}">` +
        `<div class="s-label">${item.label}</div>` +
        `<div class="s-value">${item.dot ? `<span class="dot dot-${item.dot}"></span>` : ''}${item.value}</div>` +
        `</div>`,
    )
    .join('');
}

function updateStatus(
  overrides: Record<string, { value: string; dot?: string }>,
) {
  for (const [label, { value, dot }] of Object.entries(overrides)) {
    const item = statusRow.querySelector(
      `[data-label="${label}"]`,
    ) as HTMLElement | null;
    if (!item) continue;
    const valEl = item.querySelector('.s-value');
    if (valEl) {
      valEl.innerHTML = `${dot ? `<span class="dot dot-${dot}"></span>` : ''}${value}`;
    }
  }
}

function triggerPulse() {
  bpmRing.classList.remove('animate');
  void bpmRing.offsetWidth;
  bpmRing.classList.add('animate');
}

function setupStandardSocket(token: string) {
  const ps = PulsoidSocket.create(token);
  socket = ps;

  renderStatus([
    { label: 'Mode', value: '<span class="mode-tag standard">Standard</span>' },
    { label: 'Connection', value: 'Connecting', dot: 'warning' },
    { label: 'Sensor', value: '--', dot: 'neutral' },
    { label: 'Reconnects', value: '0' },
  ]);

  ps.on('open', (event) => {
    addLogEntry('open', { type: event.type });
    updateStatus({ Connection: { value: 'Connected', dot: 'success' } });
  });

  ps.on('heart-rate', (data) => {
    addLogEntry('heart-rate', data);
    bpmValue.textContent = String(data.heartRate);
    bpmValue.classList.add('live');
    triggerPulse();
  });

  ps.on('online', () => {
    addLogEntry('online');
    updateStatus({ Sensor: { value: 'Online', dot: 'success' } });
  });

  ps.on('offline', () => {
    addLogEntry('offline');
    updateStatus({ Sensor: { value: 'Offline', dot: 'warning' } });
  });

  ps.on('error', (event) => {
    addLogEntry('error', { type: event.type });
  });

  ps.on('close', (event) => {
    addLogEntry('close', { code: event.code, reason: event.reason });
    updateStatus({
      Connection: { value: 'Disconnected', dot: 'failed' },
      Sensor: { value: '--', dot: 'neutral' },
    });
    bpmValue.textContent = '--';
    bpmValue.classList.remove('live');
  });

  ps.on('reconnect', (e) => {
    addLogEntry('reconnect', e);
    updateStatus({
      Connection: { value: `Reconnecting #${e.attempt}`, dot: 'warning' },
      Reconnects: { value: String(e.attempt) },
    });
  });

  ps.on('token-error', (e) => {
    addLogEntry('token-error', e);
    updateStatus({ Connection: { value: 'Token Error', dot: 'failed' } });
  });

  ps.connect().catch((err) => {
    addLogEntry('token-error', err);
    updateStatus({ Connection: { value: 'Token Error', dot: 'failed' } });
  });
}

function setupRoomSocket(token: string, roomId: string) {
  const rs = PulsoidRoomSocket.create(token, roomId);
  socket = rs;

  renderStatus([
    { label: 'Mode', value: `<span class="mode-tag room">Room</span>` },
    { label: 'Room', value: roomId },
    { label: 'Connection', value: 'Connecting', dot: 'warning' },
    { label: 'Reconnects', value: '0' },
  ]);

  rs.on('open', (event) => {
    addLogEntry('open', { type: event.type });
    updateStatus({ Connection: { value: 'Connected', dot: 'success' } });
  });

  rs.on('heart-rate', (data) => {
    addLogEntry('heart-rate', data);
    bpmValue.textContent = String(data.bpm);
    bpmValue.classList.add('live');
    triggerPulse();
  });

  rs.on('room-member-updated', (data) => {
    addLogEntry('room-member-updated', data);
  });

  rs.on('room-member-removed', (data) => {
    addLogEntry('room-member-removed', data);
  });

  rs.on('room-updated', (data) => {
    addLogEntry('room-updated', data);
  });

  rs.on('error', (event) => {
    addLogEntry('error', { type: event.type });
  });

  rs.on('close', (event) => {
    addLogEntry('close', { code: event.code, reason: event.reason });
    updateStatus({ Connection: { value: 'Disconnected', dot: 'failed' } });
    bpmValue.textContent = '--';
    bpmValue.classList.remove('live');
  });

  rs.on('reconnect', (e) => {
    addLogEntry('reconnect', e);
    updateStatus({
      Connection: { value: `Reconnecting #${e.attempt}`, dot: 'warning' },
      Reconnects: { value: String(e.attempt) },
    });
  });

  rs.on('token-error', (e) => {
    addLogEntry('token-error', e);
    updateStatus({ Connection: { value: 'Token Error', dot: 'failed' } });
  });

  rs.connect().catch((err) => {
    addLogEntry('token-error', err);
    updateStatus({ Connection: { value: 'Token Error', dot: 'failed' } });
  });
}

connectBtn.addEventListener('click', () => {
  const token = tokenInput.value.trim();
  if (!token) {
    tokenInput.focus();
    return;
  }

  const roomId = roomInput.value.trim();

  logList.innerHTML = '';
  logList.appendChild(logEmpty);
  logEmpty.style.display = 'block';
  bpmValue.textContent = '--';
  bpmValue.classList.remove('live');

  dashboard.classList.add('active');
  connectBtn.style.display = 'none';
  disconnectBtn.style.display = 'inline-block';
  tokenInput.disabled = true;
  roomInput.disabled = true;

  if (roomId) {
    setupRoomSocket(token, roomId);
  } else {
    setupStandardSocket(token);
  }
});

disconnectBtn.addEventListener('click', () => {
  socket?.disconnect();
  socket = null;

  connectBtn.style.display = 'inline-block';
  disconnectBtn.style.display = 'none';
  tokenInput.disabled = false;
  roomInput.disabled = false;
});
