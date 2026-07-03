import React, { useState, useMemo, useEffect } from 'react';
import { Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import StatusFilterBar from '../components/admin/StatusFilterBar';
import { DOMAIN_STATUS_CONFIG, DOMAIN_STATUSES, resolveDomainStatus } from '../utils/domainStatuses';

const ITEMS_PER_PAGE = 20;

const DomainsAdminTab = ({ data, renderItem }) => {
  const { t } = useTranslation();
  const [activeFilter, setActiveFilter] = useState(DOMAIN_STATUSES.ALL);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  // Derive counts and filter data
  const { filteredData, counts } = useMemo(() => {
    const newCounts = {
      [DOMAIN_STATUSES.ALL]: data.length,
      [DOMAIN_STATUSES.PENDING]: 0,
      [DOMAIN_STATUSES.VERIFIED]: 0,
      [DOMAIN_STATUSES.APPROVED]: 0,
      [DOMAIN_STATUSES.TAKEN_DOWN]: 0,
    };

    const query = searchQuery.trim().toLowerCase();
    
    // Sort logic (Pending -> Verified -> Approved -> Taken Down, newest first)
    const statusPriority = {
      [DOMAIN_STATUSES.PENDING]: 1,
      [DOMAIN_STATUSES.VERIFIED]: 2,
      [DOMAIN_STATUSES.APPROVED]: 3,
      [DOMAIN_STATUSES.TAKEN_DOWN]: 4,
    };

    const sortedData = [...data].sort((a, b) => {
      const statusA = resolveDomainStatus(a);
      const statusB = resolveDomainStatus(b);
      
      if (statusPriority[statusA] !== statusPriority[statusB]) {
        return statusPriority[statusA] - statusPriority[statusB];
      }
      
      const dateA = new Date(a.createdAt || a.created_at || 0).getTime();
      const dateB = new Date(b.createdAt || b.created_at || 0).getTime();
      return dateB - dateA;
    });

    const result = sortedData.filter((item) => {
      const status = resolveDomainStatus(item);
      newCounts[status]++;

      // Filter by active status tab
      if (activeFilter !== DOMAIN_STATUSES.ALL && status !== activeFilter) {
        return false;
      }

      // Filter by search query
      if (query) {
        const domainName = (item.domainName || '').toLowerCase();
        const extension = (item.domainExtension || '').toLowerCase();
        const fullDomain = domainName + extension;
        const ownerName = ((item.listedBy?.firstname || '') + ' ' + (item.listedBy?.lastname || '')).toLowerCase();
        const ownerEmail = (item.listedBy?.email || '').toLowerCase();
        const idStr = String(item.id || '');
        
        if (!fullDomain.includes(query) && !ownerName.includes(query) && !ownerEmail.includes(query) && !idStr.includes(query)) {
          return false;
        }
      }

      return true;
    });

    return { filteredData: result, counts: newCounts };
  }, [data, activeFilter, searchQuery]);

  // Reset pagination when filter or search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [activeFilter, searchQuery]);

  // Pagination logic
  const totalPages = Math.max(1, Math.ceil(filteredData.length / ITEMS_PER_PAGE));
  const paginatedData = filteredData.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  return (
    <div className="domains-admin-tab">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
        <StatusFilterBar 
          config={DOMAIN_STATUS_CONFIG} 
          activeStatus={activeFilter} 
          counts={counts} 
          onFilterChange={setActiveFilter} 
        />
        
        <div className="relative w-full md:max-w-xs">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-colors"
            placeholder={t('adminSearchDomainsPlaceholder', { defaultValue: 'Search domains by name, ID, or owner...' })}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 font-bold"
            >
              ×
            </button>
          )}
        </div>
      </div>

      {filteredData.length === 0 ? (
        <div className="text-center py-20 bg-gray-50 rounded-xl border border-dashed border-gray-300">
          <h3 className="font-display text-xl font-bold text-gray-700">
            {activeFilter === DOMAIN_STATUSES.ALL 
              ? t('adminNoDomainsFound', { defaultValue: 'No domains found.' })
              : `No ${DOMAIN_STATUS_CONFIG.find(c => c.id === activeFilter)?.label.toLowerCase()} domains`}
          </h3>
          <p className="text-sm text-gray-500 mt-2">
            {searchQuery 
              ? 'Try adjusting your search query to find what you are looking for.' 
              : 'All domains in this category have been processed.'}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="text-sm text-gray-500 mb-1">
            Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1}-{Math.min(currentPage * ITEMS_PER_PAGE, filteredData.length)} of {filteredData.length} records
          </div>
          {paginatedData.map((item) => renderItem(item))}
          
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6 py-4 border-t border-gray-100">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1 rounded text-gray-500 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft size={20} />
              </button>
              
              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }).map((_, i) => {
                  const page = i + 1;
                  // Show current page, first, last, and pages adjacent to current
                  if (
                    page === 1 || 
                    page === totalPages || 
                    (page >= currentPage - 1 && page <= currentPage + 1)
                  ) {
                    return (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`w-8 h-8 rounded text-sm font-medium transition-colors ${
                          currentPage === page 
                            ? 'bg-indigo-600 text-white' 
                            : 'text-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        {page}
                      </button>
                    );
                  } else if (
                    page === currentPage - 2 || 
                    page === currentPage + 2
                  ) {
                    return <span key={page} className="text-gray-400">...</span>;
                  }
                  return null;
                })}
              </div>

              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1 rounded text-gray-500 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default DomainsAdminTab;
