import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Search, MapPin, Clock, IndianRupee, Users, Filter, X } from 'lucide-react';
import { virtualAssistantAPI } from '../api/services';
import { unwrapApiList } from '../utils/apiResponse';
import { navigateToVirtualAssistantDetail } from '../utils/listingNavigation';
import TopNavbar from '../components/common/TopNavbar';
import HomeFooter from '../components/common/HomeFooter';
import FilterBar from '../components/common/FilterBar';
import Pagination from '../components/common/Pagination';
import VaProfilePhoto from '../components/virtual-assistant/VaProfilePhoto';

const VIRTUAL_ASSISTANT_ROLES = [
  'Administrative Support', 'Customer Support', 'Data Entry',
  'Social Media Management', 'Content Writing', 'Email Management',
  'Research', 'Technical Support', 'Sales Support', 'Personal Assistance',
  'Project Coordination', 'Calendar Management',
];

const AVAILABILITY_OPTIONS = [
  { value: 'available', label: 'Available' },
  { value: 'busy', label: 'Busy' },
  { value: 'temporarily_unavailable', label: 'Temporarily Unavailable' },
];

const SORT_OPTIONS = [
  { value: 'recently_published', label: 'Recently Published' },
  { value: 'experience', label: 'Experience' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
];

const VirtualAssistantMarketplacePage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [pageSize] = useState(12);

  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [role, setRole] = useState(searchParams.get('role') || '');
  const [availability, setAvailability] = useState(searchParams.get('availability') || '');
  const [minPrice, setMinPrice] = useState(searchParams.get('minPrice') || '');
  const [maxPrice, setMaxPrice] = useState(searchParams.get('maxPrice') || '');
  const [sortBy, setSortBy] = useState(searchParams.get('sortBy') || 'recently_published');

  const fetchProfiles = async () => {
    setLoading(true);
    setError('');
    try {
      const params = {
        search: search || undefined,
        role: role || undefined,
        availability: availability || undefined,
        min_price: minPrice ? Number(minPrice) : undefined,
        max_price: maxPrice ? Number(maxPrice) : undefined,
        sort_by: sortBy || undefined,
        page,
        page_size: pageSize,
      };
      const response = await virtualAssistantAPI.getPublicList(params);
      setProfiles(unwrapApiList(response));
      const body = response?.data ?? {};
      setTotal(body.meta?.total || 0);
      setTotalPages(body.meta?.total_pages || 1);
    } catch (e) {
      console.error('Failed to load marketplace', e);
      setError('Failed to load Virtual Assistants. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfiles();
  }, [page, pageSize]);

  useEffect(() => {
    setPage(1);
  }, [search, role, availability, minPrice, maxPrice, sortBy]);

  const handleClear = () => {
    setSearch('');
    setRole('');
    setAvailability('');
    setMinPrice('');
    setMaxPrice('');
    setSortBy('recently_published');
    setPage(1);
  };

  const activeFilterCount = [search, role, availability, minPrice, maxPrice].filter(Boolean).length;

  const roleOptions = useMemo(() => VIRTUAL_ASSISTANT_ROLES.map(r => ({ value: r, label: r })), []);
  const availabilityOptions = useMemo(() => AVAILABILITY_OPTIONS.map(a => ({ value: a.value, label: a.label })), []);

  return (
    <div className="min-h-screen bg-gray-50">
      <TopNavbar />
      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Virtual Assistant Marketplace</h1>
          <p className="mt-2 text-gray-600">Browse published Virtual Assistant profiles.</p>
        </div>

        <FilterBar
          search={search}
          onSearch={setSearch}
          category={role}
          onCategory={setRole}
          categoryOptions={roleOptions}
          minPrice={minPrice ? Number(minPrice) : ''}
          maxPrice={maxPrice ? Number(maxPrice) : ''}
          onMinPrice={(val) => setMinPrice(val === '' ? '' : String(val))}
          onMaxPrice={(val) => setMaxPrice(val === '' ? '' : String(val))}
          sortBy={sortBy}
          onSort={setSortBy}
          sortOptions={SORT_OPTIONS}
          onClear={handleClear}
          activeFilterCount={activeFilterCount}
          placeholder="Search by name, skills, or role..."
          priceSymbol="₹"
          theme="light"
        />

        {loading ? (
          <div className="text-center py-20 text-gray-500">Loading Virtual Assistants...</div>
        ) : error ? (
          <div className="text-center py-20 text-red-600">{error}</div>
        ) : profiles.length === 0 ? (
          <div className="text-center py-20 text-gray-500">
            <Filter size={48} className="mx-auto mb-4 text-gray-300" />
            <p className="text-lg font-medium">No Virtual Assistants found.</p>
            <p className="text-sm mt-1">Try adjusting your filters or search criteria.</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {profiles.map((profile) => (
                <div key={profile.id} className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden flex flex-col">
                  <div className="p-5 flex flex-col items-center text-center flex-1">
                    <VaProfilePhoto
                      source={profile}
                      applicationId={profile.id}
                      refreshScope="public"
                      alt={profile.fullName}
                      className="w-20 h-20 rounded-full object-cover mb-3"
                      fallbackClassName="w-20 h-20 rounded-full bg-purple-100 flex items-center justify-center mb-3"
                      fallback="icon"
                      fallbackIcon={Users}
                      fallbackIconSize={32}
                      fallbackIconClassName="text-purple-600"
                    />
                    <h3 className="font-semibold text-gray-900 text-base">{profile.fullName}</h3>
                    <p className="text-xs text-gray-500 mt-1">{profile.roles ? profile.roles.split(',')[0] : 'Virtual Assistant'}</p>
                    <div className="flex flex-wrap justify-center gap-1.5 mt-3">
                      {(profile.skills || '').split(',').slice(0, 3).map((skill, idx) => (
                        <span key={idx} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-50 text-purple-700">
                          {skill.trim()}
                        </span>
                      ))}
                    </div>
                    <div className="mt-3 space-y-1 text-xs text-gray-600">
                      {profile.yearsExperience && (
                        <p className="flex items-center justify-center gap-1"><Clock size={12} className="text-gray-400" />{profile.yearsExperience}</p>
                      )}
                      {profile.languagesKnown && (
                        <p className="flex items-center justify-center gap-1"><Users size={12} className="text-gray-400" />{profile.languagesKnown.split(',')[0]}</p>
                      )}
                      <p className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                        profile.availability === 'available' ? 'bg-green-50 text-green-700' :
                        profile.availability === 'busy' ? 'bg-yellow-50 text-yellow-700' :
                        'bg-red-50 text-red-700'
                      }`}>
                        {profile.availability ? profile.availability.replace(/_/g, ' ').replace(/-/g, ' ') : '—'}
                      </p>
                      {(() => {
                        const roles = (profile.applicationRoles || []);
                        const approved = roles.filter(r => r.status === 'approved');
                        if (approved.length === 0) return null;
                        const max = approved[0].maxClients;
                        const current = approved[0].currentClients || 0;
                        if (max === null || max === undefined) return null;
                        const full = current >= max;
                        return (
                          <p className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${full ? 'bg-red-50 text-red-700' : 'bg-blue-50 text-blue-700'}`}>
                            {full ? 'Not Available' : `Available (${current}/${max})`}
                          </p>
                        );
                      })()}
                    </div>
                  </div>
                  <div className="px-5 py-4 border-t border-gray-100 bg-gray-50">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        {profile.publicMonthlyPriceInr ? (
                          <p className="text-lg font-bold text-gray-900 flex items-center gap-1">
                            <IndianRupee size={16} className="text-gray-500" />
                            {profile.publicMonthlyPriceInr.toLocaleString()}
                            <span className="text-xs font-normal text-gray-500">/mo</span>
                          </p>
                        ) : (
                          <p className="text-sm text-gray-500">Price on request</p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => navigateToVirtualAssistantDetail(navigate, profile.id)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-white transition-colors"
                      >
                        View Profile
                      </button>

                    </div>
                  </div>
                </div>
              ))}
            </div>

            <Pagination
              page={page}
              totalPages={totalPages}
              onPage={setPage}
              totalCount={total}
              pageSize={pageSize}
            />
          </>
        )}
      </div>
      <HomeFooter />
    </div>
  );
};

export default VirtualAssistantMarketplacePage;
