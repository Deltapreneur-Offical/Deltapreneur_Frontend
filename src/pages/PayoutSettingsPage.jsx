import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Landmark,
  Loader2,
  Search,
  Smartphone,
  XCircle,
} from 'lucide-react';
import { payoutProfileAPI } from '../api/domainTransferAPI';
import { readApiError } from '../utils/apiError';

const INDIAN_BANKS = [
  'Airtel Payments Bank',
  'Ahmedabad Mercantile Co-operative Bank',
  'Allahabad Bank',
  'Andhra Bank',
  'Andhra Pragathi Grameena Bank',
  'Andhra Pradesh Grameena Vikas Bank',
  'Apna Sahakari Bank',
  'AU Small Finance Bank',
  'Axis Bank',
  'Bandhan Bank',
  'Bank of Bahrain and Kuwait',
  'Bank of Baroda',
  'Bank of Ceylon',
  'Bank of India',
  'Bank of Maharashtra',
  'Baroda Gujarat Gramin Bank',
  'Baroda Rajasthan Kshetriya Gramin Bank',
  'Bassein Catholic Co-operative Bank',
  'Bharat Co-operative Bank Mumbai',
  'Canara Bank',
  'Capital Small Finance Bank',
  'Catholic Syrian Bank',
  'Central Bank of India',
  'Chaitanya Godavari Grameena Bank',
  'City Union Bank',
  'Cosmos Co-operative Bank',
  'Credit Suisse AG',
  'DBS Bank India',
  'DCB Bank',
  'Deutsche Bank',
  'Dhanlaxmi Bank',
  'Doha Bank',
  'Equitas Small Finance Bank',
  'ESAF Small Finance Bank',
  'Fincare Small Finance Bank',
  'FINO Payments Bank',
  'Federal Bank',
  'GP Parsik Sahakari Bank',
  'HDFC Bank',
  'HSBC Bank',
  'ICICI Bank',
  'IDBI Bank',
  'IDFC First Bank',
  'India Post Payments Bank',
  'Indian Bank',
  'Indian Overseas Bank',
  'IndusInd Bank',
  'Jammu & Kashmir Bank',
  'Jana Small Finance Bank',
  'Janakalyan Sahakari Bank',
  'Janaseva Sahakari Bank Pune',
  'Janata Sahakari Bank Pune',
  'Jharkhand Rajya Gramin Bank',
  'Jio Payments Bank',
  'Kallappanna Awade Ichalkaranji Janata Sahakari Bank',
  'Kalyan Janata Sahakari Bank',
  'Karnataka Bank',
  'Karnataka Gramin Bank',
  'Karnataka Vikas Grameena Bank',
  'Karur Vysya Bank',
  'Kerala Gramin Bank',
  'Kotak Mahindra Bank',
  'Madhya Bihar Gramin Bank',
  'Madhya Pradesh Gramin Bank',
  'Mahanagar Co-operative Bank',
  'Maharashtra Gramin Bank',
  'Manipur Rural Bank',
  'Mashreq Bank',
  'Meghalaya Rural Bank',
  'Mizoram Rural Bank',
  'NKGSB Co-operative Bank',
  'North East Small Finance Bank',
  'Odisha Gramya Bank',
  'Paschim Banga Gramin Bank',
  'Paytm Payments Bank',
  'Pragathi Krishna Gramin Bank',
  'Prathama UP Gramin Bank',
  'Punjab & Maharashtra Co-operative Bank',
  'Punjab & Sind Bank',
  'Punjab Gramin Bank',
  'State Bank of India (SBI)',
  'Punjab National Bank',
  'Rajasthan Marudhara Gramin Bank',
  'Rajkot Nagarik Sahakari Bank',
  'RBL Bank',
  'Saraswat Co-operative Bank',
  'Saurashtra Gramin Bank',
  'Shamrao Vithal Co-operative Bank',
  'Shivalik Small Finance Bank',
  'South Indian Bank',
  'Standard Chartered Bank',
  'Suryoday Small Finance Bank',
  'Tamilnad Mercantile Bank',
  'Tamil Nadu Grama Bank',
  'Telangana Grameena Bank',
  'The Akola District Central Cooperative Bank',
  'The Andhra Pradesh State Co-operative Bank',
  'The Gujarat State Co-operative Bank',
  'The Kangra Central Co-operative Bank',
  'The Kerala State Co-operative Bank',
  'The Maharashtra State Co-operative Bank',
  'The Mehsana Urban Co-operative Bank',
  'The Municipal Co-operative Bank Mumbai',
  'The Nainital Bank',
  'The Nasik Merchants Co-operative Bank',
  'The Rajasthan State Co-operative Bank',
  'The Surat District Co-operative Bank',
  'The Tamil Nadu State Apex Co-operative Bank',
  'The Thane Bharat Sahakari Bank',
  'The Varachha Co-operative Bank',
  'TJSB Sahakari Bank',
  'Tripura Gramin Bank',
  'UCO Bank',
  'Ujjivan Small Finance Bank',
  'Union Bank of India',
  'Utkarsh Small Finance Bank',
  'Utkal Grameen Bank',
  'Vidharbha Konkan Gramin Bank',
  'Yes Bank',
  'Zila Sahakari Bank',
].sort((a, b) => a.localeCompare(b));

