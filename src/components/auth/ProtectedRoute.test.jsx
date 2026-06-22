import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

let authState = {
  user: null,
  loading: false,
  hasAccessToken: false,
};

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => authState,
}));

vi.mock('../common/PageLoader', () => ({
  default: ({ message = 'Loading' }) => <div>{message}</div>,
}));

vi.mock('framer-motion', () => ({
  AnimatePresence: ({ children }) => children,
}));

import {
  AdminGuard,
  CoBrotherGuard,
  ProfileGuard,
  ProtectedRoute,
} from './ProtectedRoute';

describe('ProtectedRoute guards', () => {
  beforeEach(() => {
    authState = {
      user: null,
      loading: false,
      hasAccessToken: false,
    };
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
});
