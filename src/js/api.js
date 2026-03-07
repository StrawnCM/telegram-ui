const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3001/api';

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options
  });

  const payload = await response.json();
  if (!response.ok || payload.ok === false) {
    throw new Error(payload.error || 'Request failed');
  }

  return payload;
}

export const telegramApi = {
  getAuthStatus: () => request('/auth/status'),
  sendCode: (phoneNumber) => request('/auth/send-code', { method: 'POST', body: JSON.stringify({ phoneNumber }) }),
  verifyCode: (code) => request('/auth/verify-code', { method: 'POST', body: JSON.stringify({ code }) }),
  verifyPassword: (password) => request('/auth/verify-password', { method: 'POST', body: JSON.stringify({ password }) }),
  logout: () => request('/auth/logout', { method: 'POST' }),
  listChats: () => request('/chats'),
  getMessages: (chatId) => request(`/messages/${encodeURIComponent(chatId)}`),
  sendMessage: (chatId, text) => request(`/messages/${encodeURIComponent(chatId)}`, {
    method: 'POST',
    body: JSON.stringify({ text })
  })
};
