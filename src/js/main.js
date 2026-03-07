import { contacts } from './data.js';
import { initCarousel } from './carousel.js';
import { initChat } from './chat.js';
import { initAuthStub } from './auth.js';
import { initTdlibStub } from './api.js';

const auth = initAuthStub();
const api = initTdlibStub();
console.info('[auth]', auth.message);
console.info('[api]', api.message);

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

const carousel = initCarousel({
  contacts,
  carouselEl,
  onSelect: (contact) => chat.openChat(contact)
});

prevBtn.addEventListener('click', carousel.movePrev);
nextBtn.addEventListener('click', carousel.moveNext);
closeBtn.addEventListener('click', chat.closeChat);

composer.addEventListener('submit', (event) => {
  event.preventDefault();
  chat.send(messageInput.value);
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
    carousel.moveNext();
  }

  if (event.key === 'ArrowLeft') {
    carousel.movePrev();
  }

  if (event.key === 'Enter' && !chat.hasActive()) {
    chat.openChat(carousel.getActive());
  }

  if (event.key === 'Escape') {
    chat.closeChat();
  }
});
