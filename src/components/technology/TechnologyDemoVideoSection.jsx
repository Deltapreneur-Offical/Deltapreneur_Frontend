import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown } from 'lucide-react';
import { TECHNOLOGY_DEMO_VIDEO_QUESTION_KEYS } from '../../constants/technologyDemoVideoQuestions';

const YOUTUBE_LOOM_REGEX = /^(https?:\/\/)?(www\.)?(youtube\.com\/(watch\?v=|embed\/|shorts\/)|youtu\.be\/|loom\.com\/share\/)/i;

export function isValidDemoVideoUrl(url) {
  const trimmed = (url ?? '').trim();
  if (!trimmed) return false;
  try {
    const parsed = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`);
    return YOUTUBE_LOOM_REGEX.test(parsed.href);
  } catch {
    return false;
  }
}

export default function TechnologyDemoVideoSection({ value, onChange, inputClassName, labelClassName }) {
  const { t } = useTranslation();
  const [questionsOpen, setQuestionsOpen] = useState(false);

  return (
    <div className="rounded-xl border border-amber-100 bg-amber-50/80 p-4 md:p-5 flex flex-col gap-4">
      <div>
        <label className={`${labelClassName} block`}>
          {t('technologyPageDemoVideo')} <span className="text-red-500">*</span>
        </label>
        <p className="text-sm text-gray-600 mt-1 m-0">{t('technologyPageDemoVideoHint')}</p>
      </div>

      <div>
        <p className="text-sm font-semibold text-gray-800 m-0 mb-2">
          {t('technologyPageDemoVideoQuestionsLabel')}
        </p>
        <button
          type="button"
          className="w-full flex items-center justify-between gap-2 px-3 py-2.5 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:border-gray-300 transition-colors"
          onClick={() => setQuestionsOpen((v) => !v)}
          aria-expanded={questionsOpen}
        >
          <span>{t('technologyPageDemoVideoSelectPrompt')}</span>
          <ChevronDown size={16} className={`shrink-0 transition-transform ${questionsOpen ? 'rotate-180' : ''}`} />
        </button>
        {questionsOpen && (
          <ol className="mt-2 pl-5 pr-1 max-h-48 overflow-y-auto text-sm text-gray-700 space-y-1.5 list-decimal">
            {TECHNOLOGY_DEMO_VIDEO_QUESTION_KEYS.map((key) => (
              <li key={key}>{t(key)}</li>
            ))}
          </ol>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <label className={labelClassName} htmlFor="technology-demo-video-url">
          {t('technologyPageDemoVideoUrl')} <span className="text-red-500">*</span>
        </label>
        <input
          id="technology-demo-video-url"
          className={inputClassName}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="https://www.youtube.com/watch?v=... or https://www.loom.com/share/..."
          required
        />
      </div>
    </div>
  );
}
