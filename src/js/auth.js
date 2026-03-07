import { telegramApi } from './api.js';

export function initAuth({ rootEl, onAuthorized, onError }) {
  let waitingForPassword = false;

  function setState(message) {
    rootEl.querySelector('[data-auth-state]').textContent = message;
  }

  async function refreshStatus() {
    try {
      const status = await telegramApi.getAuthStatus();
      if (status.authorized) {
        rootEl.hidden = true;
        onAuthorized();
      } else {
        rootEl.hidden = false;
      }
    } catch (error) {
      setState(error.message);
      rootEl.hidden = false;
      onError(error);
    }
  }

  async function submitPhone(event) {
    event.preventDefault();
    const phoneInput = rootEl.querySelector('#phoneInput');
    await telegramApi.sendCode(phoneInput.value.trim());
    setState('Code sent. Enter the code from Telegram.');
    rootEl.querySelector('#codeForm').hidden = false;
  }

  async function submitCode(event) {
    event.preventDefault();
    const code = rootEl.querySelector('#codeInput').value.trim();

    try {
      await telegramApi.verifyCode(code);
      rootEl.hidden = true;
      onAuthorized();
    } catch (error) {
      if (error.message.includes('Two-step verification')) {
        waitingForPassword = true;
        rootEl.querySelector('#passwordForm').hidden = false;
        setState('Two-step verification is enabled. Enter your Telegram password.');
        return;
      }

      throw error;
    }
  }

  async function submitPassword(event) {
    event.preventDefault();
    if (!waitingForPassword) {
      return;
    }

    const password = rootEl.querySelector('#passwordInput').value;
    await telegramApi.verifyPassword(password);
    rootEl.hidden = true;
    onAuthorized();
  }

  rootEl.querySelector('#phoneForm').addEventListener('submit', (event) => {
    submitPhone(event).catch((error) => {
      setState(error.message);
      onError(error);
    });
  });

  rootEl.querySelector('#codeForm').addEventListener('submit', (event) => {
    submitCode(event).catch((error) => {
      setState(error.message);
      onError(error);
    });
  });

  rootEl.querySelector('#passwordForm').addEventListener('submit', (event) => {
    submitPassword(event).catch((error) => {
      setState(error.message);
      onError(error);
    });
  });

  return { refreshStatus };
}
