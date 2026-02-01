let running = false, paused = false, secs = 0, interval = null;
let label = 'focus', labelColor = 'var(--text-soft)';
let viewMonth = new Date().getMonth(), viewYear = new Date().getFullYear();
let currentUser = null;
let sessionData = {};
let myLatestInviteCode = null;
let musicProvider = 'spotify';
let friendsRefreshInterval = null;

const months = ['january','february','march','april','may','june','july','august','september','october','november','december'];
const days = ['sun','mon','tue','wed','thu','fri','sat'];

const musicProviders = {
  spotify: {
    name: 'spotify',
    icon: '<svg fill="#1DB954" viewBox="0 0 24 24"><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/></svg>',
    url: 'https://open.spotify.com/search/study%20music'
  },
  apple: {
    name: 'apple music',
    icon: '<svg fill="#FA243C" viewBox="0 0 24 24"><path d="M23.994 6.124a9.23 9.23 0 0 0-.24-2.19c-.317-1.31-1.062-2.31-2.18-3.043a5.022 5.022 0 0 0-1.877-.726 10.496 10.496 0 0 0-1.564-.15c-.04-.003-.083-.01-.124-.013H5.986c-.152.01-.303.017-.455.026-.747.043-1.49.123-2.193.4-1.336.53-2.3 1.452-2.865 2.78-.192.448-.292.925-.363 1.408a10.61 10.61 0 0 0-.1 1.18c0 .032-.007.062-.01.093v12.223c.01.14.017.283.027.424.05.815.154 1.624.497 2.373.65 1.42 1.738 2.353 3.234 2.801.42.127.856.187 1.293.228.555.053 1.11.06 1.667.06h11.03a12.5 12.5 0 0 0 1.57-.1c.822-.106 1.596-.35 2.296-.81a5.046 5.046 0 0 0 1.88-2.207c.186-.42.293-.87.37-1.324.113-.664.138-1.332.152-2.001.003-.199.007-.398.007-.598v-11.86c0-.05-.007-.1-.01-.148z"/></svg>',
    url: 'https://music.apple.com/us/browse'
  },
  youtube: {
    name: 'youtube music',
    icon: '<svg fill="#FF0000" viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>',
    url: 'https://music.youtube.com'
  },
  soundcloud: {
    name: 'soundcloud',
    icon: '<svg fill="#FF5500" viewBox="0 0 24 24"><path d="M1.175 12.225c-.051 0-.094.046-.101.1l-.233 2.154.233 2.105c.007.058.05.098.101.098.05 0 .09-.04.099-.098l.255-2.105-.27-2.154c0-.057-.045-.1-.09-.1m-.899.828c-.06 0-.091.037-.105.094l-.195 1.326.195 1.294c.014.054.045.094.105.094.045 0 .09-.04.09-.094l.226-1.294-.226-1.326c0-.057-.045-.094-.09-.094m1.83-.578c-.08 0-.135.06-.15.12l-.21 1.734.225 1.694c0 .06.06.12.135.12.074 0 .135-.06.148-.12l.27-1.694-.27-1.734c-.015-.06-.074-.12-.149-.12m.945-.615c-.09 0-.15.068-.165.143l-.195 2.31.195 2.24c.015.074.075.142.165.142.075 0 .15-.068.15-.143l.225-2.24-.225-2.31c0-.074-.075-.142-.15-.142m.809-.584c-.104 0-.18.09-.18.196l-.165 2.894.18 2.78c0 .104.061.195.165.195.09 0 .164-.09.18-.195l.195-2.78-.195-2.894c-.016-.105-.09-.196-.18-.196m.959-.705c-.104 0-.195.09-.21.21l-.149 3.6.164 3.563c.016.12.09.21.195.21.104 0 .194-.09.21-.21l.195-3.563-.196-3.6c-.015-.12-.105-.21-.209-.21m1.245.045c-.135 0-.24.12-.255.27l-.12 3.255.135 3.12c.016.135.12.255.24.255.134 0 .239-.12.254-.255l.15-3.12-.15-3.255c-.015-.15-.119-.27-.254-.27m1.38-.21c-.149 0-.269.135-.284.285l-.105 3.465.105 3.3c.015.149.135.284.284.284.135 0 .27-.135.27-.284l.119-3.3-.119-3.465c0-.15-.135-.285-.27-.285m1.38.165c-.164 0-.284.135-.299.285l-.09 3.3.09 3.195c.015.15.135.285.299.285.149 0 .284-.135.284-.285l.104-3.195-.104-3.3c0-.15-.135-.285-.284-.285m1.38.21c-.164 0-.299.15-.299.314l-.074 3.09.089 3.045c0 .164.135.299.284.299.164 0 .299-.135.299-.299l.104-3.045-.104-3.09c0-.164-.135-.314-.299-.314m1.245-.555c-.164 0-.3.15-.3.329l-.074 3.645.074 2.985c0 .164.136.314.3.314.164 0 .299-.15.299-.314l.09-2.985-.09-3.645c0-.179-.135-.329-.299-.329m1.38-.21c-.18 0-.329.164-.329.344l-.06 3.855.06 2.895c0 .18.149.329.329.329.18 0 .329-.149.329-.329l.074-2.895-.074-3.855c0-.18-.149-.344-.329-.344m1.245 0c-.194 0-.344.164-.344.344l-.045 3.855.045 2.895c0 .18.15.329.344.329.18 0 .329-.149.329-.329l.06-2.895-.06-3.855c0-.18-.149-.344-.329-.344m1.38.21c-.194 0-.344.164-.344.344l-.045 3.645.045 2.895c0 .18.15.329.344.329.18 0 .329-.149.329-.329l.06-2.895-.06-3.645c0-.18-.149-.344-.329-.344m1.245-.21c-.209 0-.359.164-.359.344l-.03 3.855.03 2.895c0 .18.15.329.359.329.194 0 .344-.149.344-.329l.045-2.895-.045-3.855c0-.18-.15-.344-.344-.344"/></svg>',
    url: 'https://soundcloud.com/discover'
  },
  none: {
    name: 'no music',
    icon: '<svg fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8 0-1.85.63-3.55 1.69-4.9L16.9 18.31C15.55 19.37 13.85 20 12 20zm6.31-3.1L7.1 5.69C8.45 4.63 10.15 4 12 4c4.42 0 8 3.58 8 8 0 1.85-.63 3.55-1.69 4.9z"/></svg>',
    url: null
  }
};

