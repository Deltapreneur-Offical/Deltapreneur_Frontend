import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AdminPremiumTechTab from './AdminPremiumTechTab';

const mocks = vi.hoisted(() => ({
  getAdminConfig: vi.fn(),
  getAdminServices: vi.fn(),
  getAdminSubscriptions: vi.fn(),
  getRenewals: vi.fn(),
  getFailedProvisioning: vi.fn(),
  getServiceStatus: vi.fn(),
  getAdminLogs: vi.fn(),
  getAdminSubscriptionAccessDetails: vi.fn(),
  resendAccessEmail: vi.fn(),
}));

vi.mock('../../api/technologyServicesApi', () => ({
  technologyServicesAPI: {
    getAdminConfig: mocks.getAdminConfig,
    getAdminServices: mocks.getAdminServices,
    getAdminSubscriptions: mocks.getAdminSubscriptions,
    getRenewals: mocks.getRenewals,
    getFailedProvisioning: mocks.getFailedProvisioning,
    getServiceStatus: mocks.getServiceStatus,
    getAdminLogs: mocks.getAdminLogs,
    getAdminSubscriptionAccessDetails: mocks.getAdminSubscriptionAccessDetails,
    resendAccessEmail: mocks.resendAccessEmail,
  },
}));

const adminConfig = {
  global_margin_percent: 15,
  wallet_balance: 100,
  warning_threshold: 7,
  wallet_warning_active: false,
  configured: true,
  test_mode: true,
  allow_live: false,
  admin_message: '',
  total_services: 17,
  active_subscriptions_count: 2,
};

const subscriptions = [
  {
    id: 'sub-crm-1',
    customer_name: 'Kushi Ladagi',
    customer_email: 'kushi@test.local',
    service_name: 'CRM',
    service_slug: 'crm',
    plan_code: 'starter',
    billing_cycle: 'monthly',
    status: 'ACTIVE',
    payment_status: 'CAPTURED',
    provider_subscription_id: 'test_svc_514e5091e281',
    provider_order_id: null,
    provisioning_status: 'ACTIVE',
    has_access_information: true,
    access_email_sent: true,
    access_email_status: 'SENT',
    created_at: '2026-09-10T11:32:06Z',
  },
  {
    id: 'sub-crm-2',
    customer_name: 'Other Buyer',
    customer_email: 'other@test.local',
    service_name: 'CRM',
    service_slug: 'crm',
    plan_code: 'starter',
    billing_cycle: 'monthly',
    status: 'ACTIVE',
    payment_status: 'CAPTURED',
    provider_subscription_id: 'svc-other',
    provider_order_id: 'ORD-2',
    provisioning_status: 'ACTIVE',
    has_access_information: true,
    access_email_sent: false,
    access_email_status: 'PENDING',
    created_at: '2026-09-09T11:32:06Z',
  },
  {
    id: 'sub-crm-3',
    customer_name: 'Failed Buyer',
    customer_email: 'failed@test.local',
    service_name: 'CRM',
    service_slug: 'crm',
    plan_code: 'starter',
    billing_cycle: 'monthly',
    status: 'ACTIVE',
    payment_status: 'CAPTURED',
    provider_subscription_id: 'svc-failed',
    provider_order_id: null,
    provisioning_status: 'ACTIVE',
    has_access_information: true,
    access_email_sent: false,
    access_email_status: 'FAILED',
    created_at: '2026-09-08T11:32:06Z',
  },
];

describe('AdminPremiumTechTab reseller portal access', () => {
  beforeEach(() => {
    mocks.getAdminConfig.mockResolvedValue({ data: adminConfig });
    mocks.getAdminServices.mockResolvedValue({ data: [] });
    mocks.getAdminSubscriptions.mockResolvedValue({ data: subscriptions });
    mocks.getRenewals.mockResolvedValue({ data: [] });
    mocks.getFailedProvisioning.mockResolvedValue({ data: [] });
    mocks.getServiceStatus.mockResolvedValue({ data: { configured: true, status: 'ONLINE' } });
    mocks.getAdminLogs.mockResolvedValue({ data: [] });
    mocks.getAdminSubscriptionAccessDetails.mockResolvedValue({
      data: {
        subscription_id: 'sub-crm-1',
        customer_email: 'kushi@test.local',
        service_name: 'CRM',
        access_available: true,
        fields: [
          { key: 'email', label: 'Email', value: 'test+client@example.com', sensitive: false },
          { key: 'password', label: 'Password', value: 'crm-secret', sensitive: true },
        ],
      },
    });
    mocks.resendAccessEmail.mockResolvedValue({
      data: { success: true, message: 'Access email sent.', access_email_status: 'SENT' },
    });
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
    });
  });

  it('lets an admin find a purchase by customer email and view masked access details', async () => {
    const user = userEvent.setup();
    render(<AdminPremiumTechTab />);

    await user.click(await screen.findByRole('button', { name: /orders & subscriptions/i }));
    expect(await screen.findByText('kushi@test.local')).toBeInTheDocument();
    expect(screen.getByText('other@test.local')).toBeInTheDocument();
    expect(screen.getByText(/test_svc_514e5091e281/)).toBeInTheDocument();
    expect(screen.queryByText('crm-secret')).not.toBeInTheDocument();

    await user.type(screen.getByPlaceholderText('Search customer email'), 'kushi@test.local');
    expect(screen.getByText('kushi@test.local')).toBeInTheDocument();
    expect(screen.queryByText('other@test.local')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /view access details/i }));
    await waitFor(() => {
      expect(mocks.getAdminSubscriptionAccessDetails).toHaveBeenCalledWith('sub-crm-1');
    });
    expect(await screen.findByText('test+client@example.com')).toBeInTheDocument();
    expect(screen.getByText('••••••••')).toBeInTheDocument();
    expect(screen.queryByText('crm-secret')).not.toBeInTheDocument();

    await user.click(screen.getByTitle('Reveal'));
    expect(screen.getByText('crm-secret')).toBeInTheDocument();
    expect(window.localStorage.getItem('crm-secret')).toBeNull();
    expect(JSON.stringify(window.sessionStorage)).not.toContain('crm-secret');
  });

  it('shows Access Email status and lets an admin resend without exposing credentials', async () => {
    const user = userEvent.setup();
    window.alert = vi.fn();
    render(<AdminPremiumTechTab />);

    await user.click(await screen.findByRole('button', { name: /orders & subscriptions/i }));
    expect(await screen.findByText('Access Email')).toBeInTheDocument();
    expect(screen.getByText(/automatically sends the customer's service access credentials/i)).toBeInTheDocument();
    expect(screen.queryByText(/credentials are never sent automatically/i)).not.toBeInTheDocument();
    expect(screen.getByText('✓ Sent')).toBeInTheDocument();
    expect(screen.getByText('⏳ Pending')).toBeInTheDocument();
    expect(screen.getByText('⚠ Failed')).toBeInTheDocument();

    const resendButtons = screen.getAllByRole('button', { name: /resend access email/i });
    await user.click(resendButtons[0]);
    await waitFor(() => {
      expect(mocks.resendAccessEmail).toHaveBeenCalledWith('sub-crm-1');
    });
    expect(screen.queryByText('crm-secret')).not.toBeInTheDocument();
  });
});
