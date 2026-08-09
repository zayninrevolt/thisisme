import { initDesktop } from './js/desktop.js';
import { initMedia } from './js/media.js';
import { initMinesweeper } from './js/minesweeper.js';
import { initOverwatch } from './js/overwatch.js';

const desktop = initDesktop();
initOverwatch(desktop);
initMinesweeper(desktop);
initMedia(desktop);

function updateClock() {
  const clock = document.getElementById('clock');
  const now = new Date();
  clock.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  clock.dateTime = now.toISOString();
  clock.setAttribute('aria-label', `Current time: ${now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`);
}
updateClock();
setInterval(updateClock, 60_000);

const statusText = document.getElementById('statusText');
document.querySelectorAll('#win .btn-98').forEach((button) => {
  const label = button.textContent.trim();
  button.addEventListener('mouseenter', () => { statusText.textContent = `Open ${label}`; });
  button.addEventListener('mouseleave', () => { statusText.textContent = 'Ready'; });
});

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const crtButton = document.getElementById('crtBtn');
function readStorage(storage, key) {
  try {
    return storage.getItem(key);
  } catch (_) {
    return null;
  }
}
function writeStorage(storage, key, value) {
  try {
    storage.setItem(key, value);
  } catch (_) {
    // The visual preference remains active for this page when storage is unavailable.
  }
}
function applyCrt(enabled) {
  document.body.classList.toggle('no-crt', !enabled);
  crtButton.textContent = `CRT effect: ${enabled ? 'On' : 'Off'}`;
}
const savedCrt = readStorage(localStorage, 'crt');
applyCrt(savedCrt ? savedCrt !== 'off' : !prefersReducedMotion);
crtButton.addEventListener('click', () => {
  const turnOn = document.body.classList.contains('no-crt');
  writeStorage(localStorage, 'crt', turnOn ? 'on' : 'off');
  applyCrt(turnOn);
  desktop.closeStartMenu({ restoreFocus: true });
});

const boot = document.getElementById('boot');
const dismissBoot = ({ animate = true } = {}) => {
  writeStorage(sessionStorage, 'booted', '1');
  if (!animate) {
    boot.remove();
    return;
  }
  boot.classList.add('hidden');
  setTimeout(() => boot.remove(), 600);
};
if (prefersReducedMotion || readStorage(sessionStorage, 'booted')) {
  dismissBoot({ animate: false });
} else {
  setTimeout(dismissBoot, 2400);
}
