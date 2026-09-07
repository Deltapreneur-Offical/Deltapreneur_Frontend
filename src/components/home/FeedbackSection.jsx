import { useState } from 'react';
import { ThumbsUp, ThumbsDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { feedbackAPI } from '../../api/services';
import BotProtectionFields from '../common/BotProtectionFields';
import { useBotProtection } from '../../hooks/useBotProtection';

const CONFETTI_PIECES = [
  { left: '5%', delay: '0ms', duration: '2600ms', color: '#ff9933', rotate: '18deg' },
  { left: '13%', delay: '180ms', duration: '2800ms', color: '#f59e0b', rotate: '52deg' },
  { left: '23%', delay: '70ms', duration: '2700ms', color: '#ec4899', rotate: '94deg' },
  { left: '34%', delay: '310ms', duration: '2900ms', color: '#f97316', rotate: '135deg' },
  { left: '45%', delay: '120ms', duration: '2650ms', color: '#22c55e', rotate: '175deg' },
  { left: '56%', delay: '390ms', duration: '2850ms', color: '#f97316', rotate: '215deg' },
  { left: '67%', delay: '40ms', duration: '2750ms', color: '#e67300', rotate: '255deg' },
  { left: '77%', delay: '260ms', duration: '2600ms', color: '#fb923c', rotate: '295deg' },
  { left: '87%', delay: '150ms', duration: '2880ms', color: '#eab308', rotate: '335deg' },
  { left: '95%', delay: '340ms', duration: '2720ms', color: '#e67300', rotate: '375deg' },
];

const HAPPY_EMOJIS = [
  { emoji: '😊', left: '10%', delay: '100ms', duration: '2750ms' },
  { emoji: '🎉', left: '30%', delay: '480ms', duration: '2900ms' },
  { emoji: '🥳', left: '52%', delay: '220ms', duration: '2800ms' },
  { emoji: '😄', left: '73%', delay: '620ms', duration: '3000ms' },
  { emoji: '✨', left: '91%', delay: '340ms', duration: '2850ms' },
];

const SAD_EMOJIS = [
  { emoji: '😔', left: '9%', delay: '0ms', duration: '2700ms' },
  { emoji: '☹️', left: '25%', delay: '500ms', duration: '2900ms' },
  { emoji: '😞', left: '43%', delay: '180ms', duration: '2800ms' },
  { emoji: '😕', left: '61%', delay: '680ms', duration: '3000ms' },
  { emoji: '😔', left: '78%', delay: '320ms', duration: '2850ms' },
  { emoji: '☹️', left: '93%', delay: '780ms', duration: '2950ms' },
];

export default function FeedbackSection() {
  const { t } = useTranslation();
  const [feedbackType, setFeedbackType] = useState(null);
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const botProtectionActive = feedbackType !== null || feedbackMessage.trim().length > 0;
  const {
    requiresTurnstile,
    getProtectionPayload,
    resetProtection,
    botProtectionProps,
  } = useBotProtection({ active: botProtectionActive, action: 'feedback' });

  const handleFeedbackTypeClick = (type) => {
    setFeedbackType(type);
  };

  const handleFeedbackSubmit = async () => {
    if (!feedbackMessage.trim()) {
      alert(t('feedbackPlaceholder'));
      return;
    }
    if (requiresTurnstile) {
      alert(t('completeSecurityCheck', 'Please complete the security check.'));
      return;
    }
    try {
      setFeedbackSubmitting(true);
      const response = await feedbackAPI.submit({
        feedbackType,
        message: feedbackMessage,
        pageUrl: window.location.href,
        ...getProtectionPayload(),
      });
      
      if (response.data && response.data.status === 'success') {
        setFeedbackSubmitted(true);
        resetProtection();
      } else {
        alert(t('feedbackFailed', { defaultValue: 'Failed to send feedback. Please try again.' }));
        resetProtection();
      }
    } catch (error) {
      console.error('Feedback error:', error);
      resetProtection();
      alert(t('feedbackError', { defaultValue: 'Something went wrong. Please try again later.' }));
    } finally {
      setFeedbackSubmitting(false);
    }
  };

  return (
    <section className="bg-white py-8 md:py-10">
      <div className="relative isolate w-full overflow-hidden p-4 md:p-5 bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-100 rounded-2xl">
        {feedbackSubmitted && (
          <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
            {feedbackType === 'like' ? (
              <>
                {CONFETTI_PIECES.map((piece, index) => (
                  <span
                    key={`confetti-${index}`}
                    className="feedback-confetti-piece"
                    style={{
                      left: piece.left,
                      animationDelay: piece.delay,
                      animationDuration: piece.duration,
                      backgroundColor: piece.color,
                      '--confetti-rotate': piece.rotate,
                    }}
                  />
                ))}
                {HAPPY_EMOJIS.map((item, index) => (
                  <span
                    key={`happy-${index}`}
                    className="feedback-falling-emoji feedback-happy-emoji"
                    style={{
                      left: item.left,
                      animationDelay: item.delay,
                      animationDuration: item.duration,
                    }}
                  >
                    {item.emoji}
                  </span>
                ))}
              </>
            ) : (
              SAD_EMOJIS.map((item, index) => (
                <span
                  key={`sad-${index}`}
                  className="feedback-falling-emoji feedback-sad-emoji"
                  style={{
                    left: item.left,
                    animationDelay: item.delay,
                    animationDuration: item.duration,
                  }}
                >
                  {item.emoji}
                </span>
              ))
            )}
          </div>
        )}
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-3 md:gap-6">
          <div className="flex-1 min-w-0">
            <p className="text-sm md:text-base font-semibold text-gray-900 mb-1 leading-snug">
              {t('feedbackQuestion')}
            </p>
            <p className="text-xs md:text-sm text-gray-600 leading-relaxed max-w-[560px]">
              {t('feedbackDesc')}
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-start md:justify-end gap-2 md:gap-3">
            {!feedbackSubmitted ? (
              !feedbackType ? (
                <>
                  <button
                    className="btn-glow btn-glow-sm flex items-center gap-1.5 !px-3 !py-1.5 !text-[11px] sm:!text-xs"
                    onClick={() => handleFeedbackTypeClick('like')}
                  >
                    {t('feedbackYes')} <ThumbsUp size={14} />
                  </button>
                  <button
                    className="btn-glow btn-glow-sm flex items-center gap-1.5 !px-3 !py-1.5 !text-[11px] sm:!text-xs"
                    onClick={() => handleFeedbackTypeClick('dislike')}
                  >
                    {t('feedbackNo')} <ThumbsDown size={14} />
                  </button>
                </>
              ) : null
            ) : (
              <p className="text-xs md:text-sm font-medium text-orange-600">
                {feedbackType === 'like' ? t('feedbackPositive') : t('feedbackNegative')}
              </p>
            )}
          </div>
        </div>
        {feedbackType && !feedbackSubmitted && (
          <div className="relative z-10 mt-4">
            <textarea
              className="w-full px-3.5 py-2 bg-white border border-gray-300 rounded-xl text-xs sm:text-sm text-gray-900 placeholder:text-gray-400 outline-none transition-all duration-200 focus:border-gray-400 focus:shadow-[0_0_0_3px_rgba(0,0,0,0.06)] resize-none"
              placeholder={t('feedbackPlaceholder')}
              rows="2"
              value={feedbackMessage}
              onChange={(e) => setFeedbackMessage(e.target.value)}
            />
            <BotProtectionFields {...botProtectionProps} className="mb-3" />
            <div className="flex flex-col sm:flex-row gap-2 md:gap-3 mt-3">
              <button
                className="btn-glow btn-glow-sm w-full sm:w-auto !px-4 !py-2 !text-[11px] sm:!text-xs"
                onClick={handleFeedbackSubmit}
                disabled={feedbackSubmitting || requiresTurnstile}
              >
                {feedbackSubmitting ? t('feedbackSubmitting') : t('submitFeedback')}
              </button>
              <button
                className="px-5 py-2 bg-white border border-gray-300 text-gray-700 rounded-full text-[11px] sm:text-xs font-semibold cursor-pointer transition-all duration-200 hover:bg-gray-50 w-full sm:w-auto"
                onClick={() => { setFeedbackType(null); setFeedbackMessage(''); }}
                disabled={feedbackSubmitting}
              >
                {t('cancelFeedback')}
              </button>
            </div>
          </div>
        )}
        <style>{`
          @keyframes feedbackConfettiFall {
            0% {
              opacity: 0;
              transform: translate3d(0, -18px, 0) rotate(var(--confetti-rotate));
            }
            12% { opacity: 0.95; }
            100% {
              opacity: 0;
              transform: translate3d(14px, 105px, 0) rotate(calc(var(--confetti-rotate) + 430deg));
            }
          }

          @keyframes feedbackEmojiFall {
            0% {
              opacity: 0;
              transform: translate3d(0, -24px, 0) rotate(-8deg) scale(0.78);
            }
            15% { opacity: 0.9; }
            100% {
              opacity: 0;
              transform: translate3d(10px, 105px, 0) rotate(12deg) scale(1);
            }
          }

          .feedback-confetti-piece {
            position: absolute;
            top: -8px;
            width: 7px;
            height: 11px;
            border-radius: 2px;
            animation: feedbackConfettiFall 2s ease-in forwards;
            animation-iteration-count: 4;
          }

          .feedback-falling-emoji {
            position: absolute;
            top: -20px;
            line-height: 1;
            animation: feedbackEmojiFall 4.6s ease-in-out forwards;
            animation-iteration-count: 4;
            filter: drop-shadow(0 2px 3px rgba(76, 29, 149, 0.15));
          }

          .feedback-happy-emoji {
            font-size: 18px;
          }

          .feedback-sad-emoji {
            font-size: 17px;
            opacity: 0.82;
            filter: grayscale(0.15) drop-shadow(0 2px 3px rgba(71, 85, 105, 0.12));
          }

          @media (prefers-reduced-motion: reduce) {
            .feedback-confetti-piece,
            .feedback-falling-emoji {
              animation: none;
              display: none;
            }
          }
        `}</style>
      </div>
    </section>
  );
}