async function init() {
  try {
    const res = await fetch('/api/me');
    if (!res.ok) throw new Error();
    currentUser = await res.json();

    const btn = document.getElementById('userBtn');
    if (currentUser.avatar) {
      btn.innerHTML = `<img src="/uploads/${currentUser.avatar}" alt="${currentUser.username}">`;
    } else {
      btn.textContent = currentUser.username[0].toUpperCase();
    }

    musicProvider = currentUser.music_provider || 'spotify';
    updateMusicDisplay();

    await loadSessions();
    await loadMyLatestInvite();
    updateStats();
    recoverSession();
    startAutoSave();
  } catch (e) {
    window.location.href = '/';
  }
}

async function loadSessions() {
  const res = await fetch('/api/sessions');
  const sessions = await res.json();
  sessionData = {};
  sessions.forEach(s => {
    if (!sessionData[s.date]) sessionData[s.date] = { sessions: [], total: 0 };
    sessionData[s.date].sessions.push({
      label: s.label,
      color: s.color,
      mins: s.minutes,
      time: s.time
    });
    sessionData[s.date].total += s.minutes;
  });
}

async function loadMyLatestInvite() {
  try {
    const res = await fetch('/api/my-invites');
    const invites = await res.json();
    const unused = invites.find(i => !i.used_by);
    if (unused) {
      myLatestInviteCode = unused.code;
    } else if (invites.length > 0) {
      myLatestInviteCode = invites[0].code;
    }
  } catch (e) {
    console.error('Failed to load invites');
  }
}

const theme = localStorage.getItem('drift_theme') || 'light';
if (theme === 'dark') document.documentElement.dataset.theme = 'dark';

