# Shooting Ball for PewPlay

This directory contains the original static game adapted for the PewPlay game template. Open `index.html` to play.

`game.json` holds the game page text. `preview.png` and `cover.png` provide the page images. The PewPlay workflow checks pushes to `preview` and `main`. The game remains a draft until you remove `"draft": true` after reviewing it.

Game controls: Start the game, aim at the balls and shoot to collect points.

## Update (October 2026)
- Canvas rendered at devicePixelRatio; speeds and sizes scale with the screen and are frame-rate independent (same feel as the original at 1280×720 / 60 fps).
- Fixed collision bugs caused by removing items while iterating; the shockwave is now part of the main loop.
- Start / Game Over screens with best score (`shooting-ball:best`), pause button (P/Esc) and automatic pause when the page is hidden, optional sound effects with mute (`shooting-ball:muted`).
- New cover and screenshots.
