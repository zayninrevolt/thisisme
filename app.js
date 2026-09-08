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
  document.getElementById('clockButton').setAttribute('aria-label', `Current time: ${now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`);
  document.getElementById('clockDate').textContent = now.toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}
updateClock();
setInterval(updateClock, 60_000);
const clockArea = document.getElementById('clockArea');
for (const event of ['mouseenter', 'focusin', 'click']) {
  clockArea.addEventListener(event, () => clockArea.classList.remove('date-dismissed'));
}
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') clockArea.classList.add('date-dismissed');
});

const statusText = document.getElementById('statusText');
document.querySelectorAll('#win .btn-98').forEach((button) => {
  const label = button.textContent.trim();
  button.addEventListener('mouseenter', () => { statusText.textContent = `Open ${label}`; });
  button.addEventListener('mouseleave', () => { statusText.textContent = 'Ready'; });
});

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const crtButton = document.getElementById('crtBtn');
function readStorage(storageName, key) {
  try {
    return window[storageName].getItem(key);
  } catch (_) {
    return null;
  }
}
function writeStorage(storageName, key, value) {
  try {
    window[storageName].setItem(key, value);
  } catch (_) {
    // The visual preference remains active for this page when storage is unavailable.
  }
}
function applyCrt(enabled) {
  document.body.classList.toggle('no-crt', !enabled);
  crtButton.textContent = `CRT effect: ${enabled ? 'On' : 'Off'}`;
}
const savedCrt = readStorage('localStorage', 'crt');
applyCrt(savedCrt ? savedCrt !== 'off' : !prefersReducedMotion);
crtButton.addEventListener('click', () => {
  const turnOn = document.body.classList.contains('no-crt');
  writeStorage('localStorage', 'crt', turnOn ? 'on' : 'off');
  applyCrt(turnOn);
  desktop.closeStartMenu({ restoreFocus: true });
});

const boot = document.getElementById('boot');
const dismissBoot = () => {
  const restoreFocus = boot.contains(document.activeElement);
  writeStorage('sessionStorage', 'booted', '1');
  if (boot.open) boot.close();
  boot.remove();
  if (restoreFocus) document.getElementById('win').focus();
};
if (prefersReducedMotion || readStorage('sessionStorage', 'booted')) {
  dismissBoot();
} else {
  // Show only after startup succeeds, with a keyboard-accessible escape route.
  document.getElementById('bootSkip').addEventListener('click', dismissBoot);
  boot.addEventListener('cancel', (event) => {
    event.preventDefault();
    dismissBoot();
  });
  setTimeout(dismissBoot, 1200);
  boot.showModal();
}
