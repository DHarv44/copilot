const logEl = document.getElementById('log');
const pauseBtn = document.getElementById('pause');
const clearBtn = document.getElementById('clear');
const filterInput = document.getElementById('filter');

let paused = false;
let filter = '';
let messages = [];

pauseBtn.addEventListener('click', () => {
  paused = !paused;
  pauseBtn.textContent = paused ? 'Resume' : 'Pause';
  pauseBtn.style.background = paused ? '#d16969' : '#3e3e42';
});

clearBtn.addEventListener('click', () => {
  messages = [];
  logEl.innerHTML = '';
});

filterInput.addEventListener('input', (e) => {
  filter = e.target.value.toLowerCase();
  render();
});

function formatTime(ts) {
  const d = new Date(ts);
  return d.toTimeString().split(' ')[0] + '.' + d.getMilliseconds().toString().padStart(3, '0');
}

function addMessage(msg) {
  messages.push(msg);
  if (messages.length > 5000) messages.shift();
  if (!paused) render();
}

function render() {
  const filtered = messages.filter((m) => {
    if (!filter) return true;
    const text = JSON.stringify(m).toLowerCase();
    return text.includes(filter);
  });

  logEl.innerHTML = filtered.map((m) => {
    const typeClass = `msg-${m.type || 'default'}`;
    const time = formatTime(m.ts);
    const seq = `#${m.seq}`;
    const body = JSON.stringify(m, null, 2);
    return `<div class="msg ${typeClass}">
      <span class="msg-time">${time}</span>
      <span class="msg-seq">${seq}</span>
      <span>${body}</span>
    </div>`;
  }).join('');

  // Auto-scroll to bottom
  logEl.scrollTop = logEl.scrollHeight;
}

if (window.api) {
  window.api.onHistory((history) => {
    history.forEach(addMessage);
  });

  window.api.onBus((msg) => {
    addMessage(msg);
  });
} else {
  logEl.innerHTML = '<div class="msg">Preload not available</div>';
}
