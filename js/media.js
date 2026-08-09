const TWITCH_CHANNEL = 'zaynonfire';

export function initMedia({ openWindow }) {
  const mediaWindow = document.getElementById('mpWin');
  const spotifyEmbed = mediaWindow.querySelector('.mp-embed');
  const openMediaPlayer = () => {
    if (!spotifyEmbed.src) spotifyEmbed.src = spotifyEmbed.dataset.src;
    openWindow(mediaWindow);
  };
  document.getElementById('mpIconLink').addEventListener('click', openMediaPlayer);
  document.getElementById('mpMenuBtn').addEventListener('click', openMediaPlayer);
  document.getElementById('spotifyBtn').addEventListener('click', openMediaPlayer);

  const twitchWindow = document.getElementById('twWin');
  const twitchEmbed = twitchWindow.querySelector('.tw-embed');
  const ticker = document.getElementById('twTicker');
  const openTwitch = () => {
    if (!twitchEmbed.src) twitchEmbed.src = twitchEmbed.dataset.src;
    openWindow(twitchWindow);
  };
  document.getElementById('twIconLink').addEventListener('click', openTwitch);
  document.getElementById('twMenuBtn').addEventListener('click', openTwitch);
  document.getElementById('twitchBtn').addEventListener('click', openTwitch);

  const gamesWindow = document.getElementById('gamesWin');
  const openGames = () => openWindow(gamesWindow);
  document.getElementById('gamesIconLink').addEventListener('click', openGames);
  document.getElementById('gamesMenuBtn').addEventListener('click', openGames);

  checkTwitchStatus(ticker);
}

async function checkTwitchStatus(ticker) {
  try {
    const response = await fetch(`https://decapi.me/twitch/uptime/${TWITCH_CHANNEL}`, {
      signal: AbortSignal.timeout(6000)
    });
    const uptime = (await response.text()).trim();
    if (!response.ok || /offline|error|not found/i.test(uptime)) {
      ticker.textContent = `${TWITCH_CHANNEL} is offline right now — follow on Twitch so you don't miss the next stream ♪`;
      return;
    }
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
    ticker.textContent = `🔴 LIVE NOW${game ? ` — playing ${game}` : ''} — up for ${uptime} — get in here!`;
  } catch (_) {
    ticker.textContent = 'Twitch status unavailable — open the player to check the stream.';
  }
}
