import api from './axios';

export const domainTransferAPI = {
  listSeller: () => api.get('/api/v1/domain/transfers/seller'),
  listBuyer: () => api.get('/api/v1/domain/transfers/buyer'),
  get: (id) => api.get(`/api/v1/domain/transfers/${id}`),
  timeline: (id) => api.get(`/api/v1/domain/transfers/${id}/timeline`),
  submitAuthCode: (id, data) => api.post(`/api/v1/domain/transfers/${id}/auth-code`, data),
  uploadProof: (id, file) => {
    const form = new FormData();
    form.append('file', file);
    return api.post(`/api/v1/domain/transfers/${id}/proof`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  chooseSelfTransfer: (id, data) =>
    api.post(`/api/v1/domain/transfers/${id}/choose-self-transfer`, data),
  requestAssistance: (id) => api.post(`/api/v1/domain/transfers/${id}/request-assistance`),
  getInstructions: (id) => api.get(`/api/v1/domain/transfers/${id}/instructions`),
  sendRevealOtp: (id) => api.post(`/api/v1/domain/transfers/${id}/reveal-otp/send`),
  verifyRevealOtp: (id, otp) =>
    api.post(`/api/v1/domain/transfers/${id}/reveal-otp/verify`, { otp }),
  markTransferStarted: (id) => api.post(`/api/v1/domain/transfers/${id}/transfer-started`),
  confirmTransfer: (id) => api.post(`/api/v1/domain/transfers/${id}/confirm`),
  openDispute: (id, formData) =>
    api.post(`/api/v1/domain/transfers/${id}/disputes`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
};

export const domainTransferAdminAPI = {
  list: (params) => api.get('/api/v1/admin/domain-transfers/', { params }),
  get: (id) => api.get(`/api/v1/admin/domain-transfers/${id}`),
  approvePayout: (id) => api.post(`/api/v1/admin/domain-transfers/${id}/approve-payout`),
  releasePayout: (id, data) => api.post(`/api/v1/admin/domain-transfers/${id}/release-payout`, data),
  refund: (id) => api.post(`/api/v1/admin/domain-transfers/${id}/refund`),
  resolveAdminReview: (id, data) =>
    api.post(`/api/v1/admin/domain-transfers/${id}/resolve-admin-review`, data),
  forceComplete: (id) => api.post(`/api/v1/admin/domain-transfers/${id}/force-complete`),
  syncWhois: (id) => api.post(`/api/v1/admin/domain-transfers/${id}/sync-whois`),
  sendPayoutProfileReminder: (id) =>
    api.post('/api/admin/seller-payout-reminder', { transactionId: id }),
  resolveDispute: (id, disputeId, data) =>
    api.post(`/api/v1/admin/domain-transfers/${id}/disputes/${disputeId}/resolve`, data),
  verifyPayoutProfile: (userId) =>
    api.post(`/api/v1/admin/domain-transfers/payout-profiles/${userId}/verify`),
};

export const payoutProfileAPI = {
  getMe: () => api.get('/api/v1/payout-profile/me'),
  upsert: (formData) =>
    api.post('/api/v1/payout-profile/me', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
};
