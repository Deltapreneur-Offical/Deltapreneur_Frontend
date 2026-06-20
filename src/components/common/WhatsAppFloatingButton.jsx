import { FaWhatsapp } from 'react-icons/fa';
import { useTranslation } from 'react-i18next';
import { EXTERNAL_LINK_PROPS, WHATSAPP_URL } from '../../config/contactLinks';

export default function WhatsAppFloatingButton() {
  const { t } = useTranslation();

  return (
    <a
      href={WHATSAPP_URL}
      {...EXTERNAL_LINK_PROPS}
      className="whatsapp-floating-btn"
      aria-label={t('whatsapp')}
      title={t('whatsapp')}
    >
      <span className="whatsapp-floating-btn__glow" aria-hidden="true" />
      <span className="whatsapp-floating-btn__pulse whatsapp-floating-btn__pulse--1" aria-hidden="true" />
      <span className="whatsapp-floating-btn__pulse whatsapp-floating-btn__pulse--2" aria-hidden="true" />
      <FaWhatsapp className="whatsapp-floating-btn__icon" aria-hidden="true" />
    </a>
  );
}
