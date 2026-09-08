import React from 'react';

const StatusFilterBar = ({ config, activeStatus, counts, onFilterChange }) => {
  return (
    <div className="flex flex-wrap items-center gap-2 mb-6">
      {config.map((statusObj) => {
        const isActive = activeStatus === statusObj.id;
        const count = counts[statusObj.id] || 0;
        
        return (
          <button
            key={statusObj.id}
            onClick={() => onFilterChange(statusObj.id)}
            className={`
              relative flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-full
              transition-all duration-300 ease-in-out border outline-none focus-visible:ring-2 focus-visible:ring-offset-2
              ${isActive 
                ? 'bg-[#C2410C] text-white border-[#C2410C] shadow-md focus-visible:ring-[#C2410C]'
                : 'bg-white text-gray-700 border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 focus-visible:ring-indigo-500'
              }
            `}
            aria-pressed={isActive}
          >
            <span>{statusObj.label}</span>
            <span 
              className={`
                flex items-center justify-center min-w-[1.5rem] h-5 px-1.5 text-xs font-bold rounded-full transition-colors
                ${isActive 
                  ? 'bg-white/20 text-white'
                  : 'bg-gray-100 text-gray-600'
                }
              `}
            >
              {count}
            </span>
          </button>
        );
      })}
    </div>
  );
};

export default StatusFilterBar;
