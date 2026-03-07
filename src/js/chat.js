import { telegramApi } from './api.js';

export function initChat({ panelEl, titleEl, messagesEl }) {
  let activeContact = null;

  function renderMessages(messages) {
    messagesEl.innerHTML = '';
    if (!messages?.length) {
      messagesEl.innerHTML = '<p>No messages yet.</p>';
      return;
    }

    messages.forEach((message) => {
      const bubble = document.createElement('div');
      bubble.className = `message ${message.direction}`;
      bubble.textContent = message.text;
      messagesEl.appendChild(bubble);
    });

    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  async function openChat(contact) {
    activeContact = contact;
    panelEl.setAttribute('aria-hidden', 'false');
    titleEl.textContent = contact.name;
    const payload = await telegramApi.getMessages(contact.id);
    activeContact.messages = payload.messages;
    renderMessages(activeContact.messages);
  }

  function closeChat() {
    panelEl.setAttribute('aria-hidden', 'true');
    titleEl.textContent = 'Select a contact';
    activeContact = null;
    messagesEl.innerHTML = '<p>Select a contact from the carousel to open chat.</p>';
  }

  async function send(text) {
    if (!activeContact || !text.trim()) {
      return;
    }

    await telegramApi.sendMessage(activeContact.id, text.trim());
    const payload = await telegramApi.getMessages(activeContact.id);
    activeContact.messages = payload.messages;
    renderMessages(activeContact.messages);
  }

  closeChat();

  return { openChat, closeChat, send, hasActive: () => Boolean(activeContact) };
}
