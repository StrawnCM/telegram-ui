# Telegram UI — Preliminary Scope Statement

## Project Overview

A custom web-based Telegram client for macOS that reimagines how conversations are navigated and displayed. The core interaction model replaces traditional sidebar contact lists with a visual carousel of contact avatars, placing the active conversation front and center.

## Vision

Telegram on desktop feels like email — lists, folders, tiny thumbnails. This project treats conversations as **experiences**, not items in a queue. Contacts are large, visual, and physical. Chat is immersive, not cramped.

## Core Features

### 1. Contact Carousel
- Full-screen horizontal carousel/spinner of chat contacts
- Large, high-quality profile images (not thumbnails)
- Smooth swipe/scroll/arrow-key navigation between contacts
- Visual indicators for unread messages, online status, typing
- Most recent / pinned contacts prioritized in carousel order
- Group chats represented with collage or custom artwork

### 2. Center-Stage Chat
- Active conversation displayed in the center of the viewport
- Chat opens inline when a contact is selected from the carousel
- Clean, distraction-free message view
- Media (photos, videos, files) displayed large and inline
- Reply, forward, react without leaving the view

### 3. Navigation & Input
- Keyboard-first: arrow keys to spin carousel, Enter to open chat, Esc to close
- Search overlay (Cmd+K) for quick contact/message lookup
- Message composition anchored at bottom of center chat area
- Swipe gestures (trackpad) to navigate carousel

## Technical Approach

- **Platform:** Web (HTML/CSS/JS), optimized for macOS desktop browsers
- **Telegram API:** TDLib (Telegram Database Library) via WebAssembly or a local bridge
- **Auth:** Telegram's standard phone number + 2FA flow
- **Rendering:** CSS3 transforms for carousel, no heavy framework required initially
- **Data:** Local session storage, Telegram cloud sync for messages

## Out of Scope (for now)

- Mobile / responsive layouts
- Voice/video calls
- Telegram bot management
- Channel browsing / discovery
- Sticker/GIF management UI
- Multi-account support

## Success Criteria

- Can authenticate with Telegram
- Carousel displays real contacts with profile photos
- Selecting a contact opens a readable chat history
- Can send and receive messages in real time
- Feels fast and visually distinct from any existing Telegram client

## Risks & Open Questions

- TDLib WASM build complexity — may need a Node bridge instead
- Profile photo resolution limits from Telegram API
- Performance with large contact lists (500+)
- Telegram ToS compliance for third-party clients
- Encryption: secret chats require device-specific key management

## Milestones

| Phase | Deliverable | Timeframe |
|-------|------------|-----------|
| 0 | Static HTML/CSS carousel prototype (mock data) | Week 1 |
| 1 | Telegram auth + real contact data | Week 2-3 |
| 2 | Chat display + message sending | Week 3-4 |
| 3 | Polish, keyboard nav, search | Week 5-6 |
