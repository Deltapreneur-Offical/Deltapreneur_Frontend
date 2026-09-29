import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DeltapreneurApplicationsAdminTab from './DeltapreneurApplicationsAdminTab';

const mocks = vi.hoisted(() => ({
  listApplications: vi.fn(),
  approveApplication: vi.fn(),
  rejectApplication: vi.fn(),
  generateInvitation: vi.fn(),
  revokeApplication: vi.fn(),
  reopenApplication: vi.fn(),
}));

vi.mock('../../api/services', () => ({
  deltapreneurAdminAPI: {
    listApplications: mocks.listApplications,
    approveApplication: mocks.approveApplication,
    rejectApplication: mocks.rejectApplication,
    generateInvitation: mocks.generateInvitation,
    revokeApplication: mocks.revokeApplication,
    reopenApplication: mocks.reopenApplication,
  },
}));

vi.mock('../../utils/money', () => ({
  formatInr: (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`,
}));

const pendingRow = {
  id: 'row-pending',
  status: 'PENDING_REVIEW',
  displayStatus: 'PENDING_REVIEW',
  fullName: 'Test Applicant',
  email: 'applicant@example.com',
  companyName: 'TestCo',
  annualRevenueInr: 400000,
  applicationDate: '2026-09-29T10:00:00Z',
  invitation: null,
};

const approvedRowWithLink = {
  id: 'row-approved',
  status: 'APPROVED',
  displayStatus: 'INVITATION_ACTIVE',
  fullName: 'Approved Applicant',
  email: 'approved@example.com',
  companyName: 'ApprovedCo',
  annualRevenueInr: 500000,
  applicationDate: '2026-09-28T10:00:00Z',
  invitation: {
    status: 'INVITATION_ACTIVE',
    expiresAt: '2026-10-06T10:00:00Z',
    usedAt: null,
    linkUrl: 'http://localhost:5173/creator/invite/tok-123',
  },
};

const onboardedRow = {
  ...pendingRow,
  id: 'row-onboarded',
  status: 'ONBOARDED',
  displayStatus: 'ONBOARDED',
  fullName: 'Onboarded Applicant',
  email: 'onboarded@example.com',
};

function mockRows(rows) {
  mocks.listApplications.mockResolvedValue({ data: { count: rows.length, data: rows } });
}

describe('DeltapreneurApplicationsAdminTab', () => {
  beforeEach(() => {
    Object.values(mocks).forEach((fn) => fn.mockReset());
  });

  it('renders pending rows with action buttons and hides link actions without a link', async () => {
    mockRows([pendingRow, onboardedRow]);
    render(<DeltapreneurApplicationsAdminTab />);

    await screen.findByText('Test Applicant');
    expect(screen.getByRole('button', { name: /Approve/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Reject/ })).toBeInTheDocument();
    // Revoke appears for onboarded rows only.
    expect(screen.getByRole('button', { name: /Revoke/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Copy Link/ })).not.toBeInTheDocument();
    // No link exists yet -> nothing to copy.
    expect(screen.queryByText(/Expires 0?6/)).not.toBeInTheDocument();
  });

  it('shows Copy Link / Copy Email Content only for approved apps with an active link', async () => {
    mockRows([approvedRowWithLink]);
    render(<DeltapreneurApplicationsAdminTab />);

    await screen.findByText('Approved Applicant');
    expect(screen.getByRole('button', { name: /Copy Link/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Copy Email Content/ })).toBeInTheDocument();
    // Under the strict gate the link is only copyable while APPROVED.
    expect(approvedRowWithLink.status).toBe('APPROVED');
  });

  it('shows a loading spinner and busy label while approving', async () => {
    mockRows([pendingRow]);
    let resolveApprove;
    mocks.approveApplication.mockImplementation(
      () => new Promise((resolve) => { resolveApprove = resolve; }),
    );

    render(<DeltapreneurApplicationsAdminTab />);
    const approveBtn = await screen.findByRole('button', { name: 'Approve' });
    await userEvent.click(approveBtn);

    // Busy state: label changes and the button is disabled while in flight.
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Approving…/ })).toBeDisabled();
    });
    resolveApprove({ data: { success: true } });
    await waitFor(() => {
      expect(mocks.listApplications.mock.calls.length).toBeGreaterThanOrEqual(2);
    });
  });

  it('reject modal renders through the AppOverlay portal with a submitting spinner and closes on Esc', async () => {
    mockRows([pendingRow]);
    mocks.rejectApplication.mockResolvedValue({ data: { success: true } });

    render(<DeltapreneurApplicationsAdminTab />);
    await screen.findByText('Test Applicant');

    await userEvent.click(screen.getByRole('button', { name: /Reject/ }));

    // Portaled to document.body — present in the document, outside the table.
    const dialog = await screen.findByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(screen.getByText(/Reject application — Test Applicant/)).toBeInTheDocument();

    // Submitting state on the confirm button.
    let resolveReject;
    mocks.rejectApplication.mockImplementation(
      () => new Promise((resolve) => { resolveReject = resolve; }),
    );
    await userEvent.click(screen.getByRole('button', { name: /Reject application/ }));
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Rejecting…/ })).toBeDisabled();
    });
    resolveReject({ data: { success: true } });
    await screen.findByText('Application rejected.');

    // Modal closed after success.
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    // Reopen and close via Escape.
    await userEvent.click(screen.getByRole('button', { name: /Reject/ }));
    await screen.findByRole('dialog');
    await userEvent.keyboard('{Escape}');
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  it('revoke modal requires an explicit link choice before confirming', async () => {
    mockRows([approvedRowWithLink]);
    let resolveRevoke;
    mocks.revokeApplication.mockImplementation(
      () => new Promise((resolve) => { resolveRevoke = resolve; }),
    );

    render(<DeltapreneurApplicationsAdminTab />);
    await screen.findByText('Approved Applicant');

    await userEvent.click(screen.getByRole('button', { name: /Revoke/ }));
    const dialog = await screen.findByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(screen.getByText(/Discard the link/)).toBeInTheDocument();
    expect(screen.getByText(/Keep the link/)).toBeInTheDocument();

    const confirmBtn = screen.getByRole('button', { name: /Revoke approval/ });
    const discardRadio = screen.getByRole('radio', { name: /Discard the link/ });
    const keepRadio = screen.getByRole('radio', { name: /Keep the link/ });

    // No default: confirm is disabled until a choice is made.
    expect(discardRadio).not.toBeChecked();
    expect(keepRadio).not.toBeChecked();
    expect(confirmBtn).toBeDisabled();
    expect(screen.getByText(/Choose what happens to the invitation link/)).toBeInTheDocument();

    // Choosing Keep enables confirm and sends discardActiveLink=false.
    await userEvent.click(keepRadio);
    expect(screen.queryByText(/Choose what happens to the invitation link/)).not.toBeInTheDocument();
    expect(confirmBtn).toBeEnabled();
    await userEvent.click(confirmBtn);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Revoking…/ })).toBeDisabled();
    });
    resolveRevoke({ data: { success: true } });
    await screen.findByText('Approval revoked — application is back in Pending Review.');
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
    expect(mocks.revokeApplication).toHaveBeenCalledWith('row-approved', false, null);
  });

  it('revoke with Discard sends discardActiveLink=true', async () => {
    mockRows([approvedRowWithLink]);
    mocks.revokeApplication.mockResolvedValue({ data: { success: true } });

    render(<DeltapreneurApplicationsAdminTab />);
    await screen.findByText('Approved Applicant');

    await userEvent.click(screen.getByRole('button', { name: /Revoke/ }));
    await screen.findByRole('dialog');
    await userEvent.click(screen.getByRole('radio', { name: /Discard the link/ }));
    await userEvent.click(screen.getByRole('button', { name: /Revoke approval/ }));

    await screen.findByText('Approval revoked — application is back in Pending Review.');
    expect(mocks.revokeApplication).toHaveBeenCalledWith('row-approved', true, null);
  });
});