function toggleTheme() {
  const isDark = document.documentElement.dataset.theme === 'dark';
  document.documentElement.dataset.theme = isDark ? '' : 'dark';
  localStorage.setItem('drift_theme', isDark ? 'light' : 'dark');
}

function toggleUserMenu() {
  document.getElementById('userDropdown').classList.toggle('open');
}

document.addEventListener('click', (e) => {
  if (!e.target.closest('.user-menu')) {
    document.getElementById('userDropdown').classList.remove('open');
  }
  if (!e.target.closest('.label-picker')) {
    document.getElementById('labelMenu').classList.remove('open');
  }
  if (!e.target.closest('.music-provider')) {
    document.getElementById('musicMenu').classList.remove('open');
  }
});

async function logout() {
  if (running) {
    await fetch('/api/timer-stop', { method: 'POST' });
  }
  await fetch('/api/logout', { method: 'POST' });
  window.location.href = '/';
}

function openUploadAvatar() {
  document.getElementById('avatarModal').classList.add('open');
  document.getElementById('userDropdown').classList.remove('open');
}

async function uploadAvatar() {
  const input = document.getElementById('avatarInput');
  if (!input.files[0]) return toast('no file selected');

  const formData = new FormData();
  formData.append('avatar', input.files[0]);

  try {
    const res = await fetch('/api/upload-avatar', { method: 'POST', body: formData });
    const data = await res.json();

    if (data.avatar) {
      document.getElementById('userBtn').innerHTML = `<img src="/uploads/${data.avatar}" alt="avatar">`;
      closeModal('avatarModal');
      toast('avatar updated ✓');
    } else {
      toast(data.error || 'upload failed');
    }
  } catch (e) {
    toast('upload failed');
  }
}

async function openMyInvites() {
  document.getElementById('invitesModal').classList.add('open');
  document.getElementById('userDropdown').classList.remove('open');
  const res = await fetch('/api/my-invites');
  const invites = await res.json();
  document.getElementById('invitesList').innerHTML = invites.map(i => `
    <div class="session-row">
      <div class="session-label">${i.code}</div>
      <span class="session-time">${i.used_by ? 'used' : 'available'}</span>
    </div>
  `).join('') || '<div class="empty-msg">no invites yet</div>';
}

async function generateInvite() {
  const res = await fetch('/api/generate-invite', { method: 'POST' });
  const data = await res.json();
  if (data.code) {
    myLatestInviteCode = data.code;
    await navigator.clipboard.writeText(data.code);
    toast(`${data.code} copied`);
    openMyInvites();
  } else {
    toast('failed to generate code');
  }
}

async function openAddFriend() {
  document.getElementById('addFriendModal').classList.add('open');

  if (!myLatestInviteCode) {
    const res = await fetch('/api/generate-invite', { method: 'POST' });
    const data = await res.json();
    if (data.code) {
      myLatestInviteCode = data.code;
    }
  }

  document.getElementById('myShareCode').textContent = myLatestInviteCode || 'loading...';
}

async function copyMyCode() {
  if (myLatestInviteCode) {
    await navigator.clipboard.writeText(myLatestInviteCode);
    toast('code copied ✓');
  } else {
    toast('no code available');
  }
}

function updateMusicDisplay() {
  const provider = musicProviders[musicProvider];
  document.getElementById('musicText').textContent = provider.name;
  document.getElementById('musicIcon').innerHTML = provider.icon;

  const musicBtn = document.getElementById('musicProvider');
  if (musicProvider !== 'none') {
    musicBtn.classList.add('active');
  } else {
    musicBtn.classList.remove('active');
  }
}

const musicBtn = document.getElementById('musicProvider');
const musicMenu = document.getElementById('musicMenu');
musicBtn.onclick = e => {
  e.stopPropagation();
  const provider = musicProviders[musicProvider];
  if (provider.url && musicProvider !== 'none') {
    window.open(provider.url, '_blank');
  } else {
    musicMenu.classList.toggle('open');
  }
};

