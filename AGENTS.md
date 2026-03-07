# Telegram UI

Custom web-based Telegram client for macOS with a carousel contact spinner and center-stage chat.

## Stack

- HTML / CSS / JavaScript (vanilla to start, framework later if needed)
- TDLib (Telegram Database Library) via WASM or Node bridge
- Node.js for local dev server and potential backend proxy

## Secrets (available as env vars)

- `TELEGRAM_API_ID` — Telegram app ID
- `TELEGRAM_API_HASH` — Telegram app hash

## Getting Started

```bash
npm install
npm run dev
```

## Project Structure

```
src/
  index.html      — main entry point
  css/             — styles
  js/              — application logic
    carousel.js    — contact carousel/spinner
    chat.js        — chat display and messaging
    auth.js        — Telegram authentication
    api.js         — TDLib wrapper
  assets/          — images, icons
```

## Design Principles

- Carousel is the primary navigation — large contact photos, smooth spinning
- Chat opens center-stage, immersive and distraction-free
- Keyboard-first: arrows to spin, Enter to open, Esc to close, Cmd+K to search
- Trackpad swipe gestures for carousel navigation
- Fast. No unnecessary dependencies.

## Deployment

- Target: VPS at 187.77.8.248 (nginx + pm2)
- Static files served by nginx, Node backend if needed for TDLib bridge

## Reference

- See SCOPE.md for full scope statement
- Telegram API docs: https://core.telegram.org/api
- TDLib: https://core.telegram.org/tdlib
