export function initCarousel({ contacts, carouselEl, onSelect }) {
  let currentIndex = 0;
  let offset = 0;           // continuous pixel offset
  let velocity = 0;         // px/frame
  let animFrame = null;
  let isDragging = false;
  let dragStartX = 0;
  let dragStartOffset = 0;
  const ITEM_WIDTH = 110;   // px per contact slot
  const FRICTION = 0.94;
  const SNAP_STRENGTH = 0.08;
  const MIN_VELOCITY = 0.3;

  // Build DOM once
  function buildItems() {
    carouselEl.innerHTML = '';
    carouselEl.style.position = 'relative';
    carouselEl.style.overflow = 'hidden';
    carouselEl.style.cursor = 'grab';

    contacts.forEach((contact, index) => {
      const item = document.createElement('li');
      item.className = 'contact';
      item.style.position = 'absolute';
      item.style.top = '50%';
      item.style.transform = 'translateY(-50%)';
      item.style.width = ITEM_WIDTH + 'px';
      item.style.transition = 'none';
      item.dataset.index = index;

      const btn = document.createElement('button');
      btn.type = 'button';

      const initial = (contact.name || '?').trim().charAt(0).toUpperCase() || '?';
      const avatarWrapEl = document.createElement('div');
      avatarWrapEl.className = 'avatar-wrap';

      const avatarEl = document.createElement('div');
      avatarEl.className = 'avatar';

      if (contact.unreadCount > 0) {
        const unreadEl = document.createElement('span');
        unreadEl.className = 'unread-badge';
        unreadEl.textContent = contact.unreadCount > 99 ? '99+' : String(contact.unreadCount);
        unreadEl.setAttribute('aria-label', `${contact.unreadCount} unread messages`);
        avatarWrapEl.appendChild(unreadEl);
      }

      if (contact.avatarUrl) {
        const img = document.createElement('img');
        img.className = 'avatar-image';
        img.src = contact.avatarUrl;
        img.alt = `${contact.name} avatar`;
        img.loading = 'lazy';
        img.referrerPolicy = 'no-referrer';
        img.addEventListener('error', () => {
          img.remove();
          avatarEl.classList.add('avatar-fallback');
          avatarEl.textContent = initial;
        });

        avatarEl.appendChild(img);
      } else {
        avatarEl.classList.add('avatar-fallback');
        avatarEl.textContent = initial;
      }

      const nameEl = document.createElement('div');
      nameEl.className = 'name';
      nameEl.textContent = contact.name;

      avatarWrapEl.appendChild(avatarEl);
      btn.appendChild(avatarWrapEl);
      btn.appendChild(nameEl);

      btn.addEventListener('click', (e) => {
        if (Math.abs(velocity) > 2) { e.preventDefault(); return; }
        currentIndex = index;
        offset = currentIndex * ITEM_WIDTH;
        onSelect(contacts[currentIndex]);
        positionItems();
      });

      item.appendChild(btn);
      carouselEl.appendChild(item);
    });
  }

  function positionItems() {
    const containerW = carouselEl.offsetWidth;
    const centerX = containerW / 2;
    const items = carouselEl.querySelectorAll('.contact');

    items.forEach((item, i) => {
      const itemCenter = i * ITEM_WIDTH - offset + centerX;
      const distFromCenter = Math.abs(itemCenter - centerX);
      const norm = Math.min(distFromCenter / (containerW * 0.5), 1);

      // Scale & opacity based on distance from center
      const scale = 1.25 - norm * 0.5;
      const opacity = 1 - norm * 0.6;

      item.style.left = (itemCenter - ITEM_WIDTH / 2) + 'px';
      item.style.transform = `translateY(-50%) scale(${scale})`;
      item.style.opacity = opacity;
      item.style.zIndex = Math.round((1 - norm) * 100);

      // Active state
      const isActive = i === Math.round(offset / ITEM_WIDTH);
      item.classList.toggle('active', isActive);
    });
  }

  function physics() {
    if (isDragging) {
      positionItems();
      animFrame = requestAnimationFrame(physics);
      return;
    }

    // Apply friction
    velocity *= FRICTION;

    // Snap to nearest
    const targetOffset = Math.round(offset / ITEM_WIDTH) * ITEM_WIDTH;
    const snapForce = (targetOffset - offset) * SNAP_STRENGTH;
    velocity += snapForce;

    offset += velocity;

    // Clamp to bounds (with rubber band)
    const maxOffset = (contacts.length - 1) * ITEM_WIDTH;
    if (offset < -ITEM_WIDTH) {
      offset = -ITEM_WIDTH;
      velocity = Math.abs(velocity) * 0.3;
    }
    if (offset > maxOffset + ITEM_WIDTH) {
      offset = maxOffset + ITEM_WIDTH;
      velocity = -Math.abs(velocity) * 0.3;
    }

    // Update current index
    currentIndex = Math.max(0, Math.min(contacts.length - 1, Math.round(offset / ITEM_WIDTH)));

    positionItems();

    if (Math.abs(velocity) > MIN_VELOCITY || Math.abs(targetOffset - offset) > 0.5) {
      animFrame = requestAnimationFrame(physics);
    } else {
      // Settle
      offset = targetOffset;
      currentIndex = Math.round(offset / ITEM_WIDTH);
      positionItems();
      animFrame = null;
    }
  }

  function startPhysics() {
    if (!animFrame) animFrame = requestAnimationFrame(physics);
  }

  // ─── Mouse drag ───
  carouselEl.addEventListener('mousedown', (e) => {
    isDragging = true;
    dragStartX = e.clientX;
    dragStartOffset = offset;
    velocity = 0;
    carouselEl.style.cursor = 'grabbing';
    startPhysics();
  });

  window.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    const dx = dragStartX - e.clientX;
    offset = dragStartOffset + dx;
    velocity = dx * 0.15; // Feed velocity from drag speed
    dragStartX = e.clientX;
    dragStartOffset = offset;
  });

  window.addEventListener('mouseup', () => {
    if (!isDragging) return;
    isDragging = false;
    carouselEl.style.cursor = 'grab';
    startPhysics();
  });

  // ─── Touch drag ───
  carouselEl.addEventListener('touchstart', (e) => {
    isDragging = true;
    dragStartX = e.touches[0].clientX;
    dragStartOffset = offset;
    velocity = 0;
    startPhysics();
  }, { passive: true });

  carouselEl.addEventListener('touchmove', (e) => {
    if (!isDragging) return;
    const dx = dragStartX - e.touches[0].clientX;
    offset = dragStartOffset + dx;
    velocity = dx * 0.15;
    dragStartX = e.touches[0].clientX;
    dragStartOffset = offset;
  }, { passive: true });

  carouselEl.addEventListener('touchend', () => {
    isDragging = false;
    startPhysics();
  });

  // ─── Trackpad / mouse wheel ───
  carouselEl.addEventListener('wheel', (e) => {
    e.preventDefault();
    velocity += e.deltaX * 0.3 || e.deltaY * 0.3;
    startPhysics();
  }, { passive: false });

  // ─── Keyboard with momentum ───
  function flick(direction) {
    velocity += direction * 12;
    startPhysics();
  }

  // ─── Init ───
  buildItems();
  offset = 0;
  positionItems();

  return {
    moveNext: () => flick(1),
    movePrev: () => flick(-1),
    getActive: () => contacts[currentIndex],
    flick
  };
}
