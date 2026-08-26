import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';
import i18n from '../i18n';
import { LanguageProvider } from '../context/LanguageContext';
import { CurrencyProvider } from '../context/CurrencyContext';
import { CookieConsentProvider } from '../context/CookieConsentContext';
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
      <LanguageProvider>
        <CurrencyProvider>
          <CookieConsentProvider>
            <MemoryRouter initialEntries={[route]}>
              {ui}
            </MemoryRouter>
          </CookieConsentProvider>
        </CurrencyProvider>
      </LanguageProvider>
    </I18nextProvider>
  );
}

vi.mock('../api/services', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    virtualAssistantAPI: {
      getPublicList: vi.fn(),
      getPublicProfile: vi.fn(),
      getApplications: vi.fn(),
    },
    adminAPI: {
      ...actual.adminAPI,
      getVirtualAssistantCounts: vi.fn(),
      getVirtualAssistants: vi.fn(),
      deleteVirtualAssistant: vi.fn(),
    },
  };
});

import { virtualAssistantAPI, adminAPI } from '../api/services';

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
    expect(screen.getByText('20,000')).toBeTruthy();
    expect(screen.getByText('/mo')).toBeTruthy();
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
    adminAPI.getVirtualAssistantCounts.mockResolvedValue({
      data: { data: { all: 1, pending: 1, under_review: 0, partially_approved: 0, approved: 0, rejected: 0 } },
    });
    adminAPI.getVirtualAssistants.mockResolvedValue({
      data: { data: { items: mockApplications, total: 1, page: 1, pageSize: 20, totalPages: 1 } },
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

  // The page is now a legacy-URL redirect stub into the Operations detail flow.
  it('redirects legacy profile URLs to the operations detail flow', () => {
    renderWithProviders(
      <Routes>
        <Route path="/virtual-assistant/:id" element={<VirtualAssistantPublicProfilePage />} />
        <Route path="*" element={<div>redirect-target</div>} />
      </Routes>,
      { route: '/virtual-assistant/1' }
    );
    expect(screen.getByText('redirect-target')).toBeTruthy();
  });
});
