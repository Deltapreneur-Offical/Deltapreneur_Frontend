import api from './axios';

// ─── Auth ────────────────────────────────────────────────────────────────────
export const authAPI = {
  register:           (data)          => api.post('/api/v1/auth/register', data),
  login:              (data)          => api.post('/api/v1/auth/login', data),
  forgotPassword:     (email)         => api.post('/api/v1/auth/forgot-password', { email }),
  resetPassword:      (token, password)=> api.post('/api/v1/auth/reset-password', { token, password }),
  changePassword:     (currentPassword, newPassword) =>
    api.post('/api/v1/auth/change-password', { currentPassword, newPassword }),
  setPassword:        (newPassword)   => api.post('/api/v1/auth/set-password', { newPassword }),
  sendOtp:            (email)         => api.post('/api/v1/auth/otp/send', { email }),
  verifyOtp:          (email, otp)    => api.post('/api/v1/auth/otp/verify', { email, otpCode: otp }),
  verifyEmail:        (token)         => api.get(`/api/v1/auth/verify-email?token=${token}`),
  resendVerification: (email)         => api.post('/api/v1/auth/resend-verification', { email }),
  refresh:            (refreshToken)  => api.post('/api/v1/auth/refresh', { refreshToken }),
  logout:             ()              => api.post('/api/v1/auth/logout'),
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
  getAll:       ()        => api.get('/api/v1/venture/all'),
  getMyVentures:()        => api.get('/api/v1/venture/my'),
  get:          (id)      => api.get(`/api/v1/venture/${id}`),
  create:       (data)    => api.post('/api/v1/venture/', data),
  update:       (id, data)=> api.put(`/api/v1/venture/${id}`, data),
  delete:       (id)      => api.delete(`/api/v1/venture/${id}`),
  // Add to ventureAPI:
  uploadImage: (id, file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post(`api/v1/venture/${id}/image`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
};

// ─── CoVenture ───────────────────────────────────────────────────────────────
export const coVentureAPI = {
  apply:                  (ventureId, data) => api.post(`/api/v1/coventure/${ventureId}`, data),
  checkApplied:           (ventureId)       => api.get(`/api/v1/coventure/${ventureId}/my-status`),
  getMyApplications:      ()                => api.get('/api/v1/coventure/my-applications'),
  getMyVentureApplications: (status)        => api.get('/api/v1/coventure/my-venture-applications', { params: { status } }),
  updateStatus:           (id, status)      => api.put(`/api/v1/coventure/${id}/status`, { status }),
};

// ─── Venture Auction ─────────────────────────────────────────────────────────
export const ventureAuctionAPI = {
  create:        (ventureId, data)    => api.post(`/api/v1/venture-auction/venture/${ventureId}`, data),
  verifyGstin:   (ventureId, gstin)   => api.post(`/api/v1/venture-auction/venture/${ventureId}/verify/gstin`, { gstin }),
  get:           (auctionId)          => api.get(`/api/v1/venture-auction/${auctionId}`),
  getByVenture:  (ventureId)          => api.get(`/api/v1/venture-auction/venture/${ventureId}`),
  placeBid:      (auctionId, amount)  => api.post(`/api/v1/venture-auction/${auctionId}/bid`, { amount }),
  reAuction:     (auctionId, data)    => api.post(`/api/v1/venture-auction/${auctionId}/re-auction`, data),
  close:         (auctionId)          => api.post(`/api/v1/venture-auction/${auctionId}/close`),
  getActive:     ()                   => api.get('/api/v1/venture-auction/active'),
  participationStatus: (auctionId)    => api.get(`/api/v1/venture-auction/${auctionId}/participation/status`),
  participationCreateOrder: (auctionId) => api.post(`/api/v1/venture-auction/${auctionId}/participation/create-order`),
  participationVerify: (auctionId, data) => api.post(`/api/v1/venture-auction/${auctionId}/participation/verify`, data),
  adminGetAll:   ()                   => api.get('/api/v1/venture-auction/admin/all'),
};
// ─── Community ───────────────────────────────────────────────────────────────
export const communityAPI = {
  getAll:           ()        => api.get('/api/v1/community/all'),
  getOne:           (id)      => api.get(`/api/v1/community/${id}`),
  update:           (id, data)=> api.put(`/api/v1/community/${id}`, data),
  linkedInAuthUrl:  ()        => api.get('/api/v1/community/linkedin/auth'),
  linkedInCallback: (code)    => api.get(`/api/v1/community/linkedin/callback?code=${code}`),
};



export const currencyAPI = {
  getSupported: () => api.get('/api/v1/currency/supported'),
  convert: (amount, to) =>
    api.get('/api/v1/currency/convert', { params: { amount, to } }),
};

export const domainAPI = {
  getAll:          ()        => api.get('/api/v1/domain/all'),
  getMyListings:   ()        => api.get('/api/v1/domain/my-listings'),
  getMyPurchases:  ()        => api.get('/api/v1/domain/my-purchases'),
  get:             (id)      => api.get(`/api/v1/domain/listings/${id}`),
  create:          (data)    => api.post('/api/v1/domain/listings', data),
  update:          (id, data)=> api.put(`/api/v1/domain/listings/${id}`, data),
  delete:          (id)      => api.delete(`/api/v1/domain/listings/${id}`),
  check: (name) => api.get(`/api/v1/domain/check?name=${name}`),
  createOrder: (id, data) => api.post(`/api/v1/domain/listings/${id}/purchase/create-order`, data),
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

/** Domain registration storefront (OpenProvider + Razorpay) — new domain checkout */
export const domainStorefrontAPI = {
  getConfig: () => api.get('/api/v1/domain/storefront/config'),
  createOrder: (body) => api.post('/api/v1/domain/storefront/order', body),
  verifyOrder: (body) => api.post('/api/v1/domain/storefront/order/verify', body),
  listOrders: () => api.get('/api/v1/domain/storefront/orders'),
  getOrder: (orderId) => api.get(`/api/v1/domain/storefront/orders/${orderId}`),
  retryProvision: (orderId) => api.post(`/api/v1/domain/storefront/orders/${orderId}/retry`),
};

export const analyticsAPI = {
  getVentureAnalytics: (id) => api.get(`/api/v1/analytics/venture/${id}`),
  getProfileAnalytics: ()    => api.get('/api/v1/analytics/profile'),
  getMyVentures:       ()    => api.get('/api/v1/venture/my'),
};

export const cocreationAPI = {
  getAll:          ()         => api.get('/api/v1/cocreation/all'),
  getMyListings:   ()         => api.get('/api/v1/cocreation/my-listings'),
  getMyPurchases:  ()         => api.get('/api/v1/cocreation/my-purchases'),
  get:             (id)       => api.get(`/api/v1/cocreation/${id}`),
  create:          (data)     => api.post('/api/v1/cocreation', data),
  update:          (id, data) => api.put(`/api/v1/cocreation/${id}`, data),
  delete:          (id)       => api.delete(`/api/v1/cocreation/${id}`),
  createOrder:     (id, data) => api.post(`/api/v1/cocreation/${id}/purchase/create-order`, data),
  verifyPayment:   (id, data) => api.post(`/api/v1/cocreation/${id}/purchase/verify`, data),
  handleFailure:   (id)       => api.post(`/api/v1/cocreation/${id}/purchase/failure`),
  confirmPurchase: (purchaseId) => api.post(`/api/v1/cocreation/purchase/${purchaseId}/confirm`),
  getAnalytics:    (id)       => api.get(`/api/v1/cocreation/${id}/analytics`),
  payCoBrotherHelp:    (purchaseId, data = {}) =>
    api.post(`/api/v1/cocreation/purchase/${purchaseId}/cobrother-help/create-order`, data),
  verifyCoBrotherHelp: (purchaseId, data) => api.post(`/api/v1/cocreation/purchase/${purchaseId}/cobrother-help/verify`, data),
  uploadImage: (id, formData) =>
    api.post(`/api/v1/cocreation/${id}/image`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
};

export const notificationAPI = {
  getRecent:     () => api.get('/api/v1/notifications/recent'),
  getAll:        () => api.get('/api/v1/notifications/all'),
  getUnreadCount:() => api.get('/api/v1/notifications/unread-count'),
  markAllRead:   () => api.put('/api/v1/notifications/mark-all-read'),
  markOneRead:   (id)=> api.put(`/api/v1/notifications/${id}/read`),
};


export const likeAPI = {
  toggle:     (type, id)       => api.post(`/api/v1/likes/${type}/${id}/toggle`),
  getStatus:  (type, id)       => api.get(`/api/v1/likes/${type}/${id}/status`),
  bulkStatus: (type, ids)      => api.post(`/api/v1/likes/${type}/bulk-status`, ids),
  whoLiked:   (type, id)       => api.get(`/api/v1/likes/${type}/${id}/who-liked`),
  myLiked:    (type)           => api.get(`/api/v1/likes/${type}/my-liked`),
};

export const adminAPI = {
  
  getCoVentures:        ()              => api.get('/api/v1/admin/coventures'),
  getVentures:          ()              => api.get('/api/v1/admin/ventures'),
  getDomains:           ()              => api.get('/api/v1/admin/domains'),
  getSoftwares:         ()              => api.get('/api/v1/admin/softwares'),
  getCommunities:       ()              => api.get('/api/v1/admin/communities'),
  getCoCreations:       ()              => api.get('/api/v1/admin/cocreations'),
  getCoBrotherRequests: ()              => api.get('/api/v1/admin/cobrother-requests'),
  getCoBrothers:        ()              => api.get('/api/v1/admin/cobrothers'),
  forward:              (data)          => api.post('/api/v1/admin/forward', data),
  listOfficialSoftware: (data)          => api.post('/api/v1/admin/cocreation', data),
  getAllAuctions: () => api.get('/api/v1/auction/admin/all'),
  getAddonOrders: () => api.get('/api/v1/addon/admin/all'),
  getAllVentureAuctions: () => api.get('/api/v1/venture-auction/admin/all'),
  takeDown:  (type, id, reason) => api.post(`/api/v1/admin/takedown`, { type, entityId: id, reason }),
  restore:   (type, id)         => api.post(`/api/v1/admin/restore`,  { type, entityId: id }),
  getDomainEnquiries: ()        => api.get('/api/v1/domain-enquiry/all'),
  toggleDomainHomepage:   (id)  => api.post(`/api/v1/admin/domain/${id}/toggle-homepage`),
  toggleVentureHomepage:  (id)  => api.post(`/api/v1/admin/venture/${id}/toggle-homepage`),
  toggleSoftwareHomepage: (id)  => api.post(`/api/v1/admin/software/${id}/toggle-homepage`),
  toggleFeatured: (type, id, featured) =>
    api.post('/api/v1/admin/feature', { type, entityId: String(id), featured: String(featured) }),
  getAllSoftwareAuctions:    ()         => api.get('/api/v1/software-auction/admin/all'),
  getPendingSoftwareAuctions:()         => api.get('/api/v1/software-auction/admin/pending'),
  approveSoftwareAuction:    (id)       => api.post(`/api/v1/software-auction/admin/${id}/approve`),
  rejectSoftwareAuction:     (id, r)    => api.post(`/api/v1/software-auction/admin/${id}/reject`, { reason: r }),

};

export const coBrotherAPI = {
  getRequests: ()                       => api.get('/api/v1/cobrother/requests'),
  respond:     (id, accepted, note)     => api.put(`/api/v1/cobrother/requests/${id}/respond`,
                                            { accepted, note }),
};

export const feeAPI = {
  getMyRequests:  ()        => api.get('/api/v1/fee/my-requests'),
  createOrder:    (id, data = {}) => api.post(`/api/v1/fee/requests/${id}/create-order`, data),
  verify:         (id, data)=> api.post(`/api/v1/fee/requests/${id}/verify`, data),
  cancel:         (id)      => api.post(`/api/v1/fee/requests/${id}/cancel`),
};

export const domainEnquiryAPI = {
  submit: (domainId, data) => api.post(`/api/v1/domain-enquiry/${domainId}`, data),
};

export const auctionAPI = {
  create:       (domainId, data)    => api.post(`/api/v1/auction/domain/${domainId}`, data),
  get:          (auctionId)         => api.get(`/api/v1/auction/${auctionId}`),
  getByDomain:  (domainId)          => api.get(`/api/v1/auction/domain/${domainId}`),
  placeBid:     (auctionId, amount) => api.post(`/api/v1/auction/${auctionId}/bid`, { amount }),
  reAuction:    (auctionId, data)   => api.post(`/api/v1/auction/${auctionId}/re-auction`, data),
  close:        (auctionId)         => api.post(`/api/v1/auction/${auctionId}/close`),
  adminGetAll:  ()                  => api.get('/api/v1/auction/admin/all'),
  getActive: () => api.get('/api/v1/auction/active'),
  participationStatus: (auctionId) => api.get(`/api/v1/auction/${auctionId}/participation/status`),
  participationCreateOrder: (auctionId) => api.post(`/api/v1/auction/${auctionId}/participation/create-order`),
  participationVerify: (auctionId, data) => api.post(`/api/v1/auction/${auctionId}/participation/verify`, data),
  getParticipationFees: () => api.get('/api/v1/auction/participation-fees'),
  updateParticipationFees: (data) => api.put('/api/v1/auction/admin/participation-fees', data),
};

export const feedbackAPI = {
  submit: (payload) => api.post('/api/v1/feedback', payload),
};

// ─── Community Auction ────────────────────────────────────────────────────────
export const communityAuctionAPI = {
  create:              (communityId, data) => api.post(`/api/v1/community-auction/?communityId=${communityId}`, data),
  createListingOrder:  (auctionId, data = {}) =>
    api.post(`/api/v1/community-auction/${auctionId}/listing-fee/create-order`, data),
  verifyListingFee:    (auctionId, data)   => api.post(`/api/v1/community-auction/${auctionId}/listing-fee/verify`, data),
  get:                 (auctionId)         => api.get(`/api/v1/community-auction/${auctionId}`),
  getByCommunity:      (communityId)       => api.get(`/api/v1/community-auction/community/${communityId}`),
  getActive:           ()                  => api.get('/api/v1/community-auction/active'),
  getMyAuctions:       ()                  => api.get('/api/v1/community-auction/my'),
  placeBid:            (auctionId, amount) => api.post(`/api/v1/community-auction/${auctionId}/bid`, { amount }),
  participationStatus: (auctionId)         => api.get(`/api/v1/community-auctions/${auctionId}/participation/status`),
  participationCreateOrder: (auctionId)    => api.post(`/api/v1/community-auctions/${auctionId}/participation/create-order`),
  participationVerify: (auctionId, data)   => api.post(`/api/v1/community-auctions/${auctionId}/participation/verify`, data),
  reAuction:           (auctionId, data)   => api.post(`/api/v1/community-auction/${auctionId}/re-auction`, data),
  close:               (auctionId)         => api.post(`/api/v1/community-auction/${auctionId}/close`),
  adminGetAll:         ()                  => api.get('/api/v1/community-auction/admin/all'),
};

export const softwareAuctionAPI = {
  create:          (softwareId, data)   => api.post(`/api/v1/software-auction/software/${softwareId}`, data),
  get:             (auctionId)          => api.get(`/api/v1/software-auction/${auctionId}`),
  getBySoftware:   (softwareId)         => api.get(`/api/v1/software-auction/software/${softwareId}`),
  placeBid:        (auctionId, amount)  => api.post(`/api/v1/software-auction/${auctionId}/bid`, { amount }),
  participationStatus: (auctionId)      => api.get(`/api/v1/software-auction/${auctionId}/participation/status`),
  participationCreateOrder: (auctionId) => api.post(`/api/v1/software-auction/${auctionId}/participation/create-order`),
  participationVerify: (auctionId, data)=> api.post(`/api/v1/software-auction/${auctionId}/participation/verify`, data),
  reAuction:       (auctionId, data)    => api.post(`/api/v1/software-auction/${auctionId}/re-auction`, data),
  close:           (auctionId)          => api.post(`/api/v1/software-auction/${auctionId}/close`),
  getActive:       ()                   => api.get('/api/v1/software-auction/active'),
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

export const joinUsAPI = {
  submit: (data) => api.post('/api/v1/becobrother', data),
};

// ─── Public APIs (no auth required) ──────────────────────────────────────────
export const publicAPI = {
  getDomains:   () => api.get('/public/api/v1/domains'),
  getVentures:  () => api.get('/public/api/v1/ventures'),
  getSoftwares: () => api.get('/public/api/v1/softwares'),
  getCommunities: () => api.get('/public/api/v1/communities'),
};
