// ── Kit Day — app.js ──────────────────────────────────────────────

// ── Storage helpers ─────────────────────────────────────────────
function getStorage() {
  const defaults = {
    streak: 0,
    lastTraining: null,
    lastSkipped: null,
    lastAction: null,
    notifHour: 7,
    shirts: [],
    // legacy compat
    activeTeams: []
  };
  try {
    const saved = JSON.parse(localStorage.getItem('kitday') || '{}');
    return { ...defaults, ...saved };
  } catch { return defaults; }
}

function saveStorage(data) {
  localStorage.setItem('kitday', JSON.stringify(data));
}

// ── Date helpers ────────────────────────────────────────────────
function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

// Deterministic daily pick from collection based on date seed
function getDailyShirt(shirts) {
  if (!shirts || !shirts.length) return null;
  const d = new Date();
  const seed = d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
  return shirts[seed % shirts.length];
}

// ── Streak logic ─────────────────────────────────────────────────
function updateStreakOnTrain(storage) {
  const today = todayKey();
  const d = new Date();
  const yesterday = new Date(d);
  yesterday.setDate(d.getDate() - 1);
  const yKey = `${yesterday.getFullYear()}-${yesterday.getMonth()}-${yesterday.getDate()}`;

  if (storage.lastTraining === today) return storage;

  if (storage.lastTraining === yKey) {
    storage.streak = (storage.streak || 0) + 1;
  } else {
    storage.streak = 1;
  }
  storage.lastTraining = today;
  storage.lastAction = 'trained';
  return storage;
}

// ── Service Worker ───────────────────────────────────────────────
async function registerSW() {
  if (!('serviceWorker' in navigator)) return;
  try {
    const reg = await navigator.serviceWorker.register('/kit-day/sw.js');
    console.log('SW registered:', reg.scope);
    return reg;
  } catch (e) {
    console.warn('SW registration failed:', e);
  }
}

// ── Notification scheduling ──────────────────────────────────────
async function scheduleNotification(shirt, hourOfDay) {
  if (!('Notification' in window)) return;
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return;

  const now = new Date();
  const target = new Date();
  target.setHours(hourOfDay, 0, 0, 0);
  if (target <= now) target.setDate(target.getDate() + 1);

  const delayMs = target.getTime() - now.getTime();
  const title = 'Kit Day';
  const body = shirt
    ? `Hora do treino! Hoje você veste: ${shirt.name}. Bora!`
    : 'Hora do treino! Abra o Kit Day.';

  const reg = await navigator.serviceWorker.ready;
  reg.active.postMessage({ type: 'SCHEDULE_NOTIFICATION', delayMs, title, body });
}

// ── UI rendering (index.html) ────────────────────────────────────
function render() {
  const storage = getStorage();
  const today = todayKey();
  const shirt = getDailyShirt(storage.shirts);
  const trained = storage.lastTraining === today;
  const skipped = storage.lastSkipped === today;

  // Streak counter
  const streakEl = document.getElementById('streak-count');
  if (streakEl) streakEl.textContent = storage.streak || 0;

  const onboardEl = document.getElementById('onboarding');
  const kitCardEl = document.getElementById('kit-card');

  if (!storage.shirts || storage.shirts.length === 0) {
    // Show onboarding
    if (onboardEl) onboardEl.style.display = 'flex';
    if (kitCardEl) kitCardEl.style.display = 'none';
    const actionsEl = document.getElementById('actions');
    if (actionsEl) actionsEl.style.display = 'none';
    return;
  }

  if (onboardEl) onboardEl.style.display = 'none';
  if (kitCardEl) kitCardEl.style.display = 'flex';

  // Update card accent color
  const accentColor = shirt.color || '#E10600';
  document.documentElement.style.setProperty('--shirt-color', accentColor);

  // Shirt photo or color swatch
  const shirtImgEl = document.getElementById('shirt-img');
  const shirtSwatchEl = document.getElementById('shirt-swatch');
  if (shirtImgEl && shirtSwatchEl) {
    if (shirt.photo) {
      shirtImgEl.src = shirt.photo;
      shirtImgEl.style.display = 'block';
      shirtSwatchEl.style.display = 'none';
    } else {
      shirtImgEl.style.display = 'none';
      shirtSwatchEl.style.display = 'flex';
      shirtSwatchEl.style.background = accentColor;
    }
  }

  // Name
  const nameEl = document.getElementById('shirt-name');
  if (nameEl) nameEl.textContent = shirt.name;

  // Card accent border
  if (kitCardEl) {
    kitCardEl.style.borderColor = accentColor;
    kitCardEl.style.boxShadow = `0 2px 24px ${accentColor}33`;
  }

  // Actions / status
  const actionsEl = document.getElementById('actions');
  const statusEl = document.getElementById('status-msg');

  if (trained) {
    if (actionsEl) actionsEl.style.display = 'none';
    if (statusEl) {
      statusEl.style.display = 'block';
      statusEl.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
        <span>Treino registrado! <strong>${storage.streak} dia${storage.streak !== 1 ? 's' : ''} seguido${storage.streak !== 1 ? 's' : ''}!</strong></span>`;
    }
  } else if (skipped) {
    if (actionsEl) actionsEl.style.display = 'none';
    if (statusEl) {
      statusEl.style.display = 'flex';
      statusEl.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"/><line x1="19" y1="3" x2="19" y2="21"/></svg>
        <span>Você pulou hoje. Amanhã tem mais!</span>`;
    }
  } else {
    if (actionsEl) actionsEl.style.display = 'flex';
    if (statusEl) statusEl.style.display = 'none';
  }
}

function onTrained() {
  let storage = getStorage();
  storage = updateStreakOnTrain(storage);
  saveStorage(storage);
  render();
  if (navigator.vibrate) navigator.vibrate([50, 30, 50]);
}

function onSkip() {
  let storage = getStorage();
  storage.lastSkipped = todayKey();
  storage.lastAction = 'skipped';
  saveStorage(storage);
  render();
}

async function init() {
  render();

  const btnTrain = document.getElementById('btn-train');
  const btnSkip = document.getElementById('btn-skip');
  if (btnTrain) btnTrain.addEventListener('click', onTrained);
  if (btnSkip) btnSkip.addEventListener('click', onSkip);

  await registerSW();

  if (Notification.permission === 'granted') {
    const storage = getStorage();
    const shirt = getDailyShirt(storage.shirts);
    scheduleNotification(shirt, storage.notifHour);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
