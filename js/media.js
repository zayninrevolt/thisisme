import { initTwitchStatus } from './twitch-status.js';

function shouldOpenEmbed(event) {
  if (event.currentTarget.tagName !== 'A') return true;
  if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || event.button !== 0) return false;
  event.preventDefault();
  return true;
}

export function initMedia({ openWindow }) {
  const mediaWindow = document.getElementById('mpWin');
  const spotifyEmbed = mediaWindow.querySelector('.mp-embed');
  const openMediaPlayer = (event) => {
    if (!shouldOpenEmbed(event)) return;
    openWindow(mediaWindow);
    if (!spotifyEmbed.src) spotifyEmbed.src = spotifyEmbed.dataset.src;
  };
  document.getElementById('mpIconLink').addEventListener('click', openMediaPlayer);
  document.getElementById('mpMenuBtn').addEventListener('click', openMediaPlayer);
  document.getElementById('spotifyBtn').addEventListener('click', openMediaPlayer);

  const twitchWindow = document.getElementById('twWin');
  const twitchEmbed = twitchWindow.querySelector('.tw-embed');
  const ticker = document.getElementById('twTicker');
  const openTwitch = (event) => {
    if (!shouldOpenEmbed(event)) return;
    openWindow(twitchWindow);
    if (!twitchEmbed.src) twitchEmbed.src = twitchEmbed.dataset.src;
  };
  document.getElementById('twIconLink').addEventListener('click', openTwitch);
  document.getElementById('twMenuBtn').addEventListener('click', openTwitch);
  document.getElementById('twitchBtn').addEventListener('click', openTwitch);

  const gamesWindow = document.getElementById('gamesWin');
  const openGames = () => openWindow(gamesWindow);
  document.getElementById('gamesIconLink').addEventListener('click', openGames);
  document.getElementById('gamesMenuBtn').addEventListener('click', openGames);

  initTwitchStatus(ticker);
}
