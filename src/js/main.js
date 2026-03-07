import { initCarousel } from './carousel.js';
import { initChat } from './chat.js';
import { initAuth } from './auth.js';
import { telegramApi } from './api.js';

const authPanel = document.getElementById('authPanel');
const carouselEl = document.getElementById('carousel');
const chatPanel = document.getElementById('chatPanel');
const chatTitle = document.getElementById('chatTitle');
const messagesEl = document.getElementById('chatMessages');
const closeBtn = document.getElementById('closeChat');
const prevBtn = document.getElementById('prevContact');
const nextBtn = document.getElementById('nextContact');
const composer = document.getElementById('composer');
const messageInput = document.getElementById('messageInput');

const chat = initChat({ panelEl: chatPanel, titleEl: chatTitle, messagesEl });
let carousel = null;

async function loadChats() {
  const payload = await telegramApi.listChats();
  const contacts = payload.chats.map((chatItem) => ({
    id: chatItem.id,
    name: chatItem.name,
    messages: []
  }));

  if (!contacts.length) {
    carouselEl.innerHTML = '<li class="contact active"><button type="button"><div class="name">No chats found</div></button></li>';
    return;
  }

  carousel = initCarousel({
    contacts,
    carouselEl,
    onSelect: (contact) => {
      chat.openChat(contact).catch((error) => console.error(error));
    }
  });
}

const auth = initAuth({
  rootEl: authPanel,
  onAuthorized: () => {
    loadChats().catch((error) => {
      console.error(error);
      window.alert(`Failed to load chats: ${error.message}`);
    });
  },
  onError: (error) => console.error('[auth]', error.message)
});

auth.refreshStatus();

prevBtn.addEventListener('click', () => carousel?.movePrev());
nextBtn.addEventListener('click', () => carousel?.moveNext());
closeBtn.addEventListener('click', chat.closeChat);

composer.addEventListener('submit', async (event) => {
  event.preventDefault();
  await chat.send(messageInput.value);
  messageInput.value = '';
  messageInput.focus();
});

document.addEventListener('keydown', (event) => {
  if (event.metaKey && event.key.toLowerCase() === 'k') {
    event.preventDefault();
    window.alert('Search overlay planned for next milestone.');
    return;
  }

  if (event.key === 'ArrowRight') {
    carousel?.moveNext();
  }

  if (event.key === 'ArrowLeft') {
    carousel?.movePrev();
  }

  if (event.key === 'Enter' && !chat.hasActive()) {
    const active = carousel?.getActive();
    if (active) {
      chat.openChat(active).catch((error) => console.error(error));
    }
  }

  if (event.key === 'Escape') {
    chat.closeChat();
  }
});
