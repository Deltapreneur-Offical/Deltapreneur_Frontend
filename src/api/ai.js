import { API_BASE_URL } from '../config/urls';
import api from './axios';
import { readApiError } from '../utils/apiError';

function authHeaders() {
  if (typeof window === 'undefined') return {};
  const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function apiUrl(path) {
  const base = API_BASE_URL || '';
  return `${base}${path}`;
}

async function openStream(payload, signal) {
  return fetch(apiUrl('/api/v1/ai/chat/stream'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    credentials: 'include',
    body: JSON.stringify(payload),
    signal,
  });
}

export async function streamCoBrotherAI(payload, { signal, onEvent }) {
  let response;

  try {
    response = await openStream(payload, signal);
  } catch (error) {
    if (signal?.aborted) throw error;
    response = await openStream(payload, signal);
  }

  if (!response.ok || !response.body) {
    let message = 'Bro is unavailable right now.';
    try {
      const body = await response.json();
      message = readApiError({ response: { data: body, status: response.status } }, message, {
        context: 'ai',
      });
    } catch {
      // Keep default message when the error body is not JSON.
    }
    throw new Error(message);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const chunks = buffer.split('\n\n');
    buffer = chunks.pop() || '';

    for (const chunk of chunks) {
      const lines = chunk.split('\n');
      const event =
        lines.find((line) => line.startsWith('event:'))?.slice(6).trim() || 'message';
      const dataLine = lines.find((line) => line.startsWith('data:'));
      if (!dataLine) continue;

      try {
        onEvent(event, JSON.parse(dataLine.slice(5)));
      } catch {
        onEvent(event, { content: dataLine.slice(5) });
      }
    }
  }
}

export const cobrotherAIAPI = {
  getChats: () => api.get('/api/v1/ai/chats'),
  renameChat: (id, title) => api.patch(`/api/v1/ai/chats/${id}`, { title }),
  deleteChat: (id) => api.delete(`/api/v1/ai/chats/${id}`),
  saveFavorite: (payload) => api.post('/api/v1/ai/favorites', payload),
  getFavorites: () => api.get('/api/v1/ai/favorites'),
  deleteFavorite: (id) => api.delete(`/api/v1/ai/favorites/${id}`),
  getPreferences: () => api.get('/api/v1/ai/preferences'),
  updatePreferences: (payload) => api.put('/api/v1/ai/preferences', payload),
  searchMarketplace: (q) => api.get('/api/v1/ai/marketplace', { params: { q } }),
};
