import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Search, Eye, X, User, Mail, Phone, MapPin, Briefcase, Globe, Clock, IndianRupee, ChevronLeft, ChevronRight } from 'lucide-react';
import { adminAPI } from '../api/services';
import { unwrapApiData } from '../utils/apiResponse';
import { readApiError } from '../utils/apiError';
import { vaAdminModulePath } from '../utils/virtualAssistantAdminNav';
import VaProfilePhoto from '../components/virtual-assistant/VaProfilePhoto';

const STATUS_CONFIG = {
  published: { label: 'Published', className: 'bg-green-100 text-green-800' },
  draft: { label: 'Draft', className: 'bg-yellow-100 text-yellow-800' },
  unpublished: { label: 'Unpublished', className: 'bg-red-100 text-red-800' },
};

const PAGE_SIZE = 20;

const VirtualAssistantPublishedProfilesPage = ({ embedded = false }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  const fetchPublished = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = {
        status: 'approved',
        publish_status: 'published',
        page,
        page_size: PAGE_SIZE,
      };
      if (debouncedSearch) params.search = debouncedSearch;

      const response = await adminAPI.getVirtualAssistants(params);
      const result = unwrapApiData(response) || {};
      setProfiles(Array.isArray(result.items) ? result.items : []);
      setTotal(Number(result.total) || 0);
      setTotalPages(Number(result.totalPages) || 1);
    } catch (e) {
      console.error('Failed to load published profiles', e);
      setProfiles([]);
      setTotal(0);
      setTotalPages(1);
      setError(readApiError(e) || 'Failed to load published profiles. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch]);

  useEffect(() => {
    fetchPublished();
  }, [fetchPublished]);

  const openDetail = async (appId) => {
    setDetailLoading(true);
    setSelectedProfile(null);
    try {
      const response = await adminAPI.getVirtualAssistant(appId);
      const payload = unwrapApiData(response) || response?.data || {};
      setSelectedProfile(payload);
    } catch (e) {
      console.error('Failed to load profile detail', e);
    } finally {
      setDetailLoading(false);
    }
  };

  return (
    <div>
      {!embedded && (
      <div className="mb-4 flex items-center gap-3">
        <button
          onClick={() => navigate(vaAdminModulePath('applications'))}
          className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          <ChevronLeft size={16} />
          Back
        </button>
        <h2 className="text-lg font-semibold text-gray-900">Published Profiles</h2>
      </div>
      )}
      <div className="mb-4">
        <div className="relative">
          <Search size={18} className="absolute left-3 top-3 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search published profiles by name, email, or role..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading published profiles...</div>
      ) : error ? (
        <div className="text-center py-12">
          <p className="text-red-600">{error}</p>
          <button
            type="button"
            onClick={fetchPublished}
            className="mt-4 inline-flex items-center px-4 py-2 text-sm font-medium text-purple-700 bg-purple-50 rounded-lg hover:bg-purple-100"
          >
            Retry
          </button>
        </div>
      ) : profiles.length === 0 ? (
        <div className="text-center py-12 text-gray-500">No published profiles found.</div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Virtual Assistant</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Email</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Roles</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Public Price</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Status</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {profiles.map((profile) => (
                  <tr key={profile.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <VaProfilePhoto
                          source={profile}
                          applicationId={profile.id}
                          refreshScope="admin"
                          alt=""
                          className="w-10 h-10 rounded-full object-cover"
                        fallbackClassName="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center"
                        fallback="icon"
                        fallbackIcon={User}
                        fallbackIconSize={18}
                        fallbackIconClassName="text-purple-600"
                        />
                        <div>
                          <p className="font-semibold text-gray-900">{profile.fullName}</p>
                          <p className="text-xs text-gray-500">{profile.phoneNumber || '—'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-gray-600">{profile.email}</td>
                    <td className="py-3 px-4 text-gray-600 max-w-xs truncate">
                      {profile.roles ? profile.roles.split(',').slice(0, 2).join(', ') + (profile.roles.split(',').length > 2 ? '...' : '') : '—'}
                    </td>
                    <td className="py-3 px-4 text-gray-600">
                      {profile.publicMonthlyPriceInr ? (
                        <span className="inline-flex items-center gap-1">
                          <IndianRupee size={14} className="text-gray-400" />
                          {profile.publicMonthlyPriceInr.toLocaleString()}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_CONFIG[profile.publishStatus]?.className || 'bg-gray-100 text-gray-800'}`}>
                        {STATUS_CONFIG[profile.publishStatus]?.label || profile.publishStatus}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="inline-flex items-center gap-2">
                        <button
                          onClick={() => openDetail(profile.id)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-purple-600 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors"
                        >
                          <Eye size={14} />
                          View
                        </button>
                        <button
                          onClick={() => navigate(`/admin/virtual-assistants/applications/${profile.id}`)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          Edit
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
              <p>
                Showing page {page} of {totalPages} ({total} published profiles)
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="inline-flex items-center gap-1 px-3 py-1.5 border border-gray-300 rounded-lg disabled:opacity-50"
                >
                  <ChevronLeft size={16} />
                  Previous
                </button>
                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="inline-flex items-center gap-1 px-3 py-1.5 border border-gray-300 rounded-lg disabled:opacity-50"
                >
                  Next
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {selectedProfile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-xl font-bold text-gray-900">Published Profile Details</h3>
              <button onClick={() => setSelectedProfile(null)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X size={20} />
              </button>
            </div>

            {detailLoading ? (
              <div className="p-12 text-center text-gray-500">Loading...</div>
            ) : (
              <div className="p-6 space-y-6">
                <div className="flex items-start gap-4">
                  <VaProfilePhoto
                    source={selectedProfile}
                    applicationId={selectedProfile.id}
                    refreshScope="admin"
                    alt=""
                    className="w-20 h-20 rounded-xl object-cover"
                    fallbackClassName="w-20 h-20 rounded-xl bg-purple-100 flex items-center justify-center"
                    fallback="icon"
                    fallbackIcon={User}
                    fallbackIconSize={32}
                    fallbackIconClassName="text-purple-600"
                  />
                  <div>
                    <h4 className="text-lg font-bold text-gray-900">{selectedProfile.fullName}</h4>
                    <p className="text-sm text-gray-500">{selectedProfile.referenceNumber}</p>
                    <span className={`inline-flex items-center mt-2 px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_CONFIG[selectedProfile.publishStatus]?.className || 'bg-gray-100 text-gray-800'}`}>
                      {STATUS_CONFIG[selectedProfile.publishStatus]?.label || selectedProfile.publishStatus}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <h5 className="font-semibold text-gray-900 flex items-center gap-2"><User size={16} /> Personal Information</h5>
                    <p className="text-sm text-gray-600"><Mail size={14} className="inline mr-2" />{selectedProfile.email}</p>
                    <p className="text-sm text-gray-600"><Phone size={14} className="inline mr-2" />{selectedProfile.phoneNumber || '—'}</p>
                    <p className="text-sm text-gray-600"><MapPin size={14} className="inline mr-2" />{selectedProfile.location || '—'}</p>
                  </div>
                  <div className="space-y-3">
                    <h5 className="font-semibold text-gray-900 flex items-center gap-2"><Briefcase size={16} /> Professional Information</h5>
                    <p className="text-sm text-gray-600"><strong>Bio:</strong> {selectedProfile.bio || '—'}</p>
                    <p className="text-sm text-gray-600"><strong>Skills:</strong> {selectedProfile.skills || '—'}</p>
                    <p className="text-sm text-gray-600"><strong>Experience:</strong> {selectedProfile.yearsExperience || '—'}</p>
                    <p className="text-sm text-gray-600"><strong>Languages:</strong> {selectedProfile.languagesKnown || '—'}</p>
                    {selectedProfile.linkedinUrl && <p className="text-sm text-gray-600"><Globe size={14} className="inline mr-2" /><a href={selectedProfile.linkedinUrl} target="_blank" rel="noopener noreferrer" className="text-purple-600 underline">LinkedIn</a></p>}
                    {selectedProfile.portfolioUrl && <p className="text-sm text-gray-600"><Globe size={14} className="inline mr-2" /><a href={selectedProfile.portfolioUrl} target="_blank" rel="noopener noreferrer" className="text-purple-600 underline">Portfolio</a></p>}
                  </div>
                </div>

                <div className="space-y-3">
                  <h5 className="font-semibold text-gray-900 flex items-center gap-2"><IndianRupee size={16} /> Pricing & Capacity</h5>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <p className="text-sm text-gray-600"><strong>Public Price:</strong> {selectedProfile.publicMonthlyPriceInr ? `${selectedProfile.pricingCurrency || 'INR'} ${selectedProfile.publicMonthlyPriceInr.toLocaleString()}/mo` : '—'}</p>
                    <p className="text-sm text-gray-600"><strong>Max Capacity:</strong> {selectedProfile.maxClientCapacity || '—'}</p>
                    <p className="text-sm text-gray-600"><strong>Availability:</strong> {selectedProfile.availability ? selectedProfile.availability.replace('_', ' ').replace('-', ' ') : '—'}</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <h5 className="font-semibold text-gray-900 flex items-center gap-2"><Clock size={16} /> Publish Information</h5>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <p className="text-sm text-gray-600"><strong>Published At:</strong> {selectedProfile.publishedAt ? new Date(selectedProfile.publishedAt).toLocaleString() : '—'}</p>
                    <p className="text-sm text-gray-600"><strong>Published By:</strong> {selectedProfile.publishedByName || '—'}</p>
                  </div>
                </div>

                {selectedProfile.resumeUrl && (
                  <div className="pt-4 border-t border-gray-200">
                    <button
                      onClick={() => window.open(selectedProfile.resumeUrl, '_blank')}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 transition-colors"
                    >
                      <Eye size={16} />
                      View Resume
                    </button>
                  </div>
                )}

                <div className="pt-4 border-t border-gray-200 flex justify-end">
                  <button
                    type="button"
                    onClick={() => navigate(`/admin/virtual-assistants/applications/${selectedProfile.id}`)}
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-purple-600 rounded-lg hover:bg-purple-700 transition-colors"
                  >
                    Manage profile
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default VirtualAssistantPublishedProfilesPage;
