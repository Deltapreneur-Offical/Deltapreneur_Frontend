import { useRef } from 'react';
import { Upload, FileText, X, CheckCircle } from 'lucide-react';
import FormCheckbox from '../common/FormCheckbox';

const inputCls =
  'w-full px-4 py-2.5 bg-white border border-gray-300 rounded-[10px] text-gray-900 text-sm placeholder:text-gray-400 outline-none transition-all duration-200 focus:border-indigo-500 focus:shadow-[0_0_0_3px_rgba(99,102,241,0.12)]';

export default function VentureVerificationSection({
  requested,
  videoUrl,
  documents = [],
  pendingDocuments = [],
  status,
  rejectionReason,
  onRequestedChange,
  onVideoUrlChange,
  onUploadDocument,
  onRemovePendingDocument,
  uploading = false,
  uploadError = '',
  pendingUploadHint = 'Pending files will upload when you publish the listing.',
}) {
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) onUploadDocument?.(file);
    e.target.value = '';
  };

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-gray-500 m-0">
        Optional verification helps buyers trust your listing. When enabled, admins review your documents and video.
      </p>

      <FormCheckbox checked={requested} onChange={(e) => onRequestedChange(e.target.checked)}>
        Request Verification
      </FormCheckbox>

      {status && status !== 'NONE' && (
        <div className={`rounded-lg border px-3 py-2 text-sm ${
          status === 'APPROVED'
            ? 'border-green-200 bg-green-50 text-green-800'
            : status === 'REJECTED'
              ? 'border-red-200 bg-red-50 text-red-800'
              : 'border-amber-200 bg-amber-50 text-amber-800'
        }`}>
          Verification status: {status.replace(/_/g, ' ')}
          {rejectionReason ? ` — ${rejectionReason}` : ''}
        </div>
      )}

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-gray-700">Verification Video Link</span>
        <input
          type="url"
          value={videoUrl || ''}
          onChange={(e) => onVideoUrlChange(e.target.value)}
          className={inputCls}
          placeholder="YouTube, Google Drive, Loom, Vimeo, or any valid URL"
        />
      </label>

      {/* Supporting Documents — custom styled upload, no native dark file input */}
      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium text-gray-700">Supporting Documents</span>

        {/* Hidden native input */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.webp,application/pdf,image/*"
          onChange={handleFileChange}
          className="hidden"
        />

        {/* Clean custom trigger button */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="inline-flex items-center gap-2.5 self-start px-4 py-2.5 rounded-[10px] border border-dashed border-gray-300 bg-gray-50 text-sm font-medium text-gray-600 hover:border-indigo-400 hover:bg-indigo-50 hover:text-indigo-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Upload size={15} strokeWidth={2} className="shrink-0" />
          {uploading ? 'Uploading…' : 'Choose file'}
        </button>

        <span className="text-xs text-gray-400">
          Accepted: PDF, DOC, DOCX, PNG, JPG, JPEG, WEBP
        </span>

        {uploadError && (
          <span className="text-xs text-red-600">{uploadError}</span>
        )}

        {/* File list */}
        {(documents.length > 0 || pendingDocuments.length > 0) && (
          <ul className="m-0 pl-0 list-none flex flex-col gap-1.5 mt-1">
            {documents.map((doc) => (
              <li key={doc.id} className="flex items-center gap-2 px-3 py-2 rounded-[10px] border border-gray-200 bg-white text-sm text-gray-700">
                <CheckCircle size={14} className="text-green-500 shrink-0" />
                <span className="truncate">{doc.fileName || doc.file_name || 'Document'}</span>
              </li>
            ))}
            {pendingDocuments.map((doc) => (
              <li key={doc.localId} className="flex items-center justify-between gap-2 px-3 py-2 rounded-[10px] border border-indigo-100 bg-indigo-50/50 text-sm text-gray-700">
                <span className="flex items-center gap-2 min-w-0">
                  <FileText size={14} className="text-indigo-400 shrink-0" />
                  <span className="truncate">{doc.fileName || doc.file?.name || 'Document'}</span>
                </span>
                <button
                  type="button"
                  className="shrink-0 p-1 rounded-full text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                  onClick={() => onRemovePendingDocument?.(doc.localId)}
                  title="Remove"
                >
                  <X size={13} strokeWidth={2.5} />
                </button>
              </li>
            ))}
          </ul>
        )}

        {pendingDocuments.length > 0 && (
          <span className="text-xs text-gray-400 mt-0.5">{pendingUploadHint}</span>
        )}
      </div>
    </div>
  );
}
