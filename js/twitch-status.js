const CHANNEL = 'zaynonfire';
const POLL_MS = 120_000;
const SESSION_KEY = 'twitch-live-announced';
const UPTIME = /^(?:\d+ (?:years?|months?|weeks?|days?|hours?|minutes?|seconds?))(?:,? (?:and )?\d+ (?:years?|months?|weeks?|days?|hours?|minutes?|seconds?))*$/i;

export function initTwitchStatus(ticker) {
  const notification = document.getElementById('twNotification');
  const message = document.getElementById('twNotificationText');
  const icon = document.getElementById('twIconLabel');
  const dismiss = document.getElementById('twNotificationDismiss');
  let announced = false;
  try { announced = window.sessionStorage.getItem(SESSION_KEY) === '1'; } catch (_) { /* Per-page fallback. */ }

  function remember(value) {
    announced = value;
    try { window.sessionStorage.setItem(SESSION_KEY, value ? '1' : '0'); } catch (_) { /* In-memory state remains usable. */ }
  }
  function hideNotification() {
    const hadFocus = notification.contains(document.activeElement);
    notification.hidden = true;
    if (hadFocus) document.getElementById('twIconLink').focus();
  }
  dismiss.addEventListener('click', hideNotification);

  async function text(endpoint) {
    const response = await fetch(`https://decapi.me/twitch/${endpoint}/${CHANNEL}`, {
      signal: AbortSignal.timeout(6000)
    });
    if (!response.ok) throw new Error('Twitch status request failed');
    return (await response.text()).trim();
  }
  async function check() {
    try {
      if (document.hidden) return;
      const uptime = await text('uptime');
      if (/^zaynonfire is offline[.!]?$/i.test(uptime)) {
        remember(false);
        icon.textContent = 'Twitch';
        ticker.textContent = `${CHANNEL} is offline right now. Follow on Twitch for the next stream.`;
        hideNotification();
        return;
      }
      // Only a recognised duration is evidence of a live stream, not an error or an empty body.
      if (!UPTIME.test(uptime)) throw new Error('Unrecognised Twitch status');
      let game = '';
      try { game = (await text('game')).slice(0, 160); } catch (_) { /* Live status is still useful without the category. */ }
      icon.textContent = 'Twitch 🔴';
      ticker.textContent = `LIVE NOW${game ? ` · playing ${game}` : ''} · up for ${uptime}`;
      if (!announced) {
        notification.hidden = false;
        message.textContent = `${CHANNEL} is live${game ? `, playing ${game}` : ''}!`;
        remember(true);
      }
    } catch (_) {
      // Unknown is not offline: do not re-arm an already announced stream after an outage.
      icon.textContent = 'Twitch';
      ticker.textContent = 'Twitch status unavailable. Open the player to check the stream.';
      hideNotification();
    } finally {
      // Schedule after completion to avoid overlapping requests. Hidden tabs skip the next check.
      window.setTimeout(check, POLL_MS);
    }
  }
  check();
}
