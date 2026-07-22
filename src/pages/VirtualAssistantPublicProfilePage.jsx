import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, MapPin, Clock, IndianRupee, Users, Globe, Mail, Phone, Loader2, Briefcase, Calendar, MessageSquare } from 'lucide-react';
import { virtualAssistantAPI } from '../api/services';
import { unwrapApiData } from '../utils/apiResponse';
import TopNavbar from '../components/common/TopNavbar';
import HomeFooter from '../components/common/HomeFooter';

const VirtualAssistantPublicProfilePage = () => {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchProfile = async () => {
      if (!id) return;
      setLoading(true);
      setError('');
      try {
        const response = await virtualAssistantAPI.getPublicProfile(id);
        const data = unwrapApiData(response);
        setProfile(data.data || data);
      } catch (e) {
        console.error('Failed to load profile', e);
        setError('Virtual Assistant profile not found.');
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <TopNavbar />
        <div className="flex items-center justify-center py-20">
          <Loader2 size={40} className="animate-spin text-purple-600" />
        </div>
        <HomeFooter />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-gray-50">
        <TopNavbar />
        <div className="max-w-3xl mx-auto px-4 py-20 text-center">
          <p className="text-lg text-red-600">{error || 'Profile not found.'}</p>
          <button onClick={() => navigate('/virtual-assistants/marketplace')} className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
            Back to Marketplace
          </button>
        </div>
        <HomeFooter />
      </div>
    );
  }

  const skillsList = (profile.skills || '').split(',').map(s => s.trim()).filter(Boolean);
  const languagesList = (profile.languagesKnown || '').split(',').map(l => l.trim()).filter(Boolean);
  const rolesList = (profile.roles || '').split(',').map(r => r.trim()).filter(Boolean);
  const primaryRole = rolesList[0] || 'Virtual Assistant';

  return (
    <div className="min-h-screen bg-gray-50">
      <TopNavbar />
      <div className="max-w-4xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <button onClick={() => navigate(-1)} className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-6">
          <ArrowLeft size={16} /> Back
        </button>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="bg-purple-600 px-6 py-8 sm:px-8">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
              {profile.profilePhotoUrl ? (
                <img src={profile.profilePhotoUrl} alt={profile.fullName} className="w-24 h-24 rounded-xl object-cover border-4 border-white/20" />
              ) : (
                <div className="w-24 h-24 rounded-xl bg-white/20 flex items-center justify-center">
                  <Users size={40} className="text-white" />
                </div>
              )}
              <div className="text-center sm:text-left flex-1">
                <h1 className="text-2xl font-bold text-white">{profile.fullName}</h1>
                <p className="text-purple-100 mt-1">{primaryRole}</p>
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 mt-3 text-sm text-purple-100">
                  {profile.yearsExperience && (
                    <span className="inline-flex items-center gap-1"><Clock size={14} />{profile.yearsExperience}</span>
                  )}
                  {profile.location && (
                    <span className="inline-flex items-center gap-1"><MapPin size={14} />{profile.location}</span>
                  )}
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                    profile.availability === 'available' ? 'bg-green-100 text-green-800' :
                    profile.availability === 'busy' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {profile.availability ? profile.availability.replace(/_/g, ' ').replace(/-/g, ' ') : '—'}
                  </span>
                </div>
              </div>
              <div className="text-center sm:text-right">
                {profile.publicMonthlyPriceInr ? (
                  <p className="text-2xl font-bold text-white flex items-center gap-1 sm:justify-end">
                    <IndianRupee size={20} />{profile.publicMonthlyPriceInr.toLocaleString()}
                    <span className="text-sm font-normal text-purple-200">/mo</span>
                  </p>
                ) : (
                  <p className="text-purple-100">Price on request</p>
                )}
              </div>
            </div>
          </div>

          <div className="p-6 sm:p-8 space-y-8">
            {profile.bio && (
              <section>
                <h2 className="text-lg font-semibold text-gray-900 mb-3">About</h2>
                <p className="text-gray-700 leading-relaxed whitespace-pre-line">{profile.bio}</p>
              </section>
            )}

            {skillsList.length > 0 && (
              <section>
                <h2 className="text-lg font-semibold text-gray-900 mb-3">Skills</h2>
                <div className="flex flex-wrap gap-2">
                  {skillsList.map((skill, idx) => (
                    <span key={idx} className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-purple-50 text-purple-700">
                      {skill}
                    </span>
                  ))}
                </div>
              </section>
            )}

            {languagesList.length > 0 && (
              <section>
                <h2 className="text-lg font-semibold text-gray-900 mb-3">Languages</h2>
                <div className="flex flex-wrap gap-2">
                  {languagesList.map((lang, idx) => (
                    <span key={idx} className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-700">
                      {lang}
                    </span>
                  ))}
                </div>
              </section>
            )}

            {profile.yearsExperience && (
              <section>
                <h2 className="text-lg font-semibold text-gray-900 mb-3">Experience</h2>
                <p className="text-gray-700">{profile.yearsExperience} of professional experience</p>
              </section>
            )}

            {(() => {
              const roles = (profile.applicationRoles || []);
              const approved = roles.filter(r => r.status === 'approved');
              if (approved.length === 0) return null;
              const role = approved[0];
              const max = role.maxClients;
              const current = role.currentClients || 0;
              if (max === null || max === undefined) return null;
              const full = current >= max;
              const statusLabel = full ? 'Not Available' : role.availabilityStatus === 'limited' ? 'Limited Availability' : 'Available';
              const statusClass = full ? 'bg-red-50 text-red-700' : role.availabilityStatus === 'limited' ? 'bg-yellow-50 text-yellow-700' : 'bg-green-50 text-green-700';
              return (
                <section>
                  <h2 className="text-lg font-semibold text-gray-900 mb-3">Capacity</h2>
                  <div className="flex flex-wrap gap-2">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${statusClass}`}>
                      {statusLabel}
                    </span>
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-700">
                      {current}/{max} clients
                    </span>
                  </div>
                </section>
              );
            })()}
          </div>
        </div>
      </div>
      <HomeFooter />
    </div>
  );
};

export default VirtualAssistantPublicProfilePage;
