export function initCarousel({ contacts, carouselEl, onSelect }) {
  let currentIndex = 0;

  function render() {
    carouselEl.innerHTML = '';

    contacts.forEach((contact, index) => {
      const item = document.createElement('li');
      item.className = `contact ${index === currentIndex ? 'active' : ''}`;

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.dataset.index = String(index);
      btn.innerHTML = `
        <div class="avatar">${contact.name[0]}</div>
        <div class="name">${contact.name}</div>
      `;

      btn.addEventListener('click', () => {
        currentIndex = index;
        render();
        onSelect(contacts[currentIndex]);
      });

      item.appendChild(btn);
      carouselEl.appendChild(item);
    });
  }

  function move(delta) {
    currentIndex = (currentIndex + delta + contacts.length) % contacts.length;
    render();
  }

  render();

  return {
    moveNext: () => move(1),
    movePrev: () => move(-1),
    getActive: () => contacts[currentIndex]
  };
}
