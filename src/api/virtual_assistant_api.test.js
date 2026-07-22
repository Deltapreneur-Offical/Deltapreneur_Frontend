import { describe, expect, it, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => {
  const apiInstance = {
    post: vi.fn(() => Promise.resolve({ data: { status: 'success', data: {} } })),
    get: vi.fn(() => Promise.resolve({ data: { status: 'success', data: {} } })),
    patch: vi.fn(() => Promise.resolve({ data: { status: 'success', data: {} } })),
    put: vi.fn(() => Promise.resolve({ data: { status: 'success', data: {} } })),
    delete: vi.fn(() => Promise.resolve({ data: { status: 'success', data: {} } })),
    defaults: { baseURL: 'http://127.0.0.1:8000' },
    interceptors: {
      request: { use: vi.fn() },
      response: { use: vi.fn() },
    },
  };

  return {
    apiInstance,
    createMock: vi.fn(() => apiInstance),
  };
});

vi.mock('axios', () => ({
  default: {
    create: mocks.createMock,
  },
}));

describe('virtualAssistantAPI', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();
    await import('./axios');
  });

  it('submits application', async () => {
    const { virtualAssistantAPI } = await import('./services');
    mocks.apiInstance.post.mockResolvedValue({ data: { status: 'success' } });
    await virtualAssistantAPI.submit({ name: 'Test' });
    expect(mocks.apiInstance.post).toHaveBeenCalledWith('/api/v1/virtual-assistant', { name: 'Test' });
  });

  it('fetches public list', async () => {
    const { virtualAssistantAPI } = await import('./services');
    mocks.apiInstance.get.mockResolvedValue({ data: { data: [], meta: { total: 0 } } });
    await virtualAssistantAPI.getPublicList({ page: 1 });
    expect(mocks.apiInstance.get).toHaveBeenCalledWith('/api/v1/virtual-assistant/published', { params: { page: 1 } });
  });

  it('fetches public profile', async () => {
    const { virtualAssistantAPI } = await import('./services');
    mocks.apiInstance.get.mockResolvedValue({ data: { id: '1' } });
    await virtualAssistantAPI.getPublicProfile('1');
    expect(mocks.apiInstance.get).toHaveBeenCalledWith('/api/v1/virtual-assistant/1/public');
  });

  it('fetches workspace profile', async () => {
    const { virtualAssistantAPI } = await import('./services');
    mocks.apiInstance.get.mockResolvedValue({ data: {} });
    await virtualAssistantAPI.getWorkspaceProfile();
    expect(mocks.apiInstance.get).toHaveBeenCalledWith('/api/v1/virtual-assistant/workspace/profile');
  });

  it('updates workspace profile', async () => {
    const { virtualAssistantAPI } = await import('./services');
    mocks.apiInstance.patch.mockResolvedValue({ data: {} });
    await virtualAssistantAPI.updateWorkspaceProfile({ bio: 'Updated' });
    expect(mocks.apiInstance.patch).toHaveBeenCalledWith('/api/v1/virtual-assistant/workspace/profile', { bio: 'Updated' });
  });

  it('fetches workspace roles', async () => {
    const { virtualAssistantAPI } = await import('./services');
    mocks.apiInstance.get.mockResolvedValue({ data: [] });
    await virtualAssistantAPI.getWorkspaceRoles();
    expect(mocks.apiInstance.get).toHaveBeenCalledWith('/api/v1/virtual-assistant/workspace/roles');
  });

  it('fetches workspace assignments', async () => {
    const { virtualAssistantAPI } = await import('./services');
    mocks.apiInstance.get.mockResolvedValue({ data: [] });
    await virtualAssistantAPI.getWorkspaceAssignments();
    expect(mocks.apiInstance.get).toHaveBeenCalledWith('/api/v1/virtual-assistant/workspace/assignments');
  });

  it('fetches workspace notifications', async () => {
    const { virtualAssistantAPI } = await import('./services');
    mocks.apiInstance.get.mockResolvedValue({ data: [] });
    await virtualAssistantAPI.getWorkspaceNotifications();
    expect(mocks.apiInstance.get).toHaveBeenCalledWith('/api/v1/virtual-assistant/workspace/notifications');
  });

  it('marks notification as read', async () => {
    const { virtualAssistantAPI } = await import('./services');
    mocks.apiInstance.post.mockResolvedValue({ data: {} });
    await virtualAssistantAPI.markNotificationRead('123');
    expect(mocks.apiInstance.post).toHaveBeenCalledWith('/api/v1/virtual-assistant/workspace/notifications/123/read');
  });
});
