import { useState } from 'react';
import CompanyProfileSections, {
  COMPANY_PROFILE_REQUIRED_FIELDS,
  EMPTY_COMPANY_PROFILE,
  isCompanyProfileComplete,
} from './CompanyProfileSections';

export { COMPANY_PROFILE_REQUIRED_FIELDS, EMPTY_COMPANY_PROFILE, isCompanyProfileComplete };

/**
 * Owner-facing Company Profile editor. Saves a draft into the listing form
 * state; required (Public-tier) fields must be complete before an admin can
 * approve the listing. Private fields are never shown publicly.
 */
export default function CompanyProfileModal({ profile, onSave, onClose }) {
  const [draft, setDraft] = useState({ ...EMPTY_COMPANY_PROFILE, ...(profile || {}) });
  const complete = isCompanyProfileComplete(draft);

  const handleSave = (e) => {
    e.preventDefault();
    onSave(draft);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="relative w-full max-w-[680px] max-h-[92vh] overflow-y-auto bg-white border border-gray-200 rounded-[18px] shadow-[0_20px_60px_rgba(17,24,39,0.14)] animate-slideUp">
        <button
          type="button"
          className="absolute top-4 right-4 z-20 bg-transparent border-none text-gray-400 text-xl cursor-pointer transition-colors duration-200 hover:text-gray-900"
          onClick={onClose}
        >
          ✕
        </button>

        <div className="p-8 pb-4">
          <h2 className="font-display text-2xl font-bold text-gray-900 m-0 mb-1">Company Profile</h2>
          <p className="text-sm text-gray-500 m-0">
            Public fields are shown to buyers and partners on your approved listing.
            Private fields stay between you and CoBrother. Admin approval requires all
            required fields to be complete.
          </p>
        </div>

        <form onSubmit={handleSave} className="px-8 pb-8 flex flex-col gap-4">
          <CompanyProfileSections profile={draft} onChange={setDraft} />

          <div
            className={`p-3 rounded-lg text-sm border ${
              complete
                ? 'bg-green-50 border-green-200 text-green-700'
                : 'bg-amber-50 border-amber-200 text-amber-800'
            }`}
          >
            {complete
              ? '✓ All required fields complete — your listing can be approved by admin.'
              : 'Required fields are still missing. You can save a draft, but admin cannot approve the listing until they are complete.'}
          </div>

          <div className="flex gap-3">
            <button type="submit" className="btn-glow flex-1">Save Profile</button>
            <button
              type="button"
              className="px-5 py-2.5 bg-white border-2 border-gray-300 text-gray-600 rounded-full text-sm font-semibold cursor-pointer transition-all duration-200 hover:bg-gray-50"
              onClick={onClose}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
