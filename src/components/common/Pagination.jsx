import { useTranslation } from 'react-i18next';

export default function Pagination({ page, totalPages, onPage, totalCount, pageSize = 20 }) {
    const { t } = useTranslation();
    if (totalPages <= 1) return null;
  
    const from = (page - 1) * pageSize + 1;
    const to   = Math.min(page * pageSize, totalCount);
  
    // Build page numbers with ellipsis
    const getPages = () => {
      const pages = [];
      if (totalPages <= 7) {
        for (let i = 1; i <= totalPages; i++) pages.push(i);
        return pages;
      }
      pages.push(1);
      if (page > 3) pages.push('…');
      for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) {
        pages.push(i);
      }
      if (page < totalPages - 2) pages.push('…');
      pages.push(totalPages);
      return pages;
    };
  
    return (
      <div className="flex flex-col items-center gap-3 mt-8">
        {/* Result count */}
        <div className="text-[0.78rem] text-gray-600">
          {t('paginationShowing', { from, to, total: totalCount })}
        </div>
  
        {/* Page buttons */}
        <div className="flex gap-1.5 items-center flex-wrap justify-center">
          {/* Prev */}
          <PageBtn
            label="←"
            disabled={page === 1}
            onClick={() => onPage(page - 1)}
          />
  
          {getPages().map((p, i) =>
            p === '…' ? (
              <span key={`ellipsis-${i}`} className="text-gray-600 px-1 text-[0.85rem]">
                …
              </span>
            ) : (
              <PageBtn
                key={p}
                label={p}
                active={p === page}
                onClick={() => onPage(p)}
              />
            )
          )}
  
          {/* Next */}
          <PageBtn
            label="→"
            disabled={page === totalPages}
            onClick={() => onPage(page + 1)}
          />
        </div>
      </div>
    );
  }
  
  function PageBtn({ label, active, disabled, onClick }) {
    return (
      <button
        onClick={onClick}
        disabled={disabled}
        className={`w-9 h-9 rounded-lg border text-[0.85rem] transition-all duration-150 flex items-center justify-center ${
          active
            ? 'border-blue-500 bg-blue-50 text-blue-600 font-bold'
            : disabled
            ? 'border-gray-200 bg-transparent text-gray-400 cursor-not-allowed'
            : 'border-gray-200 bg-white text-gray-600 cursor-pointer hover:bg-gray-50'
        }`}
      >
        {label}
      </button>
    );
  }