    /* ============================================================
       Overwatch BattleTag
       Replace the number below with your real discriminator.
       Example: "zaynonfire#21534"  (the # is converted automatically)
       Your career profile must be set to PUBLIC for the rank to load.
       ============================================================ */
    const OW_BATTLETAG = "Zayn#21529";

    // ---------- Window management (drag, focus, minimize/maximize/close) ----------
    let zCounter = 10;
    const previousFocus = new WeakMap();

    function focusFirstControl(win) {
      const control = win.querySelector('button:not([disabled]), a[href], iframe, [tabindex]:not([tabindex="-1"])');
      (control || win).focus();
    }

    function focusWindow(win) {
      win.style.zIndex = ++zCounter;
    }

    // Open a window; on small screens cascade it below the icon strip so
    // title bars stay reachable instead of stacking dead-centre.
    let cascade = 0;
    function openWindow(win) {
      const trigger = document.activeElement.closest?.('.start-menu') ? startBtn : document.activeElement;
      previousFocus.set(win, trigger);
      win.style.display = '';
      win.setAttribute('aria-hidden', 'false');
      if (window.innerWidth <= 600 && !win.dataset.placed) {
        cascade = (cascade + 1) % 4;
        win.style.top = (150 + cascade * 30) + 'px';
        win.dataset.placed = '1';
      }
      focusWindow(win);
      closeStartMenu();
      requestAnimationFrame(() => focusFirstControl(win));
    }

    function closeWindow(win) {
      win.style.display = 'none';
      win.setAttribute('aria-hidden', 'true');
      const trigger = previousFocus.get(win);
      if (trigger && trigger.isConnected) trigger.focus();
    }

    function makeDraggable(win) {
      const bar = win.querySelector('.title-bar');
      let offsetX = 0, offsetY = 0, dragging = false;

      win.addEventListener('pointerdown', () => focusWindow(win));

      bar.addEventListener('pointerdown', (e) => {
        if (e.target.closest('.control-btn')) return; // don't drag from buttons
        if (win.classList.contains('maximized')) return;
        dragging = true;
        // Drop the centering transform so left/top are absolute and don't jump.
        const rect = win.getBoundingClientRect();
        win.style.transform = 'none';
        win.style.left = rect.left + 'px';
        win.style.top = rect.top + 'px';
        offsetX = e.clientX - rect.left;
        offsetY = e.clientY - rect.top;
        bar.setPointerCapture(e.pointerId);
      });

      bar.addEventListener('pointermove', (e) => {
        if (!dragging) return;
        const maxX = window.innerWidth - win.offsetWidth;
        const maxY = window.innerHeight - 44 - 28; // keep title bar above taskbar
        let left = e.clientX - offsetX;
        let top = e.clientY - offsetY;
        left = Math.min(Math.max(0, left), Math.max(0, maxX));
        top = Math.min(Math.max(0, top), Math.max(0, maxY));
        win.style.left = left + 'px';
        win.style.top = top + 'px';
      });

      const stop = () => { dragging = false; };
      bar.addEventListener('pointerup', stop);
      bar.addEventListener('pointercancel', stop);
    }

    document.querySelectorAll('.window').forEach(makeDraggable);

    // Title-bar control buttons
    document.querySelectorAll('.control-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const win = document.getElementById(btn.dataset.target);
        const action = btn.dataset.action;
        if (action === 'maximize') {
          win.classList.toggle('maximized');
        } else { // minimize or close both hide the window
          closeWindow(win);
          if (win.id === 'win') {
            taskLinks.classList.remove('active');
            taskLinks.setAttribute('aria-pressed', 'false');
          }
        }
      });
    });

    // ---------- Main window <-> taskbar ----------
    const win = document.getElementById('win');
    const taskLinks = document.getElementById('taskLinks');
    taskLinks.addEventListener('click', () => {
      const hidden = win.style.display === 'none';
      if (hidden) openWindow(win); else closeWindow(win);
      taskLinks.classList.toggle('active', hidden);
      taskLinks.setAttribute('aria-pressed', String(hidden));
    });

    // ---------- Clock ----------
    function updateClock() {
      const now = new Date();
      const h = String(now.getHours()).padStart(2, '0');
      const m = String(now.getMinutes()).padStart(2, '0');
      document.getElementById('clock').textContent = `${h}:${m}`;
    }
    setInterval(updateClock, 1000);
    updateClock();

    // ---------- Status bar hover messages ----------
    const statusText = document.getElementById('statusText');
    document.querySelectorAll('#win .btn-98').forEach((btn) => {
      const label = btn.textContent.trim();
      btn.addEventListener('mouseenter', () => { statusText.textContent = `Open ${label}`; });
      btn.addEventListener('mouseleave', () => { statusText.textContent = 'Ready'; });
    });

    // ---------- Start menu ----------
    const startBtn = document.getElementById('startBtn');
    const startMenu = document.getElementById('startMenu');
    function closeStartMenu({ restoreFocus = false } = {}) {
      startMenu.style.display = 'none';
      startBtn.setAttribute('aria-expanded', 'false');
      if (restoreFocus) startBtn.focus();
    }
    startBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const opening = startMenu.style.display !== 'block';
      startMenu.style.display = opening ? 'block' : 'none';
      startBtn.setAttribute('aria-expanded', String(opening));
      if (opening) startMenu.querySelector('.start-item').focus();
    });
    startMenu.addEventListener('keydown', (event) => {
      const items = [...startMenu.querySelectorAll('[role="menuitem"]')];
      const current = items.indexOf(document.activeElement);
      let next = current;
      if (event.key === 'ArrowDown') next = (current + 1) % items.length;
      else if (event.key === 'ArrowUp') next = (current - 1 + items.length) % items.length;
      else if (event.key === 'Home') next = 0;
      else if (event.key === 'End') next = items.length - 1;
      else return;
      event.preventDefault();
      items[next].focus();
    });
    document.addEventListener('click', (e) => {
      if (!startMenu.contains(e.target) && !startBtn.contains(e.target)) {
        closeStartMenu();
      }
    });

    document.getElementById('steamMenuBtn').addEventListener('click', () => {
      window.open('https://steamcommunity.com/id/ZaynOnFire', '_blank', 'noopener');
      closeStartMenu({ restoreFocus: true });
    });

    // Mobile affordance: retire the "Swipe" hint once the visitor explores the strip.
    const iconsStrip = document.querySelector('.icons');
    const iconsHint = document.querySelector('.icons-hint');
    const iconsFade = document.querySelector('.icons-fade');
    iconsStrip.addEventListener('scroll', () => {
      const atEnd = iconsStrip.scrollLeft + iconsStrip.clientWidth >= iconsStrip.scrollWidth - 4;
      iconsHint.style.opacity = iconsStrip.scrollLeft > 12 ? '0' : '1';
      iconsFade.style.opacity = atEnd ? '0' : '1';
    }, { passive: true });

    // ---------- About dialog ----------
    const aboutDialog = document.getElementById('aboutDialog');
    let aboutTrigger = null;
    const closeAbout = () => aboutDialog.close();
    document.getElementById('aboutBtn').addEventListener('click', () => {
      aboutTrigger = startBtn;
      closeStartMenu();
      aboutDialog.showModal();
      document.getElementById('aboutOk').focus();
    });
    document.getElementById('aboutOk').addEventListener('click', closeAbout);
    document.getElementById('aboutClose').addEventListener('click', closeAbout);
    aboutDialog.addEventListener('click', (e) => { if (e.target === aboutDialog) closeAbout(); });
    aboutDialog.addEventListener('close', () => {
      if (aboutTrigger && aboutTrigger.isConnected) aboutTrigger.focus();
    });

    document.addEventListener('keydown', (event) => {
      if (event.key !== 'Escape') return;
      if (startMenu.style.display === 'block') {
        closeStartMenu({ restoreFocus: true });
        return;
      }
      const activeWindow = document.activeElement.closest?.('.window');
      if (activeWindow && activeWindow.id !== 'win') closeWindow(activeWindow);
    });

    // ---------- Overwatch window + live rank ----------
    const owWin = document.getElementById('owWin');
    const owRanks = document.getElementById('owRanks');
    const owStatus = document.getElementById('owStatus');
    const owSeason = document.getElementById('owSeason');
    const owName = document.getElementById('owName');
    const owAvatar = document.getElementById('owAvatar');
    const owProfileLink = document.getElementById('owProfileLink');
    let owLoaded = false;

    const playerId = OW_BATTLETAG.trim().replace('#', '-');
    owProfileLink.href = `https://overwatch.blizzard.com/en-us/career/${encodeURIComponent(playerId)}/`;

    function cap(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }

    function safeHttpsUrl(value) {
      try {
        const url = new URL(value);
        return url.protocol === 'https:' ? url.href : '';
      } catch (_) {
        return '';
      }
    }

    function roleCard(label, data) {
      const card = document.createElement('div');
      card.className = 'ow-role';
      const iconUrl = data ? safeHttpsUrl(data.rank_icon) : '';
      if (iconUrl) {
        const icon = document.createElement('img');
        icon.className = 'ow-rank-icon';
        icon.src = iconUrl;
        icon.alt = `${cap(String(data.division || ''))} ${String(data.tier || '')}`.trim();
        card.append(icon);
      }
      const roleLabel = document.createElement('span');
      roleLabel.className = 'ow-role-label';
      roleLabel.textContent = label;
      const rank = document.createElement('span');
      rank.className = 'ow-rank-text';
      rank.textContent = data
        ? `${cap(String(data.division || ''))} ${String(data.tier || '')}`.trim()
        : 'Unranked';
      card.append(roleLabel, rank);
      return card;
    }

    function message(text) {
      const notice = document.createElement('p');
      notice.className = 'ow-message ow-message-wide';
      notice.textContent = text;
      owRanks.replaceChildren(notice);
    }

    async function loadOverwatch() {
      if (owLoaded) return;
      if (/-0000$/.test(playerId) || !/-\d+$/.test(playerId)) {
        message("BattleTag not set yet. Add your full tag (e.g. zaynonfire#21534) in the page source.");
        owStatus.textContent = 'Not configured';
        return;
      }
      message('Loading…');
      owStatus.textContent = 'Fetching…';
      try {
        const res = await fetch(`https://overfast-api.tekrop.fr/players/${encodeURIComponent(playerId)}/summary`, {
          signal: AbortSignal.timeout(8000)
        });
        if (res.status === 404) {
          message("Profile not found. Check the BattleTag is correct.");
          owStatus.textContent = 'Not found';
          return;
        }
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const data = await res.json();

        if (data.username) owName.textContent = data.username;
        const avatarUrl = safeHttpsUrl(data.avatar);
        if (avatarUrl) owAvatar.style.backgroundImage = `url("${avatarUrl}")`;

        const comp = data.competitive && data.competitive.pc;
        if (!comp || (!comp.tank && !comp.damage && !comp.support && !comp.open)) {
          message("No competitive rank this season (profile may be private, or no placements yet).");
          owStatus.textContent = 'Done';
          owLoaded = true;
          return;
        }

        owRanks.replaceChildren(
          roleCard('Tank', comp.tank),
          roleCard('Damage', comp.damage),
          roleCard('Support', comp.support)
        );
        owSeason.textContent = comp.season ? 'Season ' + comp.season : '';
        owStatus.textContent = 'Live';
        owLoaded = true;
      } catch (err) {
        message("Couldn't load rank right now. Try again later.");
        owStatus.textContent = 'Offline';
      }
    }

    function openOverwatch() {
      openWindow(owWin);
      loadOverwatch();
    }

    const owIconLink = document.getElementById('owIconLink');
    owIconLink.addEventListener('click', openOverwatch);
    document.getElementById('owMenuBtn').addEventListener('click', openOverwatch);

    // ---------- Minesweeper (classic 9x9, 10 mines) ----------
    (function () {
      const ROWS = 9, COLS = 9, MINES = 10, TOTAL = ROWS * COLS;
      const grid = document.getElementById('msGrid');
      const minesLed = document.getElementById('msMines');
      const timerLed = document.getElementById('msTimer');
      const face = document.getElementById('msFace');
      const msWin = document.getElementById('msWin');

      let cells, mine, revealed, flagged, counts;
      let started, over, revealedCount, flags, timer, timerId;

      const pad = (n) => String(Math.max(0, Math.min(999, n))).padStart(3, '0');
      const idx = (r, c) => r * COLS + c;
      const inBounds = (r, c) => r >= 0 && r < ROWS && c >= 0 && c < COLS;
      function neighbors(r, c) {
        const out = [];
        for (let dr = -1; dr <= 1; dr++)
          for (let dc = -1; dc <= 1; dc++)
            if ((dr || dc) && inBounds(r + dr, c + dc)) out.push([r + dr, c + dc]);
        return out;
      }

      function build() {
        grid.innerHTML = '';
        cells = []; mine = []; revealed = []; flagged = []; counts = [];
        started = false; over = false; revealedCount = 0; flags = 0; timer = 0;
        clearInterval(timerId); timerId = null;
        minesLed.textContent = pad(MINES);
        timerLed.textContent = pad(0);
        face.textContent = '🙂';
        for (let i = 0; i < TOTAL; i++) {
          mine[i] = false; revealed[i] = false; flagged[i] = false; counts[i] = 0;
          const btn = document.createElement('button');
          btn.className = 'ms-cell';
          btn.type = 'button';
          btn.dataset.i = i;
          btn.setAttribute('role', 'gridcell');
          btn.setAttribute('aria-label', `Hidden cell, row ${Math.floor(i / COLS) + 1}, column ${(i % COLS) + 1}`);
          cells[i] = btn;
          grid.appendChild(btn);
        }
      }

      function placeMines(safe) {
        let placed = 0;
        while (placed < MINES) {
          const i = Math.floor(Math.random() * TOTAL);
          if (i === safe || mine[i]) continue;
          mine[i] = true; placed++;
        }
        for (let r = 0; r < ROWS; r++)
          for (let c = 0; c < COLS; c++)
            if (!mine[idx(r, c)])
              counts[idx(r, c)] = neighbors(r, c).filter(([nr, nc]) => mine[idx(nr, nc)]).length;
      }

      function reveal(i) {
        if (revealed[i] || flagged[i]) return;
        revealed[i] = true; revealedCount++;
        const btn = cells[i];
        btn.classList.add('revealed');
        btn.setAttribute('aria-label', counts[i] > 0 ? `${counts[i]} adjacent mines` : 'Empty cell');
        if (counts[i] > 0) {
          btn.textContent = counts[i];
          btn.classList.add('n' + counts[i]);
        } else {
          const r = Math.floor(i / COLS), c = i % COLS;
          neighbors(r, c).forEach(([nr, nc]) => reveal(idx(nr, nc)));
        }
      }

      function lose(hit) {
        over = true; clearInterval(timerId);
        for (let i = 0; i < TOTAL; i++) {
          if (mine[i]) {
            cells[i].classList.add('revealed', 'mine');
            cells[i].textContent = '💣';
            cells[i].setAttribute('aria-label', 'Mine');
          } else if (flagged[i]) {
            cells[i].textContent = '❌';
            cells[i].setAttribute('aria-label', 'Incorrectly flagged cell');
          }
        }
        cells[hit].classList.add('exploded');
        cells[hit].setAttribute('aria-label', 'Exploded mine');
        face.textContent = '😵';
      }

      function win() {
        over = true; clearInterval(timerId);
        face.textContent = '😎';
        for (let i = 0; i < TOTAL; i++)
          if (mine[i] && !flagged[i]) {
            flagged[i] = true;
            cells[i].textContent = '🚩';
            cells[i].setAttribute('aria-label', 'Flagged mine');
          }
        minesLed.textContent = pad(0);
      }

      function onLeft(i) {
        if (over || flagged[i] || revealed[i]) return;
        if (!started) {
          placeMines(i);
          started = true;
          timerId = setInterval(() => { timer = Math.min(999, timer + 1); timerLed.textContent = pad(timer); }, 1000);
        }
        if (mine[i]) { lose(i); return; }
        reveal(i);
        if (revealedCount === TOTAL - MINES) win();
      }

      function onRight(i) {
        if (over || revealed[i]) return;
        flagged[i] = !flagged[i];
        cells[i].textContent = flagged[i] ? '🚩' : '';
        cells[i].setAttribute('aria-label', flagged[i] ? 'Flagged cell' : 'Hidden cell');
        flags += flagged[i] ? 1 : -1;
        minesLed.textContent = pad(MINES - flags);
      }

      grid.addEventListener('click', (e) => {
        if (longPressed) { longPressed = false; return; } // flag placed, don't also reveal
        const t = e.target.closest('.ms-cell'); if (t) onLeft(+t.dataset.i);
      });
      grid.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        const t = e.target.closest('.ms-cell'); if (t) onRight(+t.dataset.i);
      });

      // Touch: long-press a cell to flag it (right-click equivalent)
      let pressTimer = null, longPressed = false;
      grid.addEventListener('pointerdown', (e) => {
        if (e.pointerType === 'mouse') return;
        const t = e.target.closest('.ms-cell'); if (!t) return;
        pressTimer = setTimeout(() => {
          longPressed = true;
          onRight(+t.dataset.i);
          if (navigator.vibrate) navigator.vibrate(15);
        }, 350);
      });
      ['pointerup', 'pointercancel', 'pointermove'].forEach((ev) =>
        grid.addEventListener(ev, () => clearTimeout(pressTimer)));
      face.addEventListener('click', build);
      build();

      function openMinesweeper() {
        openWindow(msWin);
      }
      const msIconLink = document.getElementById('msIconLink');
      msIconLink.addEventListener('click', openMinesweeper);
      document.getElementById('msMenuBtn').addEventListener('click', openMinesweeper);
    })();

    // ---------- Media player (lazy-loads the Spotify embed on first open) ----------
    const mpWin = document.getElementById('mpWin');
    const mpEmbed = mpWin.querySelector('.mp-embed');
    function openMediaPlayer() {
      if (!mpEmbed.src) mpEmbed.src = mpEmbed.dataset.src;
      openWindow(mpWin);
    }
    const mpIconLink = document.getElementById('mpIconLink');
    mpIconLink.addEventListener('click', openMediaPlayer);
    document.getElementById('mpMenuBtn').addEventListener('click', openMediaPlayer);
    document.getElementById('spotifyBtn').addEventListener('click', openMediaPlayer);

    // ---------- Twitch window (live badge + lazy player embed) ----------
    const TWITCH_CHANNEL = 'zaynonfire';
    const twWin = document.getElementById('twWin');
    const twEmbed = twWin.querySelector('.tw-embed');
    const twTicker = document.getElementById('twTicker');

    // Check live status once on load: badge the icon and set the ticker text.
    (async function twitchStatus() {
      try {
        const res = await fetch(`https://decapi.me/twitch/uptime/${TWITCH_CHANNEL}`, {
          signal: AbortSignal.timeout(6000)
        });
        const uptime = (await res.text()).trim();
        if (res.ok && !/offline|error|not found/i.test(uptime)) {
          document.getElementById('twIconLabel').textContent = 'Twitch 🔴';
          let game = '';
          try {
            const gameResponse = await fetch(`https://decapi.me/twitch/game/${TWITCH_CHANNEL}`, {
              signal: AbortSignal.timeout(6000)
            });
            if (gameResponse.ok) game = (await gameResponse.text()).trim();
          } catch (_) {
            game = '';
          }
          twTicker.textContent = `🔴 LIVE NOW${game ? ' — playing ' + game : ''} — up for ${uptime} — get in here!`;
        } else {
          twTicker.textContent = `zaynonfire is offline right now — follow on Twitch so you don't miss the next stream ♪`;
        }
      } catch (_) {
        twTicker.textContent = 'Twitch status unavailable — open the player to check the stream.';
      }
    })();

    function openTwitch() {
      if (!twEmbed.src) twEmbed.src = twEmbed.dataset.src;
      openWindow(twWin);
    }
    const twIconLink = document.getElementById('twIconLink');
    twIconLink.addEventListener('click', openTwitch);
    document.getElementById('twMenuBtn').addEventListener('click', openTwitch);
    document.getElementById('twitchBtn').addEventListener('click', openTwitch);

    // ---------- Games I Play window ----------
    const gamesWin = document.getElementById('gamesWin');
    function openGames() { openWindow(gamesWin); }
    document.getElementById('gamesIconLink').addEventListener('click', openGames);
    document.getElementById('gamesMenuBtn').addEventListener('click', openGames);

    // ---------- CRT effect toggle (persisted) ----------
    const crtBtn = document.getElementById('crtBtn');
    function applyCrt(on) {
      document.body.classList.toggle('no-crt', !on);
      crtBtn.textContent = 'CRT effect: ' + (on ? 'On' : 'Off');
    }
    applyCrt(localStorage.getItem('crt') !== 'off');
    crtBtn.addEventListener('click', () => {
      const turnOn = document.body.classList.contains('no-crt'); // currently off -> turn on
      localStorage.setItem('crt', turnOn ? 'on' : 'off');
      applyCrt(turnOn);
      startMenu.style.display = 'none';
    });

    // ---------- Boot splash (shows once per browser session) ----------
    const boot = document.getElementById('boot');
    if (sessionStorage.getItem('booted')) {
      boot.remove();
    } else {
      setTimeout(() => {
        boot.classList.add('hidden');
        sessionStorage.setItem('booted', '1');
        setTimeout(() => boot.remove(), 600);
      }, 2400);
    }
