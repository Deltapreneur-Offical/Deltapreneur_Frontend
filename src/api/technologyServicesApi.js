import api from './axios';

export const technologyServicesAPI = {
  /** List all technology services with optional filters (category, featured_only). */
  getServices: (params) => api.get('/api/v1/technology-services', { params }),

  /** Get single technology service detail by slug. */
  getServiceBySlug: (slug) => api.get(`/api/v1/technology-services/${slug}`),

  /** Purchase / provision a service subscription. */
  subscribe: (payload) => api.post('/api/v1/technology-services/subscribe', payload),

  /** Get user's active & past technology subscriptions. */
  getMySubscriptions: () => api.get('/api/v1/technology-services/subscriptions/me'),

  /** Get detailed subscription info. */
  getSubscriptionDetail: (id) => api.get(`/api/v1/technology-services/subscriptions/${id}`),

  /** Renew subscription. */
  renewSubscription: (id, payload) => api.post(`/api/v1/technology-services/subscriptions/${id}/renew`, payload),

  /** Upgrade subscription plan. */
  upgradeSubscription: (id, payload) => api.post(`/api/v1/technology-services/subscriptions/${id}/upgrade`, payload),

  /** Cancel subscription. */
  cancelSubscription: (id) => api.post(`/api/v1/technology-services/subscriptions/${id}/cancel`),

  /** Fetch invoices for a subscription. */
  getInvoices: (id) => api.get(`/api/v1/technology-services/subscriptions/${id}/invoices`),

  /** Admin Panel: Get Premium Tech config & wallet balance. */
  getAdminConfig: () => api.get('/api/v1/technology-services/admin/config'),

  /** Admin Panel: Update global margin & wallet. */
  updateAdminConfig: (payload) => api.post('/api/v1/technology-services/admin/config', payload),

  /** Admin Panel: Enable / disable product. */
  toggleService: (slug, payload) => api.post(`/api/v1/technology-services/admin/services/${slug}/toggle`, payload),

  /** Admin Panel: Fetch catalogue services with price overrides. */
  getAdminServices: () => api.get('/api/v1/technology-services/admin/services'),

  /** Admin Panel: Set per-product price override. */
  overridePrice: (slug, payload) => api.post(`/api/v1/technology-services/admin/services/${slug}/override-price`, payload),

  /** Admin Panel: Get live wallet balance. */
  getWalletBalance: () => api.get('/api/v1/technology-services/admin/wallet'),

  /** Admin Panel: Fetch orders history. */
  getOrders: () => api.get('/api/v1/technology-services/admin/orders'),

  /** Admin Panel: Fetch subscriptions history. Optional email filter. */
  getAdminSubscriptions: (params) =>
    api.get('/api/v1/technology-services/admin/subscriptions', { params }),

  /** Admin Panel: Explicitly retrieve decrypted access details for one subscription. */
  getAdminSubscriptionAccessDetails: (id) =>
    api.get(`/api/v1/technology-services/admin/subscriptions/${id}/access-details`),

  /** Admin Panel: Resend the existing access email. Does not reprovision or charge. */
  resendAccessEmail: (id) =>
    api.post(`/api/v1/technology-services/admin/subscriptions/${id}/resend-access-email`),

  /** Admin Panel: Fetch renewals list. */
  getRenewals: () => api.get('/api/v1/technology-services/admin/renewals'),

  /** Admin Panel: Fetch failed provisioning queue. */
  getFailedProvisioning: () => api.get('/api/v1/technology-services/admin/failed-provisioning'),

  /** Admin Panel: Retry failed provisioning item. */
  retryProvisioning: (id) => api.post(`/api/v1/technology-services/admin/failed-provisioning/${id}/retry`),

  /** Admin Panel: Get provider API service status & health. */
  getServiceStatus: () => api.get('/api/v1/technology-services/admin/service-status'),

  /** Admin Panel: Fetch provisioning and renewal audit logs. */
  getAdminLogs: () => api.get('/api/v1/technology-services/admin/logs'),
};