document.querySelectorAll('.music-opt').forEach(opt => {
  opt.onclick = async () => {
    const provider = opt.dataset.provider;
    musicProvider = provider;
    updateMusicDisplay();
    musicMenu.classList.remove('open');

    try {
      await fetch('/api/update-music-provider', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider })
      });
    } catch (e) {
      console.error('Failed to update music provider');
    }
  };
});

document.querySelectorAll('.nav-link').forEach(link => {
  link.onclick = () => {
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
    document.querySelectorAll('section').forEach(s => s.classList.remove('active'));
    link.classList.add('active');
    document.getElementById(link.dataset.page).classList.add('active');

    if (link.dataset.page === 'calendar') renderCal();
    if (link.dataset.page === 'leaderboard') renderLb('daily');
    if (link.dataset.page === 'friends') {
      renderFriends();
      startFriendsRefresh();
    } else {
      stopFriendsRefresh();
    }
  };
});

const picker = document.getElementById('labelPicker');
const menu = document.getElementById('labelMenu');
picker.onclick = e => {
  e.stopPropagation();
  menu.classList.toggle('open');
};

document.querySelectorAll('.label-opt').forEach(opt => {
  opt.onclick = () => {
    label = opt.dataset.label;
    labelColor = opt.dataset.color;
    document.getElementById('labelText').textContent = label;
    picker.querySelector('.label-dot').style.background = labelColor;
    picker.classList.toggle('has-label', label !== 'focus');
    menu.classList.remove('open');
  };
});

const display = document.getElementById('timeDisplay');
const startBtn = document.getElementById('startBtn');
const endBtn = document.getElementById('endBtn');

function fmt(s) {
  const m = Math.floor(s / 60), sec = s % 60;
  return `${m.toString().padStart(2,'0')}:${sec.toString().padStart(2,'0')}`;
}

function fmtMin(m) {
  if (m === 0) return '0m';
  if (m >= 60) {
    const h = Math.floor(m / 60);
    const min = m % 60;
    return min > 0 ? `${h}h ${min}m` : `${h}h`;
  }
  return `${m}m`;
}

startBtn.onclick = async () => {
  if (!running) {
    running = true;
    paused = false;
    startBtn.textContent = 'pause';
    endBtn.style.display = 'inline-block';
    display.classList.add('running');

    try {
      await fetch('/api/timer-start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label })
      });
    } catch (e) {
      console.error('Failed to notify timer start');
    }

    interval = setInterval(() => {
      secs++;
      display.textContent = fmt(secs);
    }, 1000);
  } else if (!paused) {
    paused = true;
    startBtn.textContent = 'resume';
    display.classList.remove('running');
    clearInterval(interval);

    try {
      await fetch('/api/timer-pause', { method: 'POST' });
    } catch (e) {
      console.error('Failed to notify timer pause');
    }
  } else {
    paused = false;
    startBtn.textContent = 'pause';
    display.classList.add('running');

    try {
      await fetch('/api/timer-resume', { method: 'POST' });
    } catch (e) {
      console.error('Failed to notify timer resume');
    }

    interval = setInterval(() => {
      secs++;
      display.textContent = fmt(secs);
    }, 1000);
  }
};

endBtn.onclick = async () => {
  if (secs < 60) {
    toast('session must be at least 1 minute');
    return;
  }

  clearInterval(interval);
  const today = new Date().toISOString().slice(0,10);
  const mins = Math.floor(secs / 60);
  const time = new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});

  try {
    await fetch('/api/timer-stop', { method: 'POST' });

    await fetch('/api/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ label, color: labelColor, minutes: mins, date: today, time })
    });

    if (!sessionData[today]) sessionData[today] = { sessions: [], total: 0 };
    sessionData[today].sessions.push({ label, color: labelColor, mins, time });
    sessionData[today].total += mins;

    running = false;
    paused = false;
    secs = 0;
    display.textContent = '00:00';
    display.classList.remove('running');
    startBtn.textContent = 'start';
    endBtn.style.display = 'none';

    updateStats();
    toast(`${fmtMin(mins)} session saved ✓`);
  } catch (e) {
    toast('failed to save session');
  }
};

