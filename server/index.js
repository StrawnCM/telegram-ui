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
    connectingPromise = telegramClient.connect();
  }
  await connectingPromise;
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

const app = express();
app.use(cors());
app.use(express.json());

app.get('/api/auth/status', async (_req, res) => {
  try {
    const telegramClient = await ensureConnected();
    const authorized = await telegramClient.checkAuthorization();
    res.json({ ok: true, authorized });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.post('/api/auth/send-code', async (req, res) => {
  try {
    const { phoneNumber } = req.body;
    if (!phoneNumber) {
      res.status(400).json({ ok: false, error: 'phoneNumber is required.' });
      return;
    }

    const telegramClient = await ensureConnected();
    const result = await telegramClient.sendCode({ apiId, apiHash }, phoneNumber);
    authState.phoneNumber = phoneNumber;
    authState.phoneCodeHash = result.phoneCodeHash;

    res.json({ ok: true, phoneCodeHash: result.phoneCodeHash, isCodeViaApp: result.isCodeViaApp });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.post('/api/auth/verify-code', async (req, res) => {
  try {
    const { code } = req.body;
    if (!authState.phoneNumber || !authState.phoneCodeHash) {
      res.status(400).json({ ok: false, error: 'Request code first.' });
      return;
    }

    const telegramClient = await ensureConnected();
    const user = await telegramClient.signInUser({ apiId, apiHash }, {
      phoneNumber: async () => authState.phoneNumber,
      phoneCode: async () => code,
      phoneCodeHash: async () => authState.phoneCodeHash,
      password: async () => '',
      onError: (error) => {
        throw error;
      }
    });

    saveSession();
    res.json({ ok: true, user: { id: String(user.id), firstName: user.firstName, username: user.username } });
  } catch (error) {
    if (String(error?.message || '').includes('SESSION_PASSWORD_NEEDED')) {
      res.status(401).json({ ok: false, needsPassword: true, error: 'Two-step verification password required.' });
      return;
    }

    res.status(500).json({ ok: false, error: error.message });
  }
});

app.post('/api/auth/verify-password', async (req, res) => {
  try {
    const { password } = req.body;
    const telegramClient = await ensureConnected();
    const user = await telegramClient.signInWithPassword({ apiId, apiHash }, {
      password: async () => password,
      onError: (error) => {
        throw error;
      }
    });

    saveSession();
    res.json({ ok: true, user: { id: String(user.id), firstName: user.firstName, username: user.username } });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.get('/api/chats', async (_req, res) => {
  try {
    const telegramClient = await ensureConnected();
    const authorized = await telegramClient.checkAuthorization();
    if (!authorized) {
      res.status(401).json({ ok: false, error: 'Unauthorized.' });
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
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.get('/api/messages/:chatId', async (req, res) => {
  try {
    const telegramClient = await ensureConnected();
    const entity = await resolvePeerFromDialogId(req.params.chatId);
    const messages = await telegramClient.getMessages(entity, { limit: 40 });
    res.json({ ok: true, messages: messages.reverse().map(serializeMessage) });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.post('/api/messages/:chatId', async (req, res) => {
  try {
    const { text } = req.body;
    if (!text?.trim()) {
      res.status(400).json({ ok: false, error: 'text is required.' });
      return;
    }

    const telegramClient = await ensureConnected();
    const entity = await resolvePeerFromDialogId(req.params.chatId);
    const result = await telegramClient.sendMessage(entity, { message: text.trim() });
    res.json({ ok: true, message: serializeMessage(result) });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
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
    authState.phoneCodeHash = null;
    authState.phoneNumber = null;
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

const port = Number(process.env.PORT || 3001);
app.listen(port, () => {
  console.log(`Telegram bridge listening on http://localhost:${port}`);
});
