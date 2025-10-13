const statusEl = document.getElementById('status');
const acEl = document.getElementById('aircraft');

statusEl.textContent = 'Waiting for sim…';

// Add IAS/ALT rows
const iasEl = document.createElement('div');
const altEl = document.createElement('div');
iasEl.className = 'row'; altEl.className = 'row';
iasEl.innerHTML = '<span>IAS:</span> <strong id="ias">—</strong>';
altEl.innerHTML = '<span>ALT:</span> <strong id="alt">—</strong>';
document.getElementById('app').append(iasEl, altEl);
const iasVal = document.getElementById('ias');
const altVal = document.getElementById('alt');

if (window.api) {
  // Handle history (on load)
  window.api.onHistory((history) => {
    history.forEach(processMsg);
  });

  // Handle live messages
  window.api.onBus(processMsg);

  function processMsg(msg) {
    if (!msg || typeof msg !== 'object') return;
    if (msg.type === 'status') {
      statusEl.textContent = msg.connected ? 'Connected' : 'Disconnected';
      statusEl.style.color = msg.connected ? '#2ecc71' : '#e67e22';
    }
    if (msg.type === 'aircraft') {
      acEl.textContent = msg.title || '—';
    }
    if (msg.type === 'sample') {
      if (typeof msg.ias === 'number') iasVal.textContent = msg.ias.toFixed(1) + ' kt';
      if (typeof msg.alt === 'number') altVal.textContent = Math.round(msg.alt).toLocaleString() + ' ft';
    }
  }
} else {
  statusEl.textContent = 'Preload not available';
  statusEl.style.color = '#e74c3c';
}