const OTHER_BANK_OPTION = 'Other Bank';

const UPI_PATTERN = /^[A-Za-z0-9._-]{2,256}@[A-Za-z]{2,64}$/;
const IFSC_PATTERN = /^[A-Z]{4}0[A-Z0-9]{6}$/;

const initialForm = {
  payoutMethod: 'UPI',
  upiId: '',
  accountHolderName: '',
  bankName: '',
  customBankName: '',
  bankSearch: '',
  bankAccountNumber: '',
  confirmBankAccountNumber: '',
  bankIfsc: '',
};

function unwrapProfile(data) {
  if (data && Object.prototype.hasOwnProperty.call(data, 'profile')) {
    return data.profile;
  }
  return data || null;
}

function getApiErrorMessage(error) {
  return readApiError(error, 'Unable to save payout settings.');
}

function formatDateTime(value) {
  if (!value) return 'Not updated yet';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function resolveBankSelection(bankName) {
  if (!bankName || bankName === OTHER_BANK_OPTION) {
    return { bankName: '', customBankName: '', bankSearch: '' };
  }
  if (INDIAN_BANKS.includes(bankName)) {
    return { bankName, customBankName: '', bankSearch: bankName };
  }
  return { bankName: OTHER_BANK_OPTION, customBankName: bankName, bankSearch: OTHER_BANK_OPTION };
}

function StatusBadge({ complete, completion }) {
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${
        complete
          ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
          : 'border-amber-200 bg-amber-50 text-amber-800'
      }`}
    >
      <span
        className={`h-2 w-2 rounded-full ${complete ? 'bg-emerald-500' : 'bg-amber-500'}`}
        aria-hidden="true"
      />
      {complete ? 'Payout Profile Complete' : 'Payout Profile Incomplete'} ({completion}%)
    </span>
  );
}

function ToastStack({ toast, onDismiss }) {
  if (!toast) return null;
  const isError = toast.type === 'error';
  return (
    <div className="fixed right-4 top-4 z-[1100] w-[calc(100vw-2rem)] max-w-sm">
      <div
        className={`flex items-start gap-3 rounded-lg border bg-white p-3 text-sm shadow-lg ${
          isError ? 'border-red-200 text-red-800' : 'border-emerald-200 text-emerald-800'
        }`}
        role="status"
      >
        {isError ? (
          <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
        ) : (
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
        )}
        <p className="min-w-0 flex-1 leading-5">{toast.message}</p>
        <button
          type="button"
          className="text-gray-400 hover:text-gray-700"
          onClick={onDismiss}
          aria-label="Dismiss notification"
        >
          x
        </button>
      </div>
    </div>
  );
}

function MessageBlock({ type, message }) {
  if (!message) return null;
  const isError = type === 'error';
  return (
    <div
      className={`flex items-start gap-2 rounded-lg border p-3 text-sm ${
        isError
          ? 'border-red-200 bg-red-50 text-red-700'
          : 'border-emerald-200 bg-emerald-50 text-emerald-700'
      }`}
    >
      {isError ? (
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
      ) : (
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
      )}
      <p>{message}</p>
    </div>
  );
}

function TextField({
  id,
  label,
  value,
  onChange,
  placeholder,
  required,
  autoComplete,
  error,
  success,
  inputMode,
  onFocus,
}) {
  return (
    <div>
      <label htmlFor={id} className="text-sm font-semibold text-gray-800">
        {label}
      </label>
      <input
        id={id}
        value={value}
        onChange={onChange}
        onFocus={onFocus}
        placeholder={placeholder}
        required={required}
        autoComplete={autoComplete}
        inputMode={inputMode}
        className={`mt-2 w-full rounded-lg border bg-white px-3 py-3 text-sm text-gray-950 outline-none transition focus:ring-4 ${
          error
            ? 'border-red-300 focus:border-red-500 focus:ring-red-100'
            : success
              ? 'border-emerald-300 focus:border-emerald-500 focus:ring-emerald-100'
              : 'border-gray-300 focus:border-teal-500 focus:ring-teal-100'
        }`}
      />
      {error ? <p className="mt-1 text-xs font-medium text-red-600">{error}</p> : null}
      {success ? <p className="mt-1 text-xs font-medium text-emerald-700">{success}</p> : null}
    </div>
  );
}

function formatPayoutMethod(method) {
  if (method === 'BANK_ACCOUNT') return 'Bank Account';
  if (method === 'UPI') return 'UPI';
  return method || '—';
}

function resolveMaskedAccount(profile) {
  return (
    profile?.maskedAccountNumber ||
    profile?.masked_account_number ||
    profile?.maskedBankAccount ||
    ''
  );
}

function SavedPayoutDetailsPanel({ profile, onEdit }) {
  const isBank = profile?.payoutMethod === 'BANK_ACCOUNT';
  const maskedAccount = resolveMaskedAccount(profile);
  const maskedUpi = profile?.maskedUpiId || '';

  return (
    <section className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            <h2 className="text-lg font-bold text-gray-950">Your saved payout details</h2>
          </div>
          <p className="mt-1 text-sm text-gray-600">
            Review these details to confirm they are correct. Sensitive fields are partially hidden for security.
          </p>
          <p className="mt-2 text-xs font-medium text-gray-500">
            Last saved: {formatDateTime(profile?.updatedAt)}
          </p>
        </div>
        <button
          type="button"
          onClick={onEdit}
          className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-800 shadow-sm transition hover:bg-gray-50"
        >
          Change payout details
        </button>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <DetailRow label="Payout method" value={formatPayoutMethod(profile?.payoutMethod)} />
        <DetailRow
          label="Status"
          value={profile?.isComplete ? 'Complete — ready for payouts' : 'Incomplete — add missing fields'}
        />
        {isBank ? (
          <>
            <DetailRow label="Account holder name" value={profile?.accountHolderName} />
            <DetailRow label="Bank name" value={profile?.bankName} />
            <DetailRow label="Account number" value={maskedAccount || 'Not on file'} mono />
            <DetailRow label="IFSC code" value={profile?.bankIfsc} mono />
          </>
        ) : (
          <DetailRow label="UPI ID" value={maskedUpi || 'Not on file'} mono className="sm:col-span-2" />
        )}
      </div>

      {!profile?.isComplete ? (
        <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Your payout profile is incomplete. Use &quot;Change payout details&quot; to finish setup.
        </p>
      ) : null}
    </section>
  );
}

function DetailRow({ label, value, mono = false, className = '' }) {
  return (
    <div className={`rounded-lg border border-white/80 bg-white px-4 py-3 shadow-sm ${className}`}>
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</p>
      <p className={`mt-1 break-all text-sm font-semibold text-gray-900 ${mono ? 'font-mono' : ''}`}>
        {value || '—'}
      </p>
    </div>
  );
}

function PayoutSupportHint({ className = '' }) {
  return (
    <p className={`text-sm text-gray-500 ${className}`}>
      Confused?{' '}
      <Link
        to="/contact"
        className="font-semibold text-teal-700 underline-offset-2 transition hover:text-teal-800 hover:underline"
      >
        Contact our support
      </Link>
    </p>
  );
}

export default function PayoutSettingsPage() {
  const [form, setForm] = useState(initialForm);
  const [profile, setProfile] = useState(null);
  const [isEditing, setIsEditing] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [toast, setToast] = useState(null);
  const [bankResultsOpen, setBankResultsOpen] = useState(false);
  const [accountReplacementStarted, setAccountReplacementStarted] = useState(false);

  const isBank = form.payoutMethod === 'BANK_ACCOUNT';
  const selectedBankName = form.bankName === OTHER_BANK_OPTION ? form.customBankName.trim() : form.bankName.trim();
  const existingMaskedAccountNumber = resolveMaskedAccount(profile);
  const usingExistingMaskedAccount =
    Boolean(existingMaskedAccountNumber) && form.bankAccountNumber === existingMaskedAccountNumber;
  const hasStoredAccountNumber = Boolean(
    profile?.hasAccountNumber ||
      profile?.has_account_number ||
      existingMaskedAccountNumber,
  );
  const preservingExistingAccount = hasStoredAccountNumber && !form.bankAccountNumber.trim();
  const enteringNewAccount = !usingExistingMaskedAccount && !preservingExistingAccount && Boolean(form.bankAccountNumber.trim());
  const accountNumbersEntered = Boolean(enteringNewAccount && form.confirmBankAccountNumber);
  const accountNumbersMatch = accountNumbersEntered && form.bankAccountNumber === form.confirmBankAccountNumber;
  const accountNumberValid = usingExistingMaskedAccount || preservingExistingAccount || accountNumbersMatch;
  const upiValid = UPI_PATTERN.test(form.upiId.trim());
  const ifscValid = IFSC_PATTERN.test(form.bankIfsc.trim().toUpperCase());

  const fieldErrors = useMemo(() => {
    const errors = {};
    if (!isBank) {
      if (form.upiId.trim() && !upiValid) errors.upiId = 'Enter a valid UPI ID.';
      return errors;
    }
    if (form.bankIfsc.trim() && !ifscValid) errors.bankIfsc = 'Enter a valid IFSC code.';
    if (!usingExistingMaskedAccount && accountNumbersEntered && !accountNumbersMatch) {
      errors.confirmBankAccountNumber = 'Account numbers do not match.';
    }
    return errors;
  }, [accountNumbersEntered, accountNumbersMatch, form.bankIfsc, form.upiId, ifscValid, isBank, upiValid, usingExistingMaskedAccount]);

  const completion = useMemo(() => {
    if (!isBank) return upiValid ? 100 : 0;
    const checks = [
      Boolean(form.accountHolderName.trim()),
      Boolean(selectedBankName),
      accountNumberValid,
      ifscValid,
    ];
    return Math.round((checks.filter(Boolean).length / checks.length) * 100);
  }, [accountNumberValid, form.accountHolderName, form.bankAccountNumber, ifscValid, isBank, selectedBankName, upiValid]);

  const formCanSave = isBank
    ? completion === 100 && Object.keys(fieldErrors).length === 0
    : upiValid && Object.keys(fieldErrors).length === 0;
  const isComplete = Boolean(profile?.isComplete) || formCanSave;

  const showToast = (type, message) => {
    setToast({ type, message });
    window.setTimeout(() => setToast(null), 4500);
  };

  useEffect(() => {
    let alive = true;
    payoutProfileAPI
      .getMe()
      .then(({ data }) => {
        if (!alive) return;
        const nextProfile = unwrapProfile(data);
        if (nextProfile) {
          const bankSelection = resolveBankSelection(nextProfile.bankName || '');
          setProfile(nextProfile);
          setIsEditing(false);
          setAccountReplacementStarted(false);
          setForm((current) => ({
            ...current,
            payoutMethod: nextProfile.payoutMethod || 'UPI',
            upiId: '',
            accountHolderName: nextProfile.accountHolderName || '',
            bankIfsc: nextProfile.bankIfsc || '',
            bankAccountNumber: resolveMaskedAccount(nextProfile),
            confirmBankAccountNumber: '',
            ...bankSelection,
          }));
        } else {
          setIsEditing(true);
        }
      })
      .catch((err) => {
        if (!alive) return;
        const message = getApiErrorMessage(err);
        setError(message);
        showToast('error', message);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  const updateField = (field) => (event) => {
    setForm((current) => ({ ...current, [field]: event.target.value }));
    if (field === 'bankAccountNumber') {
      setAccountReplacementStarted(true);
    }
    setError('');
    setSuccess('');
  };

  const selectMethod = (method) => {
    setForm((current) => ({ ...current, payoutMethod: method }));
    setBankResultsOpen(false);
    setError('');
    setSuccess('');
  };

  const selectBank = (bankName) => {
    setForm((current) => ({
      ...current,
      bankName,
      bankSearch: bankName,
      customBankName: bankName === OTHER_BANK_OPTION ? current.customBankName : '',
    }));
    setBankResultsOpen(false);
  };

  const filteredBanks = useMemo(() => {
    const query = form.bankSearch.trim().toLowerCase();
    const matches = query
      ? INDIAN_BANKS.filter((bank) => bank.toLowerCase().includes(query))
      : INDIAN_BANKS;
    return [...matches, OTHER_BANK_OPTION];
  }, [form.bankSearch]);

  const validate = () => {
    if (isBank) {
      if (!form.accountHolderName.trim()) return 'Account Holder Name is required.';
      if (!selectedBankName) return 'Bank Name is required.';
      if (!accountNumberValid) {
        if (!form.bankAccountNumber.trim() && !hasStoredAccountNumber) return 'Account Number is required.';
        if (!form.confirmBankAccountNumber.trim()) return 'Confirm Account Number is required.';
        if (form.bankAccountNumber !== form.confirmBankAccountNumber) return 'Account numbers do not match.';
      }
      if (!form.bankIfsc.trim()) return 'IFSC Code is required.';
      if (!ifscValid) return 'Enter a valid IFSC code.';
      return '';
    }
    if (!form.upiId.trim()) return 'UPI ID is required.';
    if (!upiValid) return 'Enter a valid UPI ID.';
    return '';
  };

  const beginEditing = () => {
    setIsEditing(true);
    setError('');
    setSuccess('');
    if (profile) {
      const bankSelection = resolveBankSelection(profile.bankName || '');
      setAccountReplacementStarted(false);
      setForm((current) => ({
        ...current,
        payoutMethod: profile.payoutMethod || 'UPI',
        upiId: '',
        accountHolderName: profile.accountHolderName || '',
        bankIfsc: profile.bankIfsc || '',
        bankAccountNumber: resolveMaskedAccount(profile),
        confirmBankAccountNumber: '',
        ...bankSelection,
      }));
    }
  };

  const cancelEditing = () => {
    if (!profile) return;
    setIsEditing(false);
    setError('');
    setSuccess('');
    setAccountReplacementStarted(false);
    const bankSelection = resolveBankSelection(profile.bankName || '');
    setForm((current) => ({
      ...current,
      payoutMethod: profile.payoutMethod || 'UPI',
      upiId: '',
      accountHolderName: profile.accountHolderName || '',
      bankIfsc: profile.bankIfsc || '',
      bankAccountNumber: resolveMaskedAccount(profile),
      confirmBankAccountNumber: '',
      ...bankSelection,
    }));
  };

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      showToast('error', 'Please correct highlighted fields.');
      return;
    }

    const payload = new FormData();
    payload.append('payout_method', form.payoutMethod);
    if (isBank) {
      payload.append('account_holder_name', form.accountHolderName.trim());
      payload.append('bank_name', selectedBankName);
      if (enteringNewAccount) {
        payload.append('account_number', form.bankAccountNumber.trim());
        payload.append('bank_account_number', form.bankAccountNumber.trim());
        payload.append('confirm_account_number', form.confirmBankAccountNumber.trim());
        payload.append('confirm_bank_account_number', form.confirmBankAccountNumber.trim());
      }
      payload.append('bank_ifsc', form.bankIfsc.trim().toUpperCase());
    } else {
      payload.append('upi_id', form.upiId.trim());
    }

    setSaving(true);
    try {
      const { data } = await payoutProfileAPI.upsert(payload);
      const nextProfile = unwrapProfile(data);
      setProfile(nextProfile);
      setIsEditing(false);
      setSuccess('Payout settings saved successfully. Review your saved details below.');
      showToast('success', 'Payout settings saved. Please verify your details.');
      const bankSelection = resolveBankSelection(nextProfile?.bankName || '');
      setForm((current) => ({
        ...current,
        payoutMethod: nextProfile?.payoutMethod || current.payoutMethod,
        accountHolderName: nextProfile?.accountHolderName || current.accountHolderName,
        bankIfsc: nextProfile?.bankIfsc || current.bankIfsc,
        bankAccountNumber: resolveMaskedAccount(nextProfile),
        confirmBankAccountNumber: '',
        upiId: '',
        ...bankSelection,
      }));
      setAccountReplacementStarted(false);
    } catch (err) {
      const message = getApiErrorMessage(err);
      setError(message);
      showToast('error', message || 'Please correct highlighted fields.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 px-4 py-8">
        <div className="mx-auto flex max-w-3xl items-center gap-3 rounded-xl border border-gray-200 bg-white p-5 text-sm text-gray-600 shadow-sm">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading payout settings...
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
      <ToastStack toast={toast} onDismiss={() => setToast(null)} />
      <div className="mx-auto max-w-4xl">
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-2 rounded-lg border border-gray-400 bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm transition-colors hover:border-black hover:bg-black hover:text-white"
        >
          <ArrowLeft className="h-4 w-4 transition-colors text-current" />
          Back
        </Link>

        <div className="mt-5 rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-teal-700">
                Seller Settings
              </p>
              <h1 className="mt-2 text-2xl font-bold text-gray-950 sm:text-3xl">
                Payout Settings
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600">
                Configure how you receive seller payouts for domain sales, venture deals, and technology listings.
              </p>
              <p className="mt-2 text-xs font-medium text-gray-500">
                Last updated: {formatDateTime(profile?.updatedAt)}
              </p>
            </div>
            <StatusBadge complete={isComplete} completion={completion} />
          </div>

          <div className="mt-6 h-2 overflow-hidden rounded-full bg-gray-100">
            <div
              className={`h-full rounded-full transition-all ${completion === 100 ? 'bg-emerald-500' : 'bg-amber-500'}`}
              style={{ width: `${completion}%` }}
            />
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <button
              type="button"
              onClick={() => {
                selectMethod('UPI');
                if (!isEditing) beginEditing();
              }}
              disabled={!isEditing && Boolean(profile)}
              className={`rounded-xl border p-4 text-left transition ${
                !isBank
                  ? 'border-teal-400 bg-teal-50 shadow-sm'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              } ${!isEditing && profile ? 'cursor-default opacity-80' : ''}`}
            >
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-600 text-white">
                  <Smartphone className="h-5 w-5" />
                </span>
                <div>
                  <p className="font-semibold text-gray-950">UPI</p>
                  <p className="text-sm text-gray-600">Recommended for faster payouts.</p>
                </div>
              </div>
            </button>
            <button
              type="button"
              onClick={() => {
                selectMethod('BANK_ACCOUNT');
                if (!isEditing) beginEditing();
              }}
              disabled={!isEditing && Boolean(profile)}
              className={`rounded-xl border p-4 text-left transition ${
                isBank
                  ? 'border-blue-400 bg-blue-50 shadow-sm'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              } ${!isEditing && profile ? 'cursor-default opacity-80' : ''}`}
            >
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600 text-white">
                  <Landmark className="h-5 w-5" />
                </span>
                <div>
                  <p className="font-semibold text-gray-950">Bank Account</p>
                  <p className="text-sm text-gray-600">Use as a backup payout method.</p>
                </div>
              </div>
            </button>
          </div>

          {profile && !isEditing ? (
            <div className="mt-6 space-y-4">
              <MessageBlock type="error" message={error} />
              <MessageBlock type="success" message={success} />
              <SavedPayoutDetailsPanel profile={profile} onEdit={beginEditing} />
              <PayoutSupportHint className="border-t border-gray-100 pt-4" />
            </div>
          ) : (
          <form onSubmit={submit} className="mt-6 space-y-5">
            {profile ? (
              <div className="flex flex-col gap-3 rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-blue-900">
                  Update your payout details below. Account number and UPI changes require re-entry for security.
                </p>
                <button
                  type="button"
                  onClick={cancelEditing}
                  className="inline-flex min-h-10 items-center justify-center rounded-lg border border-blue-200 bg-white px-4 py-2 text-sm font-semibold text-blue-800 transition hover:bg-blue-100"
                >
                  Cancel
                </button>
              </div>
            ) : null}
            <MessageBlock type="error" message={error} />
            <MessageBlock type="success" message={success} />

            {!isBank ? (
              <div className="space-y-2">
                {profile?.maskedUpiId ? (
                  <p className="text-sm text-gray-600">
                    Current saved UPI:{' '}
                    <span className="font-mono font-semibold text-gray-900">{profile.maskedUpiId}</span>
                    {' '}— enter a new UPI ID below to replace it.
                  </p>
                ) : null}
                <TextField
                  id="upi-id"
                  label="UPI ID"
                  value={form.upiId}
                  onChange={updateField('upiId')}
                  placeholder={profile?.maskedUpiId ? 'Enter new UPI ID' : 'name@bank'}
                  required
                  autoComplete="off"
                  error={fieldErrors.upiId}
                  success={upiValid ? 'UPI ID format looks good.' : ''}
                />
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <TextField
                    id="account-holder-name"
                    label="Account Holder Name"
                    value={form.accountHolderName}
                    onChange={updateField('accountHolderName')}
                    placeholder="Full name as per bank"
                    required
                    autoComplete="name"
                  />
                  <div className="relative">
                    <label htmlFor="bank-search" className="text-sm font-semibold text-gray-800">
                      Bank Name
                    </label>
                    <div className="relative mt-2">
                      <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-gray-400" />
                      <input
                        id="bank-search"
                        value={form.bankSearch}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            bankSearch: event.target.value,
                            bankName: '',
                          }))
                        }
                        onFocus={() => setBankResultsOpen(true)}
                        onBlur={() => window.setTimeout(() => setBankResultsOpen(false), 120)}
                        placeholder="Search your bank name..."
                        className="w-full rounded-lg border border-gray-300 bg-white py-3 pl-9 pr-3 text-sm text-gray-950 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                        role="combobox"
                        aria-expanded={bankResultsOpen}
                        aria-controls="bank-search-results"
                        autoComplete="off"
                      />
                    </div>
                    {bankResultsOpen ? (
                      <div
                        id="bank-search-results"
                        className="absolute z-20 mt-2 max-h-64 w-full overflow-auto rounded-lg border border-gray-200 bg-white p-1 shadow-lg"
                        role="listbox"
                      >
                        {filteredBanks.map((bank) => (
                          <button
                            key={bank}
                            type="button"
                            className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm transition ${
                              form.bankName === bank
                                ? 'bg-blue-50 font-semibold text-blue-700'
                                : bank === OTHER_BANK_OPTION
                                  ? 'border-t border-gray-100 font-semibold text-blue-700 hover:bg-blue-50'
                                  : 'text-gray-700 hover:bg-gray-50'
                            }`}
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={() => selectBank(bank)}
                            role="option"
                            aria-selected={form.bankName === bank}
                          >
                            {bank}
                            {form.bankName === bank ? <CheckCircle2 className="h-4 w-4" /> : null}
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>
                  {form.bankName === OTHER_BANK_OPTION ? (
                    <TextField
                      id="custom-bank-name"
                      label="Enter Your Bank Name"
                      value={form.customBankName}
                      onChange={updateField('customBankName')}
                      placeholder="Enter your bank name"
                      required
                      autoComplete="organization"
                    />
                  ) : null}
                  <TextField
                    id="account-number"
                    label="Account Number"
                    value={form.bankAccountNumber}
                    onChange={updateField('bankAccountNumber')}
                    onFocus={() => {
                      if (usingExistingMaskedAccount) {
                        setAccountReplacementStarted(true);
                        setForm((current) => ({
                          ...current,
                          bankAccountNumber: '',
                          confirmBankAccountNumber: '',
                        }));
                      }
                    }}
                    placeholder={
                      accountReplacementStarted
                        ? 'Enter new account number'
                        : existingMaskedAccountNumber
                          ? `Saved: ${existingMaskedAccountNumber} — click to replace`
                          : 'Enter account number'
                    }
                    required={!preservingExistingAccount}
                    autoComplete="off"
                    inputMode="numeric"
                    success={usingExistingMaskedAccount ? 'Saved account number on file.' : ''}
                  />
                  {!usingExistingMaskedAccount && !preservingExistingAccount ? (
                    <TextField
                      id="confirm-account-number"
                      label="Confirm Account Number"
                      value={form.confirmBankAccountNumber}
                      onChange={updateField('confirmBankAccountNumber')}
                      placeholder="Re-enter account number"
                      required={enteringNewAccount || !hasStoredAccountNumber}
                      autoComplete="off"
                      inputMode="numeric"
                      error={fieldErrors.confirmBankAccountNumber}
                      success={accountNumbersMatch ? 'Account numbers match.' : ''}
                    />
                  ) : null}
                  <TextField
                    id="ifsc-code"
                    label="IFSC Code"
                    value={form.bankIfsc}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        bankIfsc: event.target.value.toUpperCase(),
                      }))
                    }
                    placeholder="HDFC0001234"
                    required
                    autoComplete="off"
                    error={fieldErrors.bankIfsc}
                    success={ifscValid ? 'IFSC format looks good.' : ''}
                  />
                </div>
              </div>
            )}

            <div className="flex flex-col gap-3 border-t border-gray-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1.5">
                <p className="text-sm text-gray-500">
                  Payouts are released manually by CoɃrother after transfer completion.
                </p>
                <PayoutSupportHint />
              </div>
              <button
                type="submit"
                disabled={saving || !formCanSave}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-gray-950 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                {saving ? 'Saving...' : 'Save Payout Settings'}
              </button>
            </div>
          </form>
          )}
        </div>
      </div>
    </main>
  );
}
