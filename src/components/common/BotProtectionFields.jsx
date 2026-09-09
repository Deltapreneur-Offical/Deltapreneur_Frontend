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
  action,
}) {
  return (
    <div className={className}>
      <HoneypotField value={honeypot} onChange={onHoneypotChange} />
      {enabled && siteKey ? (
        <TurnstileWidget
          ref={turnstileRef}
          siteKey={siteKey}
          action={action}
          onToken={onTurnstileToken}
          onExpire={onTurnstileExpire}
        />
      ) : null}
    </div>
  );
}