function updateStats() {
  const today = new Date().toISOString().slice(0,10);
  const todayData = sessionData[today] || { total: 0, sessions: [] };
  document.getElementById('todayTime').textContent = fmtMin(todayData.total);
  document.getElementById('sessionCount').textContent = todayData.sessions.length;

  let weekTotal = 0;
  const now = new Date();
  for (let i = 0; i < 7; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0,10);
    weekTotal += sessionData[key]?.total || 0;
  }
  document.getElementById('weekTime').textContent = fmtMin(weekTotal);

  let streak = 0;
  let checkDate = new Date();
  while (streak < 365) {
    const key = checkDate.toISOString().slice(0,10);
    if (!sessionData[key] || sessionData[key].total === 0) break;
    streak++;
    checkDate.setDate(checkDate.getDate() - 1);
  }
  document.getElementById('streakNum').textContent = streak;
}

function renderCal() {
  document.getElementById('calTitle').textContent = `${months[viewMonth]} ${viewYear}`;
  const first = new Date(viewYear, viewMonth, 1).getDay();
  const daysIn = new Date(viewYear, viewMonth + 1, 0).getDate();
  const today = new Date();

  let html = days.map(d => `<div class="cal-weekday">${d}</div>`).join('');
  for (let i = 0; i < first; i++) html += '<div class="cal-day empty"></div>';

  for (let d = 1; d <= daysIn; d++) {
    const key = `${viewYear}-${(viewMonth+1).toString().padStart(2,'0')}-${d.toString().padStart(2,'0')}`;
    const mins = sessionData[key]?.total || 0;
    let lvl = '';
    if (mins > 0) lvl = 'l1';
    if (mins >= 30) lvl = 'l2';
    if (mins >= 60) lvl = 'l3';
    if (mins >= 120) lvl = 'l4';
    if (mins >= 180) lvl = 'l5';

    const isToday = d === today.getDate() &&
                    viewMonth === today.getMonth() &&
                    viewYear === today.getFullYear();

    html += `<div class="cal-day ${lvl} ${isToday ? 'today' : ''}" onclick="openDay('${key}')">
      <span class="num">${d}</span>
      ${mins ? `<span class="mins">${fmtMin(mins)}</span>` : ''}
    </div>`;
  }
  document.getElementById('calGrid').innerHTML = html;
}

function changeMonth(dir) {
  viewMonth += dir;
  if (viewMonth > 11) { viewMonth = 0; viewYear++; }
  if (viewMonth < 0) { viewMonth = 11; viewYear--; }
  renderCal();
}

function openDay(key) {
  const d = new Date(key + 'T12:00:00');
  document.getElementById('dayModalTitle').textContent =
    d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  const sessions = sessionData[key]?.sessions || [];
  document.getElementById('sessionList').innerHTML = sessions.length ? sessions.map(s => `
    <div class="session-row">
      <div class="session-label">
        <span class="label-dot" style="background:${s.color}"></span>
        ${s.label}
      </div>
      <span class="session-time">${fmtMin(s.mins)}</span>
    </div>
  `).join('') : '<div class="empty-msg">no sessions this day</div>';
  document.getElementById('dayModal').classList.add('open');
}

async function renderLb(period) {
  const res = await fetch(`/api/leaderboard/${period}`);
  const leaderboard = await res.json();
  document.getElementById('lbList').innerHTML = leaderboard.map((u, i) => `
    <div class="lb-item ${u.isYou ? 'you' : ''}">
      <span class="lb-rank">${i + 1}</span>
      <div class="lb-avatar">
        ${u.avatar ?
          `<img src="/uploads/${u.avatar}" alt="${u.username}">` :
          u.username[0].toUpperCase()}
      </div>
      <div class="lb-info">
        <div class="lb-name">${u.username}${u.isYou ? ' (you)' : ''}</div>
        <div class="lb-streak">${u.streak} day streak</div>
      </div>
      <span class="lb-time">${fmtMin(u.minutes)}</span>
    </div>
  `).join('') || '<div class="empty-msg">no data yet</div>';
}

