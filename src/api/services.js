import api from './axios';
// ─── Auth ────────────────────────────────────────────────────────────────────
export const authAPI = {
  register:           (data)          => api.post('/api/v1/auth/register', data),
  sendRegisterOtp:    (data)          => api.post('/api/v1/auth/register/otp/send', data),
  resendRegisterOtp:  (email, extra = {}) => api.post('/api/v1/auth/register/otp/resend', { email, ...extra }),
  verifyRegisterOtp:  (email, otp, extra = {}) => api.post('/api/v1/auth/register/otp/verify', { email, otpCode: otp, ...extra }),
  login:              (data)          => api.post('/api/v1/auth/login', data),
  forgotPassword:     (email, extra = {}) => api.post('/api/v1/auth/forgot-password', { email, ...extra }),
  resetPassword:      (token, password)=> api.post('/api/v1/auth/reset-password', { token, password }),
  changePassword:     (currentPassword, newPassword) =>
    api.post('/api/v1/auth/change-password', { currentPassword, newPassword }),
  setPassword:        (newPassword)   => api.post('/api/v1/auth/set-password', { newPassword }),
  sendOtp:            (email, extra = {}) => api.post('/api/v1/auth/otp/send', { email, ...extra }),
  verifyOtp:          (email, otp, extra = {}) => api.post('/api/v1/auth/otp/verify', { email, otpCode: otp, ...extra }),
  verifyEmail:        (token)         => api.get(`/api/v1/auth/verify-email?token=${token}`),
  resendVerification: (email, extra = {}) => api.post('/api/v1/auth/resend-verification', { email, ...extra }),
  refresh:            (refreshToken)  => api.post('/api/v1/auth/refresh', { refreshToken }),
  logout:             (refreshToken = '') => api.post('/api/v1/auth/logout', { refreshToken }),
  completeProfile:    (data)          => api.post('/api/v1/auth/complete-profile', data),
};

// ─── Profile ─────────────────────────────────────────────────────────────────
export const profileAPI = {
  // /auth/me is the active profile source; /profile/me is only a backend compat redirect.
  getMe:    ()     => api.get('/api/v1/auth/me'),
  complete: (data) => api.put('/api/v1/profile/complete', data),
};

