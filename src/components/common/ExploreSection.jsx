import { useState } from 'react';
import { ThumbsUp, ThumbsDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { feedbackAPI } from '../../api/services';
import DomainsSection from '../home/DomainsSection';
import VenturesSection from '../home/VenturesSection';
import TechnologySection from '../home/TechnologySection';
import FeedbackSection from '../home/FeedbackSection';
import CommunitySection from '../home/CommunitySection';
import AuctionsSection from '../home/AuctionsSection';

export default function ExploreSection() {
  const { t } = useTranslation();
  const [feedbackType, setFeedbackType] = useState(null);
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);

  const handleFeedbackTypeClick = (type) => {
    setFeedbackType(type);
  };

  const handleFeedbackSubmit = async () => {
    if (!feedbackMessage.trim()) {
      alert(t('feedbackPlaceholder'));
      return;
    }
    try {
      setFeedbackSubmitting(true);
      const response = await feedbackAPI.submit({
        feedbackType,
        message: feedbackMessage,
        pageUrl: window.location.href,
      });
      
      if (response.data && response.data.status === 'success') {
        setFeedbackSubmitted(true);
      } else {
        alert('Failed to send feedback. Please try again.');
      }
    } catch (error) {
      console.error('Feedback error:', error);
      alert('Something went wrong. Please try again later.');
    } finally {
      setFeedbackSubmitting(false);
    }
  };


  return (
    <>
      {/* ═══════════════════════════════════════════════════════════════════
          DOMAINS SECTION (Separate Component)
      ═══════════════════════════════════════════════════════════════════ */}
      <DomainsSection />

      {/* ═══════════════════════════════════════════════════════════════════
          VENTURES SECTION (Separate Component)
      ═══════════════════════════════════════════════════════════════════ */}
      <VenturesSection />

      {/* ═══════════════════════════════════════════════════════════════════
          TECHNOLOGY SECTION (Separate Component)
      ═══════════════════════════════════════════════════════════════════ */}
      <TechnologySection />

      <CommunitySection />

      {/* ═══════════════════════════════════════════════════════════════════
          AUCTIONS SECTION (Separate Component)
      ═══════════════════════════════════════════════════════════════════ */}
      <AuctionsSection />

      {/* ═══════════════════════════════════════════════════════════════════
          FEEDBACK WIDGET (Separate Component)
      ═══════════════════════════════════════════════════════════════════ */}
      <FeedbackSection />
    </>
  );
}