document.querySelectorAll('.period-btn').forEach(btn => {
  btn.onclick = () => {
    document.querySelectorAll('.period-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    renderLb(btn.dataset.period);
  };
});

async function renderFriends() {
  const res = await fetch('/api/friends');
  const friends = await res.json();

  const friendsWithStats = await Promise.all(friends.map(async f => {
    const sessRes = await fetch(`/api/friend-stats/${f.id}`);
    const stats = await sessRes.json();
    return { ...f, ...stats };
  }));

  document.getElementById('frGrid').innerHTML = friendsWithStats.length ?
    friendsWithStats.map(f => {
      const isOnline = f.is_active === 1;
      return `
    <div class="fr-card ${isOnline ? 'online' : ''}">
      <div class="fr-avatar">
        ${f.avatar ?
          `<img src="/uploads/${f.avatar}" alt="${f.username}">` :
          f.username[0].toUpperCase()}
        ${isOnline ? '<div class="online-indicator"></div>' : ''}
      </div>
      <div class="fr-name">${f.username}</div>
      <div class="fr-status ${isOnline ? 'online' : ''}">
        <span class="status-dot"></span>
        ${isOnline ? (f.active_label || 'studying') : 'offline'}
      </div>
      <div class="fr-stats">
        <div>
          <div class="fr-stat-val">${fmtMin(f.todayMinutes || 0)}</div>
          <div class="fr-stat-lbl">today</div>
        </div>
        <div>
          <div class="fr-stat-val">${f.streak || 0}</div>
          <div class="fr-stat-lbl">streak</div>
        </div>
      </div>
    </div>
  `}).join('') :
  '<div class="empty-msg">add friends to see their progress</div>';
}

function startFriendsRefresh() {
  if (friendsRefreshInterval) return;
  friendsRefreshInterval = setInterval(renderFriends, 5000);
}

function stopFriendsRefresh() {
  if (friendsRefreshInterval) {
    clearInterval(friendsRefreshInterval);
    friendsRefreshInterval = null;
  }
}

function closeModal(id) {
  document.getElementById(id).classList.remove('open');
}

async function addFriend() {
  const code = document.getElementById('friendCode').value.trim();
  if (!code) return toast('enter a code');

  try {
    const res = await fetch('/api/add-friend', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code })
    });
    const data = await res.json();

    if (data.success) {
      toast('friend added ✓');
      document.getElementById('friendCode').value = '';
      closeModal('addFriendModal');
      renderFriends();
    } else {
      toast(data.error || 'failed to add friend');
    }
  } catch (e) {
    toast('failed to add friend');
  }
}

document.querySelectorAll('.modal-bg').forEach(m => {
  m.onclick = e => {
    if (e.target === m) m.classList.remove('open');
  };
});

function toast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2800);
}

function startAutoSave() {
  setInterval(() => {
    if (running && secs > 0) {
      localStorage.setItem('drift_session', JSON.stringify({
        secs,
        label,
        labelColor,
        startTime: Date.now() - (secs * 1000)
      }));
    } else {
      localStorage.removeItem('drift_session');
    }
  }, 5000);
}

function recoverSession() {
  const saved = localStorage.getItem('drift_session');
  if (saved) {
    try {
      const session = JSON.parse(saved);
      const elapsed = Math.floor((Date.now() - session.startTime) / 1000);
      if (elapsed < 3600 && elapsed > session.secs) {
        secs = elapsed;
        label = session.label;
        labelColor = session.labelColor;
        display.textContent = fmt(secs);
        document.getElementById('labelText').textContent = label;
        picker.querySelector('.label-dot').style.background = labelColor;
        picker.classList.toggle('has-label', label !== 'focus');
      }
    } catch (e) {}
  }
}

window.addEventListener('beforeunload', async (e) => {
  if (running && secs > 0) {
    e.preventDefault();
    e.returnValue = '';
    await fetch('/api/timer-stop', { method: 'POST' });
  }
});

document.addEventListener('keydown', (e) => {
  if (e.code === 'Space' && e.target.tagName !== 'INPUT') {
    e.preventDefault();
    startBtn.click();
  }
});

init();