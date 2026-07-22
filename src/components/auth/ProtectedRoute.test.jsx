import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

const mocks = vi.hoisted(() => {
  const getMy = vi.fn();
  return {
    getMy,
  };
});

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => authState,
}));

vi.mock('../common/PageLoader', () => ({
  default: ({ message = 'Loading' }) => <div>{message}</div>,
}));

vi.mock('framer-motion', () => ({
  AnimatePresence: ({ children }) => children,
}));

vi.mock('../../api/services', () => ({
  virtualAssistantAPI: {
    getMy: mocks.getMy,
  },
}));

let authState = {
  user: null,
  loading: false,
  hasAccessToken: false,
};

import {
  AdminGuard,
  CoBrotherGuard,
  ProfileGuard,
  ProtectedRoute,
  VirtualAssistantApplicantGuard,
  VirtualAssistantGuard,
} from './ProtectedRoute';

describe('ProtectedRoute guards', () => {
  beforeEach(() => {
    authState = {
      user: null,
      loading: false,
      hasAccessToken: false,
    };
    mocks.getMy.mockReset();
  });

  function renderRoutes(secretElement) {
    render(
      <MemoryRouter initialEntries={['/secret']}>
        <Routes>
          <Route path="/secret" element={secretElement} />
          <Route path="/login" element={<div>Login page</div>} />
          <Route path="/dashboard" element={<div>Dashboard page</div>} />
          <Route path="/complete-profile" element={<div>Complete profile page</div>} />
          <Route path="/cobrother" element={<div>CoBrother page</div>} />
          <Route path="/virtual-assistant" element={<div>Apply as Virtual Assistant</div>} />
          <Route path="/virtual-assistant/journey" element={<div>My Application Journey</div>} />
        </Routes>
      </MemoryRouter>,
    );
  }

  it('redirects unauthenticated users to login', () => {
    renderRoutes(
      <ProtectedRoute>
        <div>Secret page</div>
      </ProtectedRoute>,
    );
    expect(screen.getByText('Login page')).toBeInTheDocument();
  });

  it('allows authenticated users through ProtectedRoute', () => {
    authState = {
      user: { role: 'USER', profileComplete: true },
      loading: false,
      hasAccessToken: true,
    };
    renderRoutes(
      <ProtectedRoute>
        <div>Secret page</div>
      </ProtectedRoute>,
    );
    expect(screen.getByText('Secret page')).toBeInTheDocument();
  });

  it('sends incomplete profiles to complete-profile', () => {
    authState = {
      user: { role: 'USER', profileComplete: false },
      loading: false,
      hasAccessToken: true,
    };
    renderRoutes(
      <ProfileGuard>
        <div>Secret page</div>
      </ProfileGuard>,
    );
    expect(screen.getByText('Complete profile page')).toBeInTheDocument();
  });

  it('sends non-admin users away from admin', () => {
    authState = {
      user: { role: 'USER', profileComplete: true },
      loading: false,
      hasAccessToken: true,
    };
    renderRoutes(
      <AdminGuard>
        <div>Admin secret</div>
      </AdminGuard>,
    );
    expect(screen.getByText('Dashboard page')).toBeInTheDocument();
  });

  it('allows CoBrother users through CoBrotherGuard', () => {
    authState = {
      user: { role: 'COBROTHER', profileComplete: true },
      loading: false,
      hasAccessToken: true,
    };
    renderRoutes(
      <CoBrotherGuard>
        <div>CoBrother secret</div>
      </CoBrotherGuard>,
    );
    expect(screen.getByText('CoBrother secret')).toBeInTheDocument();
  });

  it('sends non-applicant users away from VirtualAssistantApplicantGuard', async () => {
    authState = {
      user: { role: 'USER', profileComplete: true },
      loading: false,
      hasAccessToken: true,
    };
    mocks.getMy.mockResolvedValue({ data: { data: null } });
    renderRoutes(
      <VirtualAssistantApplicantGuard>
        <div>VA secret</div>
      </VirtualAssistantApplicantGuard>,
    );
    expect(await screen.findByText('Apply as Virtual Assistant', undefined, { timeout: 3000 })).toBeInTheDocument();
  });

  it('allows VA applicants through VirtualAssistantApplicantGuard', async () => {
    authState = {
      user: { role: 'USER', profileComplete: true },
      loading: false,
      hasAccessToken: true,
    };
    mocks.getMy.mockResolvedValue({ data: { data: { id: '1' } } });
    renderRoutes(
      <VirtualAssistantApplicantGuard>
        <div>VA secret</div>
      </VirtualAssistantApplicantGuard>,
    );
    expect(await screen.findByText('VA secret', undefined, { timeout: 3000 })).toBeInTheDocument();
  });

  it('sends non-applicant users away from VirtualAssistantGuard', async () => {
    authState = {
      user: { role: 'USER', profileComplete: true },
      loading: false,
      hasAccessToken: true,
    };
    mocks.getMy.mockResolvedValue({ data: { data: null } });
    renderRoutes(
      <VirtualAssistantGuard>
        <div>VA workspace</div>
      </VirtualAssistantGuard>,
    );
    expect(await screen.findByText('Apply as Virtual Assistant', undefined, { timeout: 3000 })).toBeInTheDocument();
  });

  it('sends locked applicants to journey from VirtualAssistantGuard', async () => {
    authState = {
      user: { role: 'USER', profileComplete: true },
      loading: false,
      hasAccessToken: true,
    };
    mocks.getMy.mockResolvedValue({ data: { data: { workspaceLocked: true } } });
    renderRoutes(
      <VirtualAssistantGuard>
        <div>VA workspace</div>
      </VirtualAssistantGuard>,
    );
    expect(await screen.findByText('My Application Journey', undefined, { timeout: 3000 })).toBeInTheDocument();
  });
});
