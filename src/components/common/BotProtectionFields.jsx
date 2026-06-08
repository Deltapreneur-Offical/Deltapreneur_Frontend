import HoneypotField from './HoneypotField';
import TurnstileWidget from './TurnstileWidget';

export default function BotProtectionFields({
  className = '',
  honeypot,
  onHoneypotChange,
  enabled,
  siteKey,
  turnstileRef,
  onTurnstileToken,
  onTurnstileExpire,
}) {
  return (
    <div className={className}>
      <HoneypotField value={honeypot} onChange={onHoneypotChange} />
      {enabled && siteKey ? (
        <TurnstileWidget
          ref={turnstileRef}
          siteKey={siteKey}
          onToken={onTurnstileToken}
          onExpire={onTurnstileExpire}
        />
      ) : null}
    </div>
  );
}
