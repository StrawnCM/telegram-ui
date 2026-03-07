import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const sessionPath = path.join(__dirname, '.telegram-session');

const apiId = Number(process.env.TELEGRAM_API_ID);
const apiHash = process.env.TELEGRAM_API_HASH;

let client = null;
let connectingPromise = null;

const authState = {
  phoneNumber: null,
  phoneCodeHash: null
};

function ensureConfigured() {
  if (!apiId || !apiHash) {
    throw new Error('Missing TELEGRAM_API_ID / TELEGRAM_API_HASH env vars.');
  }
}

function clearAuthState() {
  authState.phoneNumber = null;
  authState.phoneCodeHash = null;
}

function getClient() {
  ensureConfigured();
  if (!client) {
    const sessionValue = fs.existsSync(sessionPath) ? fs.readFileSync(sessionPath, 'utf8') : '';
    const stringSession = new StringSession(sessionValue);
    client = new TelegramClient(stringSession, apiId, apiHash, { connectionRetries: 5 });
  }

  return client;
}

async function ensureConnected() {
  const telegramClient = getClient();
  if (!connectingPromise) {
    connectingPromise = telegramClient.connect().catch((error) => {
      connectingPromise = null;
      throw error;
    });
  }

  await connectingPromise;
  return telegramClient;
}

async function ensureAuthorizedClient() {
  const telegramClient = await ensureConnected();
  const authorized = await telegramClient.checkAuthorization();
  if (!authorized) {
    return null;
  }

  return telegramClient;
}

function saveSession() {
  if (client) {
    fs.writeFileSync(sessionPath, client.session.save(), 'utf8');
  }
}

function serializeMessage(message) {
  return {
    id: String(message.id),
    text: message.message || '',
    direction: message.out ? 'out' : 'in',
    date: message.date ? new Date(message.date * 1000).toISOString() : null
  };
}

async function resolvePeerFromDialogId(dialogId) {
  const telegramClient = getClient();
  return telegramClient.getEntity(BigInt(dialogId));
}

function sendError(res, statusCode, error) {
  const message = error instanceof Error ? error.message : String(error);
  res.status(statusCode).json({ ok: false, error: message });
}

const app = express();
app.use(cors());
app.use(express.json());

app.get('/api/auth/status', async (_req, res) => {
  try {
    const telegramClient = await ensureConnected();
    const authorized = await telegramClient.checkAuthorization();
    res.json({ ok: true, authorized });
  } catch (error) {
    sendError(res, 500, error);
  }
});

app.post('/api/auth/send-code', async (req, res) => {
  try {
    const { phoneNumber } = req.body;
    if (!phoneNumber?.trim()) {
      sendError(res, 400, 'phoneNumber is required.');
      return;
    }

    const telegramClient = await ensureConnected();
    const result = await telegramClient.sendCode({ apiId, apiHash }, phoneNumber.trim());
    authState.phoneNumber = phoneNumber.trim();
    authState.phoneCodeHash = result.phoneCodeHash;

    res.json({ ok: true, isCodeViaApp: result.isCodeViaApp });
  } catch (error) {
    sendError(res, 500, error);
  }
});

app.post('/api/auth/verify-code', async (req, res) => {
  try {
    const { code } = req.body;
    if (!code?.trim()) {
      sendError(res, 400, 'code is required.');
      return;
    }

    if (!authState.phoneNumber || !authState.phoneCodeHash) {
      sendError(res, 400, 'Request code first.');
      return;
    }

    const telegramClient = await ensureConnected();
    const user = await telegramClient.signInUser({ apiId, apiHash }, {
      phoneNumber: async () => authState.phoneNumber,
      phoneCode: async () => code.trim(),
      phoneCodeHash: async () => authState.phoneCodeHash,
      password: async () => '',
      onError: (error) => {
        throw error;
      }
    });

    clearAuthState();
    saveSession();
    res.json({ ok: true, user: { id: String(user.id), firstName: user.firstName, username: user.username } });
  } catch (error) {
    if (String(error?.message || '').includes('SESSION_PASSWORD_NEEDED')) {
      sendError(res, 401, 'Two-step verification password required.');
      return;
    }

    sendError(res, 500, error);
  }
});

app.post('/api/auth/verify-password', async (req, res) => {
  try {
    const { password } = req.body;
    if (!password) {
      sendError(res, 400, 'password is required.');
      return;
    }

    const telegramClient = await ensureConnected();
    const user = await telegramClient.signInWithPassword({ apiId, apiHash }, {
      password: async () => password,
      onError: (error) => {
        throw error;
      }
    });

    clearAuthState();
    saveSession();
    res.json({ ok: true, user: { id: String(user.id), firstName: user.firstName, username: user.username } });
  } catch (error) {
    sendError(res, 500, error);
  }
});

app.get('/api/chats', async (_req, res) => {
  try {
    const telegramClient = await ensureAuthorizedClient();
    if (!telegramClient) {
      sendError(res, 401, 'Unauthorized.');
      return;
    }

    const dialogs = await telegramClient.getDialogs({ limit: 30 });
    const chats = dialogs.map((dialog) => ({
      id: String(dialog.id),
      name: dialog.title || dialog.name || 'Unknown',
      unreadCount: dialog.unreadCount || 0
    }));

    res.json({ ok: true, chats });
  } catch (error) {
    sendError(res, 500, error);
  }
});

app.get('/api/messages/:chatId', async (req, res) => {
  try {
    const telegramClient = await ensureAuthorizedClient();
    if (!telegramClient) {
      sendError(res, 401, 'Unauthorized.');
      return;
    }

    const entity = await resolvePeerFromDialogId(req.params.chatId);
    const messages = await telegramClient.getMessages(entity, { limit: 40 });
    res.json({ ok: true, messages: messages.reverse().map(serializeMessage) });
  } catch (error) {
    sendError(res, 500, error);
  }
});

app.post('/api/messages/:chatId', async (req, res) => {
  try {
    const { text } = req.body;
    if (!text?.trim()) {
      sendError(res, 400, 'text is required.');
      return;
    }

    const telegramClient = await ensureAuthorizedClient();
    if (!telegramClient) {
      sendError(res, 401, 'Unauthorized.');
      return;
    }

    const entity = await resolvePeerFromDialogId(req.params.chatId);
    const result = await telegramClient.sendMessage(entity, { message: text.trim() });
    res.json({ ok: true, message: serializeMessage(result) });
  } catch (error) {
    sendError(res, 500, error);
  }
});

app.post('/api/auth/logout', async (_req, res) => {
  try {
    const telegramClient = await ensureConnected();
    await telegramClient.logOut();
    if (fs.existsSync(sessionPath)) {
      fs.unlinkSync(sessionPath);
    }

    client = null;
    connectingPromise = null;
    clearAuthState();
    res.json({ ok: true });
  } catch (error) {
    sendError(res, 500, error);
  }
});

const port = Number(process.env.PORT || 3001);
app.listen(port, () => {
  console.log(`Telegram bridge listening on http://localhost:${port}`);
});
