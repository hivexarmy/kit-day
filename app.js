// ── Kit Day — app.js ──────────────────────────────────────────────

const TEAMS = [
  {
    id: 'barcelona',
    name: 'Barcelona',
    colors: ['#A50044', '#004D98'],
    phrase: 'Més que un club — mais que uma desculpa. Bora treinar!',
    shield: `<svg viewBox="0 0 80 90" xmlns="http://www.w3.org/2000/svg">
      <path d="M40,5 L75,20 L75,55 Q75,80 40,88 Q5,80 5,55 L5,20 Z" fill="#A50044" stroke="#FFD700" stroke-width="2"/>
      <rect x="5" y="20" width="33" height="35" fill="#004D98"/>
      <rect x="5" y="20" width="33" height="12" fill="#A50044"/>
      <rect x="5" y="20" width="12" height="35" fill="#A50044"/>
      <text x="58" y="58" font-size="18" fill="#FFD700" font-weight="bold" text-anchor="middle">FCB</text>
    </svg>`
  },
  {
    id: 'chelsea',
    name: 'Chelsea',
    colors: ['#034694', '#034694'],
    phrase: 'Keep the Blue Flag flying — e os músculos também.',
    shield: `<svg viewBox="0 0 80 90" xmlns="http://www.w3.org/2000/svg">
      <path d="M40,5 L75,20 L75,55 Q75,80 40,88 Q5,80 5,55 L5,20 Z" fill="#034694" stroke="#FFD700" stroke-width="2"/>
      <circle cx="40" cy="48" r="18" fill="#FFD700" opacity="0.9"/>
      <circle cx="40" cy="48" r="13" fill="#034694"/>
      <text x="40" y="53" font-size="11" fill="#FFD700" font-weight="bold" text-anchor="middle">CFC</text>
    </svg>`
  },
  {
    id: 'saopaulo',
    name: 'São Paulo FC',
    colors: ['#E30613', '#000000'],
    phrase: 'Tricolor do povo, camisa de guerreiro. Vai com tudo!',
    shield: `<svg viewBox="0 0 80 90" xmlns="http://www.w3.org/2000/svg">
      <path d="M40,5 L75,20 L75,55 Q75,80 40,88 Q5,80 5,55 L5,20 Z" fill="white" stroke="#E30613" stroke-width="2"/>
      <rect x="5" y="20" width="70" height="12" fill="#E30613"/>
      <rect x="5" y="32" width="70" height="12" fill="#000000"/>
      <rect x="5" y="44" width="70" height="11" fill="#E30613"/>
      <text x="40" y="72" font-size="9" fill="#000" font-weight="bold" text-anchor="middle">SPFC</text>
    </svg>`
  },
  {
    id: 'bayern',
    name: 'Bayern de Munique',
    colors: ['#DC052D', '#0066B2'],
    phrase: 'Mia san mia — e hoje somos atletas. Sem frescura!',
    shield: `<svg viewBox="0 0 80 90" xmlns="http://www.w3.org/2000/svg">
      <path d="M40,5 L75,20 L75,55 Q75,80 40,88 Q5,80 5,55 L5,20 Z" fill="#DC052D" stroke="#0066B2" stroke-width="2"/>
      <rect x="22" y="18" width="14" height="14" fill="#0066B2"/>
      <rect x="36" y="18" width="14" height="14" fill="white"/>
      <rect x="22" y="32" width="14" height="14" fill="white"/>
      <rect x="36" y="32" width="14" height="14" fill="#0066B2"/>
      <rect x="22" y="46" width="14" height="14" fill="#0066B2"/>
      <rect x="36" y="46" width="14" height="14" fill="white"/>
      <rect x="22" y="60" width="14" height="14" fill="white"/>
      <rect x="36" y="60" width="14" height="14" fill="#0066B2"/>
    </svg>`
  }
];

