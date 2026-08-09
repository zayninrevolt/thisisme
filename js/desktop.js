export function initDesktop() {
  const startBtn = document.getElementById('startBtn');
  const startMenu = document.getElementById('startMenu');
  const previousFocus = new WeakMap();
  const taskButtons = new Map(
    [...document.querySelectorAll('[data-window-target]')]
      .map((button) => [button.dataset.windowTarget, button])
  );
  let zCounter = 10;
  let cascade = 0;

  function focusFirstControl(win) {
    win.focus();
  }

  function syncTaskbar(activeWindow) {
    taskButtons.forEach((button, id) => {
      const isActive = activeWindow?.id === id && !activeWindow.hidden;
      button.classList.toggle('active', isActive);
      button.setAttribute('aria-pressed', String(isActive));
    });
  }

  function focusWindow(win) {
    win.style.zIndex = ++zCounter;
    syncTaskbar(win);
  }

  function activateTopWindow() {
    const visible = [...document.querySelectorAll('.window:not([hidden])')];
    const top = visible.sort((a, b) => Number(b.style.zIndex || 0) - Number(a.style.zIndex || 0))[0];
    syncTaskbar(top);
  }

  function closeStartMenu({ restoreFocus = false } = {}) {
    startMenu.style.display = 'none';
    startBtn.setAttribute('aria-expanded', 'false');
    if (restoreFocus) startBtn.focus();
  }

  function openWindow(win) {
    const trigger = document.activeElement.closest?.('.start-menu') ? startBtn : document.activeElement;
    previousFocus.set(win, trigger);
    win.hidden = false;
    win.setAttribute('aria-hidden', 'false');
    const taskButton = taskButtons.get(win.id);
    if (taskButton) taskButton.hidden = false;
    if (window.innerWidth <= 600 && !win.dataset.placed) {
      cascade = (cascade + 1) % 4;
      win.style.top = `${150 + cascade * 30}px`;
      win.dataset.placed = '1';
    }
    focusWindow(win);
    closeStartMenu();
    requestAnimationFrame(() => focusFirstControl(win));
  }

  function hideWindow(win, { keepTask = false, restoreFocus = true } = {}) {
    win.hidden = true;
    win.setAttribute('aria-hidden', 'true');
    const button = taskButtons.get(win.id);
    button?.classList.remove('active');
    button?.setAttribute('aria-pressed', 'false');
    if (button && !keepTask) button.hidden = true;
    activateTopWindow();
    const trigger = previousFocus.get(win);
    if (restoreFocus) {
      if (trigger?.isConnected) trigger.focus();
      else if (button && !button.hidden) button.focus();
    }
  }


  const closeWindow = (win) => hideWindow(win);
  const minimizeWindow = (win) => hideWindow(win, { keepTask: true });

  function makeDraggable(win) {
    const bar = win.querySelector('.title-bar');
    let offsetX = 0;
    let offsetY = 0;
    let dragging = false;

    win.addEventListener('pointerdown', () => focusWindow(win));
    win.addEventListener('focusin', () => focusWindow(win));
    bar.addEventListener('pointerdown', (event) => {
      if (event.target.closest('.control-btn') || win.classList.contains('maximized')) return;
      dragging = true;
      const rect = win.getBoundingClientRect();
      win.style.transform = 'none';
      win.style.left = `${rect.left}px`;
      win.style.top = `${rect.top}px`;
      offsetX = event.clientX - rect.left;
      offsetY = event.clientY - rect.top;
      bar.setPointerCapture(event.pointerId);
    });
    bar.addEventListener('pointermove', (event) => {
      if (!dragging) return;
      const maxX = window.innerWidth - win.offsetWidth;
      const maxY = window.innerHeight - 72;
      const left = Math.min(Math.max(0, event.clientX - offsetX), Math.max(0, maxX));
      const top = Math.min(Math.max(0, event.clientY - offsetY), Math.max(0, maxY));
      win.style.left = `${left}px`;
      win.style.top = `${top}px`;
    });
    const stopDragging = () => { dragging = false; };
    bar.addEventListener('pointerup', stopDragging);
    bar.addEventListener('pointercancel', stopDragging);
  }

  document.querySelectorAll('.window').forEach(makeDraggable);
  document.querySelectorAll('.control-btn').forEach((button) => {
    button.addEventListener('click', (event) => {
      event.stopPropagation();
      const win = document.getElementById(button.dataset.target);
      if (button.dataset.action === 'maximize') {
        const maximized = win.classList.toggle('maximized');
        button.setAttribute('aria-pressed', String(maximized));
        button.setAttribute('aria-label', `${maximized ? 'Restore' : 'Maximize'} My Links`);
        focusWindow(win);
      } else if (button.dataset.action === 'minimize') {
        minimizeWindow(win);
      } else {
        closeWindow(win);
      }
    });
  });

  taskButtons.forEach((button, id) => {
    button.addEventListener('click', () => {
      const win = document.getElementById(id);
      if (win.hidden) openWindow(win);
      else if (button.classList.contains('active')) {
        hideWindow(win, { keepTask: true, restoreFocus: false });
        button.focus();
      }
      else {
        focusWindow(win);
        win.focus();
      }
    });
  });

  startBtn.addEventListener('click', (event) => {
    event.stopPropagation();
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
  document.addEventListener('click', (event) => {
    if (!startMenu.contains(event.target) && !startBtn.contains(event.target)) closeStartMenu();
  });
  document.getElementById('steamMenuBtn').addEventListener('click', () => {
    window.open('https://steamcommunity.com/id/ZaynOnFire', '_blank', 'noopener');
    closeStartMenu({ restoreFocus: true });
  });

  const iconsStrip = document.querySelector('.icons');
  const iconsHint = document.querySelector('.icons-hint');
  const iconsFade = document.querySelector('.icons-fade');
  iconsStrip.addEventListener('scroll', () => {
    const atEnd = iconsStrip.scrollLeft + iconsStrip.clientWidth >= iconsStrip.scrollWidth - 4;
    iconsHint.style.opacity = iconsStrip.scrollLeft > 12 ? '0' : '1';
    iconsFade.style.opacity = atEnd ? '0' : '1';
  }, { passive: true });

  const aboutDialog = document.getElementById('aboutDialog');
  const closeAbout = () => aboutDialog.close();
  document.getElementById('aboutBtn').addEventListener('click', () => {
    closeStartMenu();
    aboutDialog.showModal();
    document.getElementById('aboutOk').focus();
  });
  document.getElementById('aboutOk').addEventListener('click', closeAbout);
  document.getElementById('aboutClose').addEventListener('click', closeAbout);
  aboutDialog.addEventListener('click', (event) => {
    if (event.target === aboutDialog) closeAbout();
  });
  aboutDialog.addEventListener('close', () => startBtn.focus());

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    if (startMenu.style.display === 'block') {
      closeStartMenu({ restoreFocus: true });
      return;
    }
    const activeWindow = document.activeElement.closest?.('.window');
    if (activeWindow && activeWindow.id !== 'win') closeWindow(activeWindow);
  });

  return { openWindow, closeWindow, closeStartMenu };
}