// ─── Venture ─────────────────────────────────────────────────────────────────
export const ventureAPI = {
  getAll:       (params)  => api.get('/api/v1/venture/all', { params }),
  getMyVentures:()        => api.get('/api/v1/venture/my'),
  getMyPurchases: ()      => api.get('/api/v1/venture/my-purchases'),
  get:          (id)      => api.get(`/api/v1/venture/${id}`),
  create:       (data)    => api.post('/api/v1/venture/', data),
  update:       (id, data)=> api.put(`/api/v1/venture/${id}`, data),
  delete:       (id)      => api.delete(`/api/v1/venture/${id}`),
  uploadImage: (id, file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post(`/api/v1/venture/${id}/image`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  uploadVerificationDocument: (id, file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post(`/api/v1/venture/${id}/verification-documents`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  upsertCompanyProfile: (id, data) => api.put(`/api/v1/venture/${id}/company-profile`, data),
  verifyGstin: (ventureId, gstin) => api.post(`/api/v1/venture/${ventureId}/verify/gstin`, { gstin }),
  adminVerifyGstin: (ventureId, gstin) => api.post(`/api/v1/venture/admin/${ventureId}/verify-gstin`, { gstin }),
};

// Submits venture bids (ownership liquidation listings).
export const venturePitchAPI = {
  submit:         (ventureId, data) => api.post(`/api/v1/venture-pitches/venture/${ventureId}`, data),
  getPublicBids:  (ventureId)       => api.get(`/api/v1/venture-pitches/venture/${ventureId}/public-bids`),
  getMy:          ()                => api.get('/api/v1/venture-pitches/my'),
  getReceived:    ()                => api.get('/api/v1/venture-pitches/received'),
  getOne:         (id)               => api.get(`/api/v1/venture-pitches/${id}`),
  sellerAccept:   (id)               => api.post(`/api/v1/venture-pitches/${id}/seller/accept`),
  sellerReject:   (id)               => api.post(`/api/v1/venture-pitches/${id}/seller/reject`),
  sellerShortlist:(id)               => api.post(`/api/v1/venture-pitches/${id}/seller/shortlist`),
  withdraw:       (id)               => api.post(`/api/v1/venture-pitches/${id}/cancel`),
  finalizeDeal:   (ventureId, pitchId) =>
    api.post(`/api/v1/venture-pitches/venture/${ventureId}/finalize-deal`, { pitchId }),
  closeListing:   (ventureId)        => api.post(`/api/v1/venture-pitches/venture/${ventureId}/close`),
  adminGetAll:    ()                 => api.get('/api/v1/venture-pitches/admin/all'),
};

export const ventureDealAPI = {
  getMy:              ()     => api.get('/api/v1/venture-deals/my'),
  get:                (id)   => api.get(`/api/v1/venture-deals/${id}`),
  createPaymentOrder: (id, redeemPoints = false) => api.post(`/api/v1/venture-deals/${id}/payment/create-order`, {}, { params: { redeem_points: redeemPoints } }),
  verifyPayment:      (id, data) => api.post(`/api/v1/venture-deals/${id}/payment/verify`, data),
  adminGetAll:        ()     => api.get('/api/v1/venture-deals/admin/all'),
  adminApproveDeal:   (id)   => api.post(`/api/v1/venture-deals/${id}/admin/approve`),
  adminRejectDeal:    (id, reason) => api.post(`/api/v1/venture-deals/${id}/admin/reject`, { reason }),
  adminReleaseEscrow: (id)   => api.post(`/api/v1/venture-deals/admin/${id}/release-escrow`),
  adminRefund:        (id)   => api.post(`/api/v1/venture-deals/admin/${id}/refund`),
};

// ─── CoVenture (partnership applications) ────────────────────────────────────
export const coVentureAPI = {
  apply:                  (ventureId, data) => api.post(`/api/v1/coventure/${ventureId}`, data),
  checkApplied:           (ventureId)       => api.get(`/api/v1/coventure/${ventureId}/my-status`),
  getMyApplications:      ()                => api.get('/api/v1/coventure/my-applications'),
  getMyVentureApplications: (status)        => api.get('/api/v1/coventure/my-venture-applications', { params: { status } }),
  updateStatus:           (id, status)      => api.put(`/api/v1/coventure/${id}/status`, { status }),
  selectPartner:          (id)              => api.post(`/api/v1/coventure/${id}/select-partner`),
};

// ─── Creator (community profiles) ────────────────────────────────────────────
export const creatorAPI = {
  getAll:       (params)  => api.get('/api/v1/creator/all', { params }),
  getMy:            ()        => api.get('/api/v1/creator/my'),
  getOne:           (id)      => api.get(`/api/v1/creator/${id}`),
  update:           (id, data)=> api.put(`/api/v1/creator/${id}`, data),
  delete:           (id)      => api.delete(`/api/v1/creator/${id}`),
  linkedInAuthUrl:  ()        => api.get('/api/v1/community/linkedin/auth', {
    params: typeof window !== 'undefined' ? { return_origin: window.location.origin } : undefined,
  }),
  syncPhotoAuthUrl: ()        => api.get('/api/v1/community/linkedin/sync-photo/auth', {
    params: typeof window !== 'undefined' ? { return_origin: window.location.origin } : undefined,
  }),
};

export const creatorFollowAPI = {
  toggle:      (communityId) => api.post(`/api/v1/creator/${communityId}/follow/toggle`),
  getStatus:   (communityId) => api.get(`/api/v1/creator/${communityId}/follow/status`),
  bulkStatus:  (communityIds) => api.post('/api/v1/creator/follow/bulk-status', communityIds),
  bulkCounts:  (communityIds) => api.post('/api/v1/creator/follow/bulk-counts', communityIds),
};

/** @deprecated Use creatorAPI */
export const communityAPI = creatorAPI;



export const currencyAPI = {
  getSupported: () => api.get('/api/v1/currency/supported'),
  getRates: (forceRefresh = false) =>
    api.get('/api/v1/currency/rates', {
      params: forceRefresh ? { forceRefresh: true } : {},
    }),
  convert: (amount, to) =>
    api.get('/api/v1/currency/convert', { params: { amount, to } }),
  convertToInr: (amount, from) =>
    api.get('/api/v1/currency/convert-to-inr', { params: { amount, from } }),
};

export { domainTransferAPI, domainTransferAdminAPI, payoutProfileAPI } from './domainTransferAPI';

export const domainAPI = {
  getAll:          (params)  => api.get('/api/v1/domain/all', { params }),
  getMyListings:   ()        => api.get('/api/v1/domain/my-listings'),
  getMyPurchases:  ()        => api.get('/api/v1/domain/my-purchases'),
  get:             (id)      => api.get(`/api/v1/domain/listings/${id}`),
  create:          (data)    => api.post('/api/v1/domain/listings', data),
  update:          (id, data)=> api.put(`/api/v1/domain/listings/${id}`, data),
  delete:          (id)      => api.delete(`/api/v1/domain/listings/${id}`),
  check: (name, mode, config = {}) => api.get('/api/v1/domain/check', { params: { name, ...(mode ? { mode } : {}) }, ...config }),
  search: ({ query, mode, page = 1, pageSize = 50 }) =>
    api.get('/api/v1/domain/search', {
      params: {
        query,
        mode,
        page,
        page_size: pageSize,
      },
    }),
  searchTlds: ({ name, page = 1, pageSize = 50, chunk, chunkSize }, config = {}) =>
    api.get('/api/v1/domain/search-tlds', {
      params: {
        name,
        page,
        page_size: pageSize,
        ...(chunk != null ? { chunk, chunk_size: chunkSize ?? 12 } : {}),
      },
      ...config,
    }),
  searchPremium: ({ name }, config = {}) =>
    api.get('/api/v1/domain/search-premium', {
      params: { name },
      ...config,
    }),
  listTlds: () => api.get('/api/v1/domain/tlds'),
  createOrder: (id, data, redeemPoints = false) => api.post(`/api/v1/domain/listings/${id}/purchase/create-order`, data, { params: { redeem_points: redeemPoints } }),
  verifyPayment:   (id, data)=> api.post(`/api/v1/domain/listings/${id}/purchase/verify`, data),
  handleFailure:   (id)      => api.post(`/api/v1/domain/listings/${id}/purchase/failure`),
  verifyOptions: () => api.get('/api/v1/domain/verification/options'),
  verifyInit:  (id, method) => api.post(`/api/v1/domain/listings/${id}/verification/init`, { method }),
  verifyCheck: (id, token)   => api.post(`/api/v1/domain/listings/${id}/verification/check`, token ? { token } : {}),
  uploadImage: (id, formData) =>
    api.post(`/api/v1/domain/${id}/image`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
};

export const aiDomainsAPI = {
  generate: (idea, options = {}) =>
    api.post('/api/ai-domains/generate', { idea }, options),
};

/** Domain registration storefront (new domain checkout) */
export const domainStorefrontAPI = {
  getConfig: () => api.get('/api/v1/domain/storefront/config'),
  createOrder: (body, redeemPoints = false) => api.post('/api/v1/domain/storefront/order', body, { params: { redeem_points: redeemPoints } }),
  verifyOrder: (body) => api.post('/api/v1/domain/storefront/order/verify', body),
  listOrders: () => api.get('/api/v1/domain/storefront/orders'),
  getOrder: (orderId, { sync = true } = {}) =>
    api.get(`/api/v1/domain/storefront/orders/${orderId}`, { params: { sync } }),
  syncOrder: (orderId) => api.post(`/api/v1/domain/storefront/orders/${orderId}/sync`),
  resendVerification: (orderId) =>
    api.post(`/api/v1/domain/storefront/orders/${orderId}/resend-verification`),
  retryProvision: (orderId) => api.post(`/api/v1/domain/storefront/orders/${orderId}/retry`),
  updateNameservers: (orderId, nameservers) =>
    api.post(`/api/v1/domain/storefront/orders/${orderId}/nameservers`, { nameservers }),
  renewDomainDirect: (orderId, period = 1) =>
    api.post(`/api/v1/domain/storefront/orders/${orderId}/renew`, { period }),
  renewDomainPaymentOrder: (orderId, period = 1) =>
    api.post(`/api/v1/domain/storefront/orders/${orderId}/renew/payment`, { period }),
  getRenewDomainQuote: (orderId, period = 1) =>
    api.get(`/api/v1/domain/storefront/orders/${orderId}/renew/quote`, { params: { period } }),
  verifyRenewDomainPayment: (orderId, body) =>
    api.post(`/api/v1/domain/storefront/orders/${orderId}/renew/payment/verify`, body),
  initiateTransfer: (body) => api.post('/api/v1/domain/storefront/transfer', body),
  getTransferQuote: (body) => api.post('/api/v1/domain/storefront/transfer/quote', body),
  createTransferPaymentOrder: (body) => api.post('/api/v1/domain/storefront/transfer/payment', body),
  verifyTransferPayment: (body) => api.post('/api/v1/domain/storefront/transfer/payment/verify', body),
  purchaseEmail: (orderId, mailbox) =>
    api.post(`/api/v1/domain/storefront/orders/${orderId}/addons/email`, { mailbox }),
  createEmailAddonPayment: (orderId, body) =>
    api.post(`/api/v1/domain/storefront/orders/${orderId}/addons/email/payment`, body),
  verifyEmailAddonPayment: (orderId, body) =>
    api.post(`/api/v1/domain/storefront/orders/${orderId}/addons/email/payment/verify`, body),
  purchaseSSL: (orderId) =>
    api.post(`/api/v1/domain/storefront/orders/${orderId}/addons/ssl`),
  createSslAddonPayment: (orderId, body) =>
    api.post(`/api/v1/domain/storefront/orders/${orderId}/addons/ssl/payment`, body),
  verifySslAddonPayment: (orderId, body) =>
    api.post(`/api/v1/domain/storefront/orders/${orderId}/addons/ssl/payment/verify`, body),
  createRestoreAddonPayment: (orderId, body = {}) =>
    api.post(`/api/v1/domain/storefront/orders/${orderId}/addons/restore/payment`, body),
  verifyRestoreAddonPayment: (orderId, body) =>
    api.post(`/api/v1/domain/storefront/orders/${orderId}/addons/restore/payment/verify`, body),
  createEasydmarcAddonPayment: (orderId, body = {}) =>
    api.post(`/api/v1/domain/storefront/orders/${orderId}/addons/easydmarc/payment`, body),
  verifyEasydmarcAddonPayment: (orderId, body) =>
    api.post(`/api/v1/domain/storefront/orders/${orderId}/addons/easydmarc/payment/verify`, body),
  createSpamexpertsAddonPayment: (orderId, body = {}) =>
    api.post(`/api/v1/domain/storefront/orders/${orderId}/addons/spamexperts/payment`, body),
  verifySpamexpertsAddonPayment: (orderId, body) =>
    api.post(`/api/v1/domain/storefront/orders/${orderId}/addons/spamexperts/payment/verify`, body),
  initiateTransferOut: (body) =>
    api.post('/api/v1/domain/storefront/transfer/out', body),
  getDnsRecords: (orderId) =>
    api.get(`/api/v1/domain/storefront/orders/${orderId}/dns/records`),
  createDnsRecord: (orderId, body) =>
    api.post(`/api/v1/domain/storefront/orders/${orderId}/dns/records`, body),
  deleteDnsRecord: (orderId, recordId) =>
    api.delete(`/api/v1/domain/storefront/orders/${orderId}/dns/records/${recordId}`),
  toggleDnssec: (orderId, enabled) =>
    api.post(`/api/v1/domain/storefront/orders/${orderId}/dnssec`, { enabled }),
  updateMailboxPassword: (orderId, mailbox, password) =>
    api.post(`/api/v1/domain/storefront/orders/${orderId}/addons/email/password`, { mailbox, password }),
  getPrices: () => api.get('/api/v1/domain/storefront/prices'),
};

export const analyticsAPI = {
  getVentureAnalytics: (id) => api.get(`/api/v1/analytics/venture/${id}`),
  getProfileAnalytics: ()    => api.get('/api/v1/analytics/profile'),
  getMyVentures:       ()    => api.get('/api/v1/venture/my'),
};

export const technologyAPI = {
  getAll:          (params)   => api.get('/api/v1/technology/all', { params }),
  getMyListings:   ()         => api.get('/api/v1/technology/my-listings'),
  getMyPurchases:  ()         => api.get('/api/v1/technology/my-purchases'),
  getMySales:      ()         => api.get('/api/v1/technology/my-sales'),
  get:             (id)       => api.get(`/api/v1/technology/${id}`),
  create:          (data)     => api.post('/api/v1/technology', data),
  update:          (id, data) => api.put(`/api/v1/technology/${id}`, data),
  delete:          (id)       => api.delete(`/api/v1/technology/${id}`),
  createOrder:     (id, data, redeemPoints = false) => api.post(`/api/v1/technology/${id}/purchase/create-order`, data, { params: { redeem_points: redeemPoints } }),
  verifyPayment:   (id, data) => api.post(`/api/v1/technology/${id}/purchase/verify`, data),
  handleFailure:   (id)       => api.post(`/api/v1/technology/${id}/purchase/failure`),
  confirmPurchase: (purchaseId) => api.post(`/api/v1/technology/purchase/${purchaseId}/confirm`),
  getAnalytics:    (id)       => api.get(`/api/v1/technology/${id}/analytics`),
  payCoBrotherHelp:    (purchaseId, data = {}) =>
    api.post(`/api/v1/technology/purchase/${purchaseId}/cobrother-help/create-order`, data),
  verifyCoBrotherHelp: (purchaseId, data) => api.post(`/api/v1/technology/purchase/${purchaseId}/cobrother-help/verify`, data),
  uploadImage: (id, formData) =>
    api.post(`/api/v1/technology/${id}/image`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
};

/** @deprecated Use technologyAPI */
export const cocreationAPI = technologyAPI;

export const notificationAPI = {
  getRecent:     () => api.get('/api/v1/notifications/recent'),
  getAll:        () => api.get('/api/v1/notifications/all'),
  getUnreadCount:() => api.get('/api/v1/notifications/unread-count'),
  markAllRead:   () => api.put('/api/v1/notifications/mark-all-read'),
  markOneRead:   (id)=> api.put(`/api/v1/notifications/${id}/read`),
  deleteOne:     (id) => api.delete(`/api/v1/notifications/${id}`),
  deleteMultiple:(ids) => api.post('/api/v1/notifications/delete-multiple', { ids }),
  deleteAll:     () => api.delete('/api/v1/notifications/delete-all'),
};


export const likeAPI = {
  toggle:     (type, id)       => api.post(`/api/v1/likes/${type}/${id}/toggle`),
  getStatus:  (type, id)       => api.get(`/api/v1/likes/${type}/${id}/status`),
  bulkStatus: (type, ids)      => api.post(`/api/v1/likes/${type}/bulk-status`, ids),
  bulkCounts: (type, ids)      => api.post(`/api/v1/likes/${type}/bulk-counts`, ids),
  whoLiked:   (type, id)       => api.get(`/api/v1/likes/${type}/${id}/who-liked`),
  myLiked:    (type)           => api.get(`/api/v1/likes/${type}/my-liked`),
};

export const operationsAdminAPI = {
  list:   () => api.get('/api/v1/admin/operations-services'),
  create: (body) => api.post('/api/v1/admin/operations-services', body),
  update: (id, body) => api.put(`/api/v1/admin/operations-services/${id}`, body),
  remove: (id) => api.delete(`/api/v1/admin/operations-services/${id}`),
  listRequests: (params) => api.get('/api/v1/admin/operations-requests', { params }),
  patchRequestStatus: (id, body) => api.patch(`/api/v1/admin/operations-requests/${id}`, body),
  removeRequest: (id) => api.delete(`/api/v1/admin/operations-requests/${id}`),
};

export const operationsRequestAPI = {
  submit: (body) => api.post('/api/v1/operations/requests', body),
  listMine: () => api.get('/api/v1/operations/requests/me'),
};

export const operationsAPI = {
  list: (params) => api.get('/api/v1/operations/services', { params }),
  get:  (id) => api.get(`/api/v1/operations/services/${id}`),
};

export const adminAPI = {
  getDashboard:         ()              => api.get('/api/v1/admin/dashboard'),
  getVentures:          ()              => api.get('/api/v1/admin/ventures'),
  getDomains:           ()              => api.get('/api/v1/admin/domains'),
  getSoftwares:         ()              => api.get('/api/v1/admin/softwares'),
  getCommunities:       ()              => api.get('/api/v1/admin/communities'),
  getVirtualAssistantsForHomepage: () => api.get('/api/v1/admin/virtual-assistants'),
  getCreators:          ()              => api.get('/api/v1/admin/communities'),
  getTechnologies:      ()              => api.get('/api/v1/admin/technologies'),
  getCoBrotherRequests: ()              => api.get('/api/v1/admin/cobrother-requests'),
  getCoBrothers:        ()              => api.get('/api/v1/admin/cobrothers'),
  forward:              (data)          => api.post('/api/v1/admin/forward', data),
  getAllAuctions: () => api.get('/api/v1/auction/admin/all'),
  getAllCommunityAuctions: () => api.get('/api/v1/creator-auction/admin/all'),
  getAddonOrders: () => api.get('/api/v1/addon/admin/all'),
  takeDown:  (type, id, reason) => api.post(`/api/v1/admin/takedown`, { type, entityId: id, reason }),
  restore:   (type, id)         => api.post(`/api/v1/admin/restore`,  { type, entityId: id }),
  getDomainEnquiries: ()        => api.get('/api/v1/domain-enquiry/all'),
  getOpenProviderManagedAcquisitions: () =>
    api.get('/api/v1/openprovider-managed-acquisitions/all'),
  getTrackRecords: (params) => api.get('/api/v1/admin/track-records', { params }),
  syncTrackRecords: () => api.post('/api/v1/admin/track-records/sync'),
  getTrackRecordDetail: (id) => api.get(`/api/v1/admin/track-records/${id}`),
  markDomainVerified:   (id)    => api.post(`/api/v1/admin/domains/${id}/mark-verified`),
  markDomainUnverified: (id)    => api.post(`/api/v1/admin/domains/${id}/mark-unverified`),
  getDomainVerificationReview: (id) => api.get(`/api/v1/admin/domains/${id}/verification-review`),
  forwardCoBrother:     (id)    => api.post(`/api/v1/admin/domains/${id}/forward-to-cobrother`),
  approveDomainVerification:   (id) => api.post(`/api/v1/admin/domains/${id}/verification/approve`),
  rejectDomainVerification:    (id, reason) => api.post(`/api/v1/admin/domains/${id}/verification/reject`, { reason }),
  requestDomainVerificationInfo: (id, message) => api.post(`/api/v1/admin/domains/${id}/verification/request-info`, { message }),
  markTechnologyVerified: (id)  => api.post(`/api/v1/admin/softwares/${id}/mark-verified`),
  markTechnologyUnverified: (id) => api.post(`/api/v1/admin/softwares/${id}/mark-unverified`),
  domainVerifyInit:     (id, m) => api.post(`/api/v1/admin/domains/${id}/verification/init`, { method: m }),
  domainVerifyCheck:    (id, t) => api.post(`/api/v1/admin/domains/${id}/verification/check`, t ? { token: t } : {}),
  toggleDomainHomepage:   (id)  => api.post(`/api/v1/admin/domain/${id}/toggle-homepage`),
  toggleVentureHomepage:  (id)  => api.post(`/api/v1/admin/venture/${id}/toggle-homepage`),
  toggleSoftwareHomepage: (id)  => api.post(`/api/v1/admin/software/${id}/toggle-homepage`),
  toggleFeatured: (type, id, featured) =>
    api.post('/api/v1/admin/feature', { type, entityId: String(id), featured: String(featured) }),
  getAllSoftwareAuctions:    ()         => api.get('/api/v1/software-auction/admin/all'),
  getPendingSoftwareAuctions:()         => api.get('/api/v1/software-auction/admin/pending'),
  approveSoftwareAuction:    (id)       => api.post(`/api/v1/software-auction/admin/${id}/approve`),
  rejectSoftwareAuction:     (id, r)    => api.post(`/api/v1/software-auction/admin/${id}/reject`, { reason: r }),
  takeDownSoftwareAuction:   (id, r, d) => api.post(`/api/v1/software-auction/admin/${id}/take-down`, { reason: r, description: d }),
  getTakenDownSoftwareAuctions: ()      => api.get('/api/v1/software-auction/admin/taken-down'),
  approveAgainSoftwareAuction: (id)     => api.post(`/api/v1/software-auction/admin/${id}/approve-again`),
  getPendingVentures:        ()         => api.get('/api/v1/admin/ventures/pending'),
  approveVenture:            (id)       => api.post(`/api/v1/admin/ventures/${id}/approve`),
  rejectVenture:             (id, r)    => api.post(`/api/v1/admin/ventures/${id}/reject`, { reason: r }),
  approveVentureVerification:(id)       => api.post(`/api/v1/admin/ventures/${id}/verification/approve`),
  rejectVentureVerification: (id, r)    => api.post(`/api/v1/admin/ventures/${id}/verification/reject`, { reason: r }),
  getListingFeesAndCharges:  ()         => api.get('/api/v1/auction-fees/listing-fees-and-charges'),
  updateListingFeesAndCharges: (data)   => api.put('/api/v1/auction-fees/admin/listing-fees-and-charges', data),
  listBiddingBlocks:         ()         => api.get('/api/v1/admin/bidding-blocks'),
  unblacklistUser:           (userId)  => api.post(`/api/v1/admin/bidding-blocks/${userId}/unblacklist`),
  getDomainCommission:       ()         => api.get('/api/v1/admin/domain-registrations/commission'),
  updateDomainCommission:    (data)     => api.put('/api/v1/admin/domain-registrations/commission', data),
  getTechnologyTransfers: () => api.get('/api/v1/admin/technology-transfers/'),
  getTechnologyTransferDetail: (id) => api.get(`/api/v1/admin/technology-transfers/${id}`),
  approveTechnologyPayout: (id) => api.post(`/api/v1/admin/technology-transfers/${id}/approve-payout`),
  releaseTechnologyPayout: (id, data) => api.post(`/api/v1/admin/technology-transfers/${id}/release-payout`, data),
  permanentDeleteDomains: (ids) => api.post('/api/v1/admin/domains/permanent-delete', { ids }),
  getVirtualAssistants: (params = {}) => api.get('/api/v1/admin/virtual-assistant/applications', { params }),
  getVirtualAssistantCounts: () => api.get('/api/v1/admin/virtual-assistant/applications/counts'),
  getVirtualAssistant: (id) => api.get(`/api/v1/admin/virtual-assistant/applications/${id}`),
  getVirtualAssistantProfilePhotoUrl: (id) =>
    api.get(`/api/v1/admin/virtual-assistant/applications/${id}/profile-photo-url`),
  getVirtualAssistantRoles: (id) => api.get(`/api/v1/admin/virtual-assistant/applications/${id}/roles`),
  updateVirtualAssistantStatus: (id, status) => api.patch(`/api/v1/admin/virtual-assistant/applications/${id}/status`, { status }),
  updateVirtualAssistantRole: (appId, roleId, status, rejectionNote) => api.patch(`/api/v1/admin/virtual-assistant/applications/${appId}/roles/${roleId}`, { status, rejection_note: rejectionNote }),
  downloadVirtualAssistantResume: (id) => api.get(`/api/v1/admin/virtual-assistant/applications/${id}/resume`, { responseType: 'blob' }),
  directAddVirtualAssistant: (formData) => api.post('/api/v1/admin/virtual-assistant/applications', formData),
  updateVirtualAssistantPricing: (id, data) => api.patch(`/api/v1/admin/virtual-assistant/applications/${id}/pricing`, data),
  publishVirtualAssistant: (id, action) => api.patch(`/api/v1/admin/virtual-assistant/applications/${id}/publish`, { action }),
  getPublishedVirtualAssistants: () => api.get('/api/v1/virtual-assistant/published'),
  updateVirtualAssistantRoleCapacity: (roleId, data) => api.patch(`/api/v1/admin/virtual-assistant/application-roles/${roleId}/capacity`, data),
  getVirtualAssistantAssignments: (appId) => api.get(`/api/v1/admin/virtual-assistant/applications/${appId}/assignments`),
  createVirtualAssistantAssignment: (appId, data) => api.post(`/api/v1/admin/virtual-assistant/applications/${appId}/assignments`, data),
  updateVirtualAssistantAssignment: (assignmentId, data) => api.patch(`/api/v1/admin/virtual-assistant/assignments/${assignmentId}`, data),
  deleteVirtualAssistantAssignment: (assignmentId) => api.delete(`/api/v1/admin/virtual-assistant/assignments/${assignmentId}`),
  updateVirtualAssistantAdminNotes: (id, adminNotes) => api.patch(`/api/v1/admin/virtual-assistant/applications/${id}/admin-notes`, { adminNotes }),
  deleteVirtualAssistant: (id) => api.delete(`/api/v1/admin/virtual-assistant/applications/${id}`),
  getVirtualAssistantAuditLogs: (id) => api.get(`/api/v1/admin/virtual-assistant/applications/${id}/audit-logs`),
  getVirtualAssistantNotifications: (id) => api.get(`/api/v1/admin/virtual-assistant/applications/${id}/notifications`),
};

export const coBrotherAPI = {
  getRequests: ()                       => api.get('/api/v1/cobrother/requests'),
  respond:     (id, accepted, note)     => api.put(`/api/v1/cobrother/requests/${id}/respond`,
                                            { accepted, note }),
};

export const feeAPI = {
  getMyRequests:  ()        => api.get('/api/v1/fee/my-requests'),
  createOrder:    (id, data = {}, redeemPoints = false) => api.post(`/api/v1/fee/requests/${id}/create-order`, data, { params: { redeem_points: redeemPoints } }),
  verify:         (id, data)=> api.post(`/api/v1/fee/requests/${id}/verify`, data),
  cancel:         (id)      => api.post(`/api/v1/fee/requests/${id}/cancel`),
};

export const domainEnquiryAPI = {
  submit: (domainId, data) => api.post(`/api/v1/domain-enquiry/${domainId}`, data),
  updateStatus: (enquiryId, data) => api.put(`/api/v1/domain-enquiry/${enquiryId}/status`, data),
  markSold: (enquiryId, data = {}) => api.post(`/api/v1/domain-enquiry/${enquiryId}/mark-sold`, data),
  remove: (enquiryId, data = {}) => api.post(`/api/v1/domain-enquiry/${enquiryId}/remove`, data),
};

export const auctionAPI = {
  create:       (domainId, data)    => api.post(`/api/v1/auction/domain/${domainId}`, data),
  get:          (auctionId)         => api.get(`/api/v1/auction/${auctionId}`),
  getByDomain:  (domainId)          => api.get(`/api/v1/auction/domain/${domainId}`),
  placeBid:     (auctionId, payload) => api.post(`/api/v1/auction/${auctionId}/bid`, payload),
  reAuction:    (auctionId, data)   => api.post(`/api/v1/auction/${auctionId}/re-auction`, data),
  close:        (auctionId)         => api.post(`/api/v1/auction/${auctionId}/close`),
  adminGetAll:  ()                  => api.get('/api/v1/auction/admin/all'),
  getActive: () => api.get('/api/v1/auction/active'),
  getMyAuctions: () => api.get('/api/v1/auction/my'),
  getMyBids: () => api.get('/api/v1/auction/my-bids'),
  participationStatus: (auctionId) => api.get(`/api/v1/auction/${auctionId}/participation/status`),
  participationCreateOrder: (auctionId, redeemPoints = false) => api.post(`/api/v1/auction/${auctionId}/participation/create-order`, {}, { params: { redeem_points: redeemPoints } }),
  participationVerify: (auctionId, data) => api.post(`/api/v1/auction/${auctionId}/participation/verify`, data),
  getParticipationFees: () => api.get('/api/v1/auction/participation-fees'),
  updateParticipationFees: (data) => api.put('/api/v1/auction/admin/participation-fees', data),
  winnerPaymentCreateOrder: (auctionId, redeemPoints = false) => api.post(`/api/v1/payment/create-order/${auctionId}`, {}, { params: { redeem_points: redeemPoints } }),
  winnerPaymentVerify: (data) => api.post('/api/v1/payment/verify', data),
};

export const feedbackAPI = {
  submit: (payload) => api.post('/api/v1/feedback', payload),
};

// ─── Creator Auction ─────────────────────────────────────────────────────────
export const creatorAuctionAPI = {
  create:              (communityId, data) => api.post(`/api/v1/creator-auction?communityId=${communityId}`, data),
  get:                 (auctionId)         => api.get(`/api/v1/creator-auction/${auctionId}`),
  getByCommunity:      (communityId)       => api.get(`/api/v1/creator-auction/community/${communityId}`),
  getActive:           ()                  => api.get('/api/v1/creator-auction/active'),
  getMyAuctions:       ()                  => api.get('/api/v1/creator-auction/my'),
  getMyBids:           ()                  => api.get('/api/v1/creator-auction/my-bids'),
  placeBid:            (auctionId, payload) => api.post(`/api/v1/creator-auction/${auctionId}/bid`, payload),
  participationStatus: (auctionId)         => api.get(`/api/v1/creator-auctions/${auctionId}/participation/status`),
  participationCreateOrder: (auctionId, redeemPoints = false)    => api.post(`/api/v1/creator-auctions/${auctionId}/participation/create-order`, {}, { params: { redeem_points: redeemPoints } }),
  participationVerify: (auctionId, data)   => api.post(`/api/v1/creator-auctions/${auctionId}/participation/verify`, data),
  reAuction:           (auctionId, data)   => api.post(`/api/v1/creator-auction/${auctionId}/re-auction`, data),
  close:               (auctionId)         => api.post(`/api/v1/creator-auction/${auctionId}/close`),
  winnerPaymentCreateOrder: (auctionId, redeemPoints = false)    => api.post(`/api/v1/creator-auction/${auctionId}/winner-payment/create-order`, {}, { params: { redeem_points: redeemPoints } }),
  winnerPaymentVerify: (auctionId, data)   => api.post(`/api/v1/creator-auction/${auctionId}/winner-payment/verify`, data),
  adminGetAll:         ()                  => api.get('/api/v1/creator-auction/admin/all'),
};

/** @deprecated Use creatorAuctionAPI */
export const communityAuctionAPI = creatorAuctionAPI;

export const softwareAuctionAPI = {
  create:          (softwareId, data)   => api.post(`/api/v1/software-auction/software/${softwareId}`, data),
  get:             (auctionId)          => api.get(`/api/v1/software-auction/${auctionId}`),
  getBySoftware:   (softwareId)         => api.get(`/api/v1/software-auction/software/${softwareId}`),
  placeBid:        (auctionId, payload)  => api.post(`/api/v1/software-auction/${auctionId}/bid`, payload),
  participationStatus: (auctionId)      => api.get(`/api/v1/software-auction/${auctionId}/participation/status`),
  participationCreateOrder: (auctionId, redeemPoints = false) => api.post(`/api/v1/software-auction/${auctionId}/participation/create-order`, {}, { params: { redeem_points: redeemPoints } }),
  participationVerify: (auctionId, data)=> api.post(`/api/v1/software-auction/${auctionId}/participation/verify`, data),
  reAuction:       (auctionId, data)    => api.post(`/api/v1/software-auction/${auctionId}/re-auction`, data),
  close:           (auctionId)          => api.post(`/api/v1/software-auction/${auctionId}/close`),
  winnerPaymentCreateOrder: (auctionId, redeemPoints = false) => api.post(
    `/api/v1/software-auction/${auctionId}/winner-payment/create-order`,
    {},
    { params: { redeem_points: redeemPoints } },
  ),
  winnerPaymentVerify: (auctionId, data) => api.post(
    `/api/v1/software-auction/${auctionId}/winner-payment/verify`,
    data,
  ),
  getActive:       ()                   => api.get('/api/v1/software-auction/active'),
  getMyAuctions:   ()                   => api.get('/api/v1/software-auction/my'),
  getMyBids:       ()                   => api.get('/api/v1/software-auction/my-bids'),
  adminGetAll:     ()                   => api.get('/api/v1/software-auction/admin/all'),
  adminGetPending: ()                   => api.get('/api/v1/software-auction/admin/pending'),
  adminApprove:    (auctionId)          => api.post(`/api/v1/software-auction/admin/${auctionId}/approve`),
  adminReject:     (auctionId, reason)  => api.post(`/api/v1/software-auction/admin/${auctionId}/reject`, { reason }),
};
 


// ─── Meeting Schedule ─────────────────────────────────────────────────────────
export const meetingAPI = {
  request:       (auctionId, data)  => api.post(`/api/v1/meetings/auction/${auctionId}`, data),
  confirm:       (meetingId)        => api.put(`/api/v1/meetings/${meetingId}/confirm`),
  cancel:        (meetingId, reason)=> api.put(`/api/v1/meetings/${meetingId}/cancel`, reason ? { reason } : {}),
  complete:      (meetingId)        => api.put(`/api/v1/meetings/${meetingId}/complete`),
  getAllMine:     ()                 => api.get('/api/v1/meetings/all'),
  getMyRequests: ()                 => api.get('/api/v1/meetings/my-requests'),
  getMySchedule: ()                 => api.get('/api/v1/meetings/my-schedule'),
  getForAuction: (auctionId)        => api.get(`/api/v1/meetings/auction/${auctionId}`),
  adminGetAll:   ()                 => api.get('/api/v1/meetings/admin/all'),
};

export const cartAPI = {
  get:          ()           => api.get('/api/v1/cart'),
  getCount:     ()           => api.get('/api/v1/cart/count'),
  addItem:      (body)       => api.post('/api/v1/cart/items', body),
  updateItem:   (itemId, body) => api.patch(`/api/v1/cart/items/${itemId}`, body),
  removeItem:   (itemId)     => api.delete(`/api/v1/cart/items/${itemId}`),
  clear:        ()           => api.delete('/api/v1/cart'),
  checkout:     (body = {})  => api.post('/api/v1/cart/checkout', body),
  verifyCheckout: (body)     => api.post('/api/v1/cart/checkout/verify', body),
  cancelCheckout: (body)     => api.post('/api/v1/cart/checkout/cancel', body),
  confirmPremiumMarketplace: (body = {}) =>
    api.post('/api/v1/cart/premium-marketplace/confirm', body),
  confirmOpenProviderManaged: (body = {}) =>
    api.post('/api/v1/cart/openprovider-managed/confirm', body),
  updateDomainRegistrationPeriod: (periodYears, itemId) =>
    api.patch('/api/v1/cart/domain-registration-period', {
      periodYears,
      ...(itemId ? { itemId } : {}),
    }),
};

export const managedAcquisitionAPI = {
  listMine: () => api.get('/api/v1/managed-acquisitions/mine'),
};

export const openProviderManagedAcquisitionAPI = {
  listAll: () => api.get('/api/v1/openprovider-managed-acquisitions/all'),
  updateStatus: (id, data) =>
    api.put(`/api/v1/openprovider-managed-acquisitions/${id}/status`, data),
  remove: (id, data = {}) =>
    api.post(`/api/v1/openprovider-managed-acquisitions/${id}/remove`, data),
};

export const joinUsAPI = {
  submit: (data) => api.post('/api/v1/becobrother', data),
};

export const virtualAssistantAPI = {
  submit: (data) => api.post('/api/v1/virtual-assistant', data),
  getMy: () => api.get('/api/v1/virtual-assistant/me'),
  getWorkspaceProfile: () => api.get('/api/v1/virtual-assistant/workspace/profile'),
  updateWorkspaceProfile: (data) => api.patch('/api/v1/virtual-assistant/workspace/profile', data),
  getWorkspaceRoles: () => api.get('/api/v1/virtual-assistant/workspace/roles'),
  getWorkspaceAssignments: () => api.get('/api/v1/virtual-assistant/workspace/assignments'),
  getWorkspaceClients: () => api.get('/api/v1/virtual-assistant/workspace/clients'),
  getWorkspaceAvailability: () => api.get('/api/v1/virtual-assistant/workspace/availability'),
  updateWorkspaceAvailability: (availability) => api.patch('/api/v1/virtual-assistant/workspace/availability', { availability }),
  getWorkspaceNotifications: () => api.get('/api/v1/virtual-assistant/workspace/notifications'),
  markNotificationRead: (id) => api.post(`/api/v1/virtual-assistant/workspace/notifications/${id}/read`),
  getWorkspaceSettings: () => api.get('/api/v1/virtual-assistant/workspace/settings'),
  updateWorkspaceSettings: (data) => api.patch('/api/v1/virtual-assistant/workspace/settings', data),
  getPublicList: (params = {}) => api.get('/api/v1/virtual-assistant/published', { params }),
  getPublicProfile: (id) => api.get(`/api/v1/virtual-assistant/${id}/public`),
  getPublicProfilePhotoUrl: (id) => api.get(`/api/v1/virtual-assistant/${id}/profile-photo-url`),
  getWorkspaceProfilePhotoUrl: () => api.get('/api/v1/virtual-assistant/workspace/profile-photo-url'),
};
