import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';
import i18n from '../i18n';
import VirtualAssistantMarketplacePage from '../pages/VirtualAssistantMarketplacePage';
import VirtualAssistantApplicationsAdminPage from '../pages/VirtualAssistantApplicationsAdminPage';
import VirtualAssistantPublicProfilePage from '../pages/VirtualAssistantPublicProfilePage';

const mockProfiles = [
  {
    id: '1',
    fullName: 'Test VA',
    email: 'test@example.com',
    phoneNumber: '9876543210',
    location: 'Mumbai',
    profilePhotoUrl: 'https://example.com/photo.jpg',
    shortBio: 'Experienced VA',
    roles: 'Administrative Support',
    skills: 'Excel,Communication',
    yearsExperience: '3-5 years',
    languagesKnown: 'English,Hindi',
    publicMonthlyPriceInr: 20000,
    pricingCurrency: 'INR',
    availability: 'available',
    applicationRoles: [{ roleName: 'Administrative Support', status: 'approved', maxClients: 3, currentClients: 1, isActive: true }],
  },
];

const mockApplications = [
  {
    id: '1',
    fullName: 'Test VA',
    email: 'test@example.com',
    overallStatus: 'pending',
    publishStatus: 'draft',
    workspaceLocked: true,
    applicationRoles: [{ roleName: 'Admin', status: 'pending' }],
  },
];

function renderWithProviders(ui, { route = '/' } = {}) {
  return render(
    <I18nextProvider i18n={i18n}>
      <MemoryRouter initialEntries={[route]}>
        {ui}
      </MemoryRouter>
    </I18nextProvider>
  );
}

vi.mock('../api/services', () => ({
  virtualAssistantAPI: {
    getPublicList: vi.fn(),
    getPublicProfile: vi.fn(),
    getApplications: vi.fn(),
  },
}));

import { virtualAssistantAPI } from '../api/services';

describe('VirtualAssistantMarketplacePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state initially', () => {
    virtualAssistantAPI.getPublicList.mockResolvedValue({
      data: { data: [], meta: { total: 0, total_pages: 1 } },
    });
    renderWithProviders(<VirtualAssistantMarketplacePage />);
    expect(screen.getByText(/loading/i)).toBeTruthy();
  });

  it('renders profiles when loaded', async () => {
    virtualAssistantAPI.getPublicList.mockResolvedValue({
      data: { data: mockProfiles, meta: { total: 1, total_pages: 1 } },
    });
    renderWithProviders(<VirtualAssistantMarketplacePage />);
    await waitFor(() => {
      expect(screen.getByText('Test VA')).toBeTruthy();
    });
    expect(screen.getByText('₹20,000/month')).toBeTruthy();
    expect(screen.getByText('Mumbai')).toBeTruthy();
  });

  it('renders error message on fetch failure', async () => {
    virtualAssistantAPI.getPublicList.mockRejectedValue(new Error('Network error'));
    renderWithProviders(<VirtualAssistantMarketplacePage />);
    await waitFor(() => {
      expect(screen.getByText(/failed to load/i)).toBeTruthy();
    });
  });

  it('does not render pending or rejected profiles', async () => {
    virtualAssistantAPI.getPublicList.mockResolvedValue({
      data: { data: [], meta: { total: 0, total_pages: 1 } },
    });
    renderWithProviders(<VirtualAssistantMarketplacePage />);
    await waitFor(() => {
      expect(screen.queryByText('Test VA')).toBeNull();
    });
  });
});

describe('VirtualAssistantApplicationsAdminPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders applications list', async () => {
    virtualAssistantAPI.getApplications.mockResolvedValue({
      data: { data: mockApplications, meta: { total: 1, total_pages: 1 } },
    });
    renderWithProviders(<VirtualAssistantApplicationsAdminPage />);
    await waitFor(() => {
      expect(screen.getByText('Test VA')).toBeTruthy();
    });
  });

  it('shows empty state when no applications', async () => {
    virtualAssistantAPI.getApplications.mockResolvedValue({
      data: { data: [], meta: { total: 0, total_pages: 1 } },
    });
    renderWithProviders(<VirtualAssistantApplicationsAdminPage />);
    await waitFor(() => {
      expect(screen.getByText(/no applications/i)).toBeTruthy();
    });
  });
});

describe('VirtualAssistantPublicProfilePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders public profile', async () => {
    virtualAssistantAPI.getPublicProfile.mockResolvedValue({
      data: mockProfiles[0],
    });
    renderWithProviders(<VirtualAssistantPublicProfilePage />, { route: '/virtual-assistant/1' });
    await waitFor(() => {
      expect(screen.getByText('Test VA')).toBeTruthy();
    });
    expect(screen.getByText('₹20,000/month')).toBeTruthy();
  });

  it('shows not found for invalid profile', async () => {
    virtualAssistantAPI.getPublicProfile.mockRejectedValue(new Error('Not found'));
    renderWithProviders(<VirtualAssistantPublicProfilePage />, { route: '/virtual-assistant/invalid' });
    await waitFor(() => {
      expect(screen.getByText(/not found/i)).toBeTruthy();
    });
  });
});