// ── Storage helpers ─────────────────────────────────────────────
function getStorage() {
  const defaults = {
    streak: 0,
    lastTraining: null,
    lastAction: null, // 'trained' | 'skipped' | null
    notifHour: 7,
    activeTeams: ['barcelona', 'chelsea', 'saopaulo', 'bayern']
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

function getDailyTeam(activeTeams) {
  const d = new Date();
  const seed = d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
  const pool = TEAMS.filter(t => activeTeams.includes(t.id));
  if (!pool.length) return TEAMS[0];
  return pool[seed % pool.length];
}

// ── Streak logic ─────────────────────────────────────────────────
function updateStreakOnTrain(storage) {
  const today = todayKey();
  const d = new Date();
  const yesterday = new Date(d);
  yesterday.setDate(d.getDate() - 1);
  const yesterdayKey = `${yesterday.getFullYear()}-${yesterday.getMonth()}-${yesterday.getDate()}`;

  if (storage.lastTraining === today) return storage; // already trained today

  if (storage.lastTraining === yesterdayKey) {
    storage.streak = (storage.streak || 0) + 1;
  } else {
    storage.streak = 1; // reset streak
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
async function scheduleNotification(team, hourOfDay) {
  if (!('Notification' in window)) return;
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return;

  const now = new Date();
  const target = new Date();
  target.setHours(hourOfDay, 0, 0, 0);
  if (target <= now) target.setDate(target.getDate() + 1);

  const delayMs = target.getTime() - now.getTime();
  const title = 'Kit Day 🏋️';
  const body = `Hora do treino! Hoje você veste: ${team.name}. Não fura!`;

  const reg = await navigator.serviceWorker.ready;
  reg.active.postMessage({ type: 'SCHEDULE_NOTIFICATION', delayMs, title, body });
}

// ── UI rendering ─────────────────────────────────────────────────
function render() {
  const storage = getStorage();
  const today = todayKey();
  const team = getDailyTeam(storage.activeTeams);
  const alreadyActed = storage.lastAction && (storage.lastTraining === today || storage.lastAction === 'skipped' && storage.lastSkipped === today);
  const trained = storage.lastTraining === today;
  const skipped = storage.lastSkipped === today;

  // Update theme color
  document.documentElement.style.setProperty('--team-primary', team.colors[0]);
  document.documentElement.style.setProperty('--team-secondary', team.colors[1] || team.colors[0]);

  // Shield
  const shieldEl = document.getElementById('team-shield');
  if (shieldEl) shieldEl.innerHTML = team.shield;

  // Team name & phrase
  const nameEl = document.getElementById('team-name');
  if (nameEl) nameEl.textContent = team.name;

  const phraseEl = document.getElementById('team-phrase');
  if (phraseEl) phraseEl.textContent = team.phrase;

  // Streak
  const streakEl = document.getElementById('streak-count');
  if (streakEl) streakEl.textContent = storage.streak || 0;

  // Card background
  const card = document.getElementById('kit-card');
  if (card) {
    card.style.background = `linear-gradient(135deg, ${team.colors[0]} 0%, ${team.colors[1] || team.colors[0]} 100%)`;
  }

  // Action buttons / status
  const actionsEl = document.getElementById('actions');
  const statusEl = document.getElementById('status-msg');

  if (trained) {
    if (actionsEl) actionsEl.style.display = 'none';
    if (statusEl) {
      statusEl.style.display = 'block';
      statusEl.innerHTML = `✅ Treino registrado! <strong>${storage.streak} dia${storage.streak > 1 ? 's' : ''} seguido${storage.streak > 1 ? 's' : ''}!</strong> 🔥`;
    }
  } else if (skipped) {
    if (actionsEl) actionsEl.style.display = 'none';
    if (statusEl) {
      statusEl.style.display = 'block';
      statusEl.innerHTML = `⏭️ Você pulou hoje. Amanhã tem mais!`;
    }
  } else {
    if (actionsEl) actionsEl.style.display = 'flex';
    if (statusEl) statusEl.style.display = 'none';
  }
}

// ── Button handlers ──────────────────────────────────────────────
function onTrained() {
  let storage = getStorage();
  storage = updateStreakOnTrain(storage);
  saveStorage(storage);
  render();
  // Haptic feedback
  if (navigator.vibrate) navigator.vibrate([50, 30, 50]);
}

function onSkip() {
  let storage = getStorage();
  storage.lastSkipped = todayKey();
  storage.lastAction = 'skipped';
  saveStorage(storage);
  render();
}

// ── Init ─────────────────────────────────────────────────────────
async function init() {
  render();

  const btnTrain = document.getElementById('btn-train');
  const btnSkip = document.getElementById('btn-skip');
  if (btnTrain) btnTrain.addEventListener('click', onTrained);
  if (btnSkip) btnSkip.addEventListener('click', onSkip);

  await registerSW();

  // Schedule notification if permission already granted
  if (Notification.permission === 'granted') {
    const storage = getStorage();
    const team = getDailyTeam(storage.activeTeams);
    scheduleNotification(team, storage.notifHour);
  }
}

document.addEventListener('DOMContentLoaded', init);
