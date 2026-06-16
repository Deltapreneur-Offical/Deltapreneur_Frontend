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

      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium text-gray-700">Supporting Documents</span>
        <input
          type="file"
          accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.webp,application/pdf,image/*"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onUploadDocument?.(file);
            e.target.value = '';
          }}
          className="text-sm"
        />
        <span className="text-xs text-gray-500">
          Accepted: PDF, DOC, DOCX, PNG, JPG, JPEG, WEBP
        </span>
        {uploading && <span className="text-xs text-gray-500">Uploading…</span>}
        {uploadError && <span className="text-xs text-red-600">{uploadError}</span>}
        {(documents.length > 0 || pendingDocuments.length > 0) && (
          <ul className="text-sm text-gray-700 m-0 pl-0 list-none flex flex-col gap-2">
            {documents.map((doc) => (
              <li key={doc.id} className="flex items-center gap-2">
                <span>{doc.fileName || doc.file_name || 'Document'}</span>
              </li>
            ))}
            {pendingDocuments.map((doc) => (
              <li key={doc.localId} className="flex items-center justify-between gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
                <span>{doc.fileName || doc.file?.name || 'Document'}</span>
                <button
                  type="button"
                  className="text-xs text-red-600 hover:text-red-800"
                  onClick={() => onRemovePendingDocument?.(doc.localId)}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
        {pendingDocuments.length > 0 && (
          <span className="text-xs text-gray-500">
            {pendingUploadHint}
          </span>
        )}
      </div>
    </div>
  );
}
