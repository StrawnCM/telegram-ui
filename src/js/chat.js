export function initChat({ panelEl, titleEl, messagesEl }) {
  let activeContact = null;

  function renderMessages() {
    messagesEl.innerHTML = '';
    if (!activeContact) {
      messagesEl.innerHTML = '<p>Select a contact from the carousel to open chat.</p>';
      return;
    }

    activeContact.messages.forEach((message) => {
      const bubble = document.createElement('div');
      bubble.className = `message ${message.direction}`;
      bubble.textContent = message.text;
      messagesEl.appendChild(bubble);
    });

    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function openChat(contact) {
    activeContact = contact;
    panelEl.setAttribute('aria-hidden', 'false');
    titleEl.textContent = contact.name;
    renderMessages();
  }

  function closeChat() {
    panelEl.setAttribute('aria-hidden', 'true');
    titleEl.textContent = 'Select a contact';
    activeContact = null;
    renderMessages();
  }

  function send(text) {
    if (!activeContact || !text.trim()) {
      return;
    }

    activeContact.messages.push({ direction: 'out', text: text.trim() });
    renderMessages();
  }

  renderMessages();

  return { openChat, closeChat, send, hasActive: () => Boolean(activeContact) };
}
