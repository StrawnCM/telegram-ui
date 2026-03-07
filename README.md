# Telegram UI

A custom Telegram client for macOS — now wired to your live Telegram account via a local Node bridge.

## Live Telegram setup

1. Create a Telegram app at https://my.telegram.org and copy `api_id` and `api_hash`.
2. Export credentials in your shell:

```bash
export TELEGRAM_API_ID="<your_api_id>"
export TELEGRAM_API_HASH="<your_api_hash>"
```

3. Install dependencies and run dev mode:

```bash
npm install
npm run dev
```

4. Open the Vite URL (default `http://localhost:5173`) and sign in with:
   - Phone number
   - Login code from Telegram
   - Optional two-step verification password

The session is persisted locally in `server/.telegram-session`.

## Development

```bash
npm run dev
```

This starts:
- Frontend: Vite on `http://localhost:5173`
- Telegram bridge API: Express on `http://localhost:3001`

## Production Build

```bash
npm run build
```

Build artifacts are generated in `dist/`.
