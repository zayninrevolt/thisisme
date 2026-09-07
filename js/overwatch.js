const OW_BATTLETAG = 'Zayn#21529';
const IMAGE_HOSTS = new Set(['d15f34w2p8l1cc.cloudfront.net', 'static.playoverwatch.com']);

export function initOverwatch({ openWindow }) {
  const win = document.getElementById('owWin');
  const ranks = document.getElementById('owRanks');
  const status = document.getElementById('owStatus');
  const season = document.getElementById('owSeason');
  const name = document.getElementById('owName');
  const avatar = document.getElementById('owAvatar');
  const profileLink = document.getElementById('owProfileLink');
  const retryButton = document.getElementById('owRetry');
  const playerId = OW_BATTLETAG.trim().replace('#', '-');
  let loaded = false;
  let inFlight = null;

  profileLink.href = `https://overwatch.blizzard.com/en-us/career/${encodeURIComponent(playerId)}/`;

  function safeHttpsUrl(value) {
    try {
      const url = new URL(value);
      return url.protocol === 'https:' && IMAGE_HOSTS.has(url.hostname) ? url.href : '';
    } catch (_) {
      return '';
    }
  }

  const capitalize = (value) => value ? value.charAt(0).toUpperCase() + value.slice(1) : value;

  function roleCard(label, data) {
    const card = document.createElement('div');
    card.className = 'ow-role';
    const iconUrl = data ? safeHttpsUrl(data.rank_icon) : '';
    if (iconUrl) {
      const icon = document.createElement('img');
      icon.className = 'ow-rank-icon';
      icon.src = iconUrl;
      icon.alt = `${capitalize(String(data.division || ''))} ${String(data.tier || '')}`.trim();
      card.append(icon);
    }
    const roleLabel = document.createElement('span');
    roleLabel.className = 'ow-role-label';
    roleLabel.textContent = label;
    const rank = document.createElement('span');
    rank.className = 'ow-rank-text';
    rank.textContent = data
      ? `${capitalize(String(data.division || ''))} ${String(data.tier || '')}`.trim()
      : 'Unranked';
    card.append(roleLabel, rank);
    return card;
  }

  function showMessage(text) {
    const notice = document.createElement('p');
    notice.className = 'ow-message ow-message-wide';
    notice.textContent = text;
    ranks.replaceChildren(notice);
  }

  async function fetchProfile() {
    showMessage('Loading…');
    status.textContent = 'Fetching…';
    retryButton.disabled = true;
    try {
      const response = await fetch(
        `https://overfast-api.tekrop.fr/players/${encodeURIComponent(playerId)}/summary`,
        { signal: AbortSignal.timeout(8000) }
      );
      if (response.status === 404) {
        showMessage('Profile not found. Check the BattleTag is correct.');
        status.textContent = 'Not found';
        return;
      }
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      if (data.username) name.textContent = data.username;
      const avatarUrl = safeHttpsUrl(data.avatar);
      if (avatarUrl) avatar.style.backgroundImage = `url("${avatarUrl}")`;
      const competitive = data.competitive?.pc;
      if (!competitive || !['tank', 'damage', 'support', 'open'].some((role) => competitive[role])) {
        showMessage('No competitive rank this season (profile may be private, or no placements yet).');
        status.textContent = 'Done';
        loaded = true;
        return;
      }
      ranks.replaceChildren(
        roleCard('Tank', competitive.tank),
        roleCard('Damage', competitive.damage),
        roleCard('Support', competitive.support)
      );
      season.textContent = competitive.season ? `Season ${competitive.season}` : '';
      status.textContent = 'Live';
      loaded = true;
    } catch (_) {
      showMessage("Couldn't load rank right now. Retry or view the career profile above.");
      status.textContent = 'Rank unavailable';
    } finally {
      inFlight = null;
      retryButton.disabled = false;
      if (loaded && document.activeElement === retryButton) win.focus();
      retryButton.hidden = loaded;
    }
  }

  function loadProfile() {
    if (loaded) return Promise.resolve();
    if (!/-\d+$/.test(playerId) || /-0000$/.test(playerId)) {
      showMessage('BattleTag not set. Add the full tag in js/overwatch.js.');
      status.textContent = 'Not configured';
      return Promise.resolve();
    }
    inFlight ||= fetchProfile();
    return inFlight;
  }

  function openOverwatch() {
    openWindow(win);
    loadProfile();
  }

  document.getElementById('owIconLink').addEventListener('click', openOverwatch);
  document.getElementById('owMenuBtn').addEventListener('click', openOverwatch);
  retryButton.addEventListener('click', loadProfile);
}
