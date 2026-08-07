import { Ban } from 'lucide-react';
import LegalPolicyShell, { PolicyContactCard, PolicySection } from '../components/common/LegalPolicyShell';

const LAST_UPDATED = '6th August 2026';

const SECTIONS = [
  { id: 'overview', title: '1. Overview' },
  { id: 'before-payment', title: '2. Cancellation before payment' },
  { id: 'after-payment', title: '3. Cancellation after payment' },
  { id: 'orders-services', title: '4. Orders & ongoing services' },
  { id: 'account', title: '5. Account cancellation' },
  { id: 'how-to', title: '6. How to cancel or request help' },
  { id: 'changes', title: '7. Changes to this policy' },
  { id: 'contact', title: '8. Contact' },
];

export default function CancellationPolicyPage() {
  return (
    <LegalPolicyShell
      badgeIcon={Ban}
      badge="Cancellation Policy"
      titleAccent="Cancellation Policy"
      intro="This Cancellation Policy explains how you can cancel an order or request before or after payment on CoBrother, and what happens next for digital products and domain services."
      lastUpdated={LAST_UPDATED}
      sections={SECTIONS}
    >
      <PolicySection id="overview" title="1. Overview">
        <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
          CoBrother offers digital marketplace and registration services. Cancellation options depend on whether
          you have completed payment and whether the service has already been fulfilled (for example, a domain
          successfully registered).
        </p>
      </PolicySection>

      <PolicySection id="before-payment" title="2. Cancellation before payment">
        <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
          You may cancel at any time before completing checkout:
        </p>
        <ul className="mt-2 list-disc pl-5 space-y-1 text-slate-600 text-sm sm:text-base leading-relaxed">
          <li>Remove items from your cart</li>
          <li>Close the payment window without paying</li>
          <li>Abandon an unpaid request or form</li>
        </ul>
        <p className="text-slate-600 text-sm sm:text-base leading-relaxed mt-3">
          No charges apply for cancellations made before a successful payment capture.
        </p>
      </PolicySection>

      <PolicySection id="after-payment" title="3. Cancellation after payment">
        <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
          After payment is captured:
        </p>
        <ul className="mt-2 list-disc pl-5 space-y-1 text-slate-600 text-sm sm:text-base leading-relaxed">
          <li>
            If fulfillment has <strong>not</strong> completed (for example registration still pending or failed),
            contact support immediately. We will attempt to stop or reverse fulfillment where possible and process
            a refund as per our Refund Policy.
          </li>
          <li>
            If fulfillment <strong>has</strong> completed (for example the domain is already registered, or a digital
            product has been delivered), cancellation may not be possible. Refund eligibility then follows the
            Refund Policy.
          </li>
        </ul>
        <p className="text-slate-600 text-sm sm:text-base leading-relaxed mt-3">
          For linked policies, see{' '}
          <a href="/refund-policy" className="font-medium text-indigo-600 hover:underline">
            Refund Policy
          </a>
          .
        </p>
      </PolicySection>

      <PolicySection id="orders-services" title="4. Orders & ongoing services">
        <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
          Subscription-style or renewing services (where offered) may be cancelled for future periods by contacting
          support before the next renewal charge, subject to product-specific terms shown at purchase. Past periods
          already delivered are generally non-cancellable.
        </p>
      </PolicySection>

      <PolicySection id="account" title="5. Account cancellation">
        <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
          You may request closure of your CoBrother account by contacting support. Account closure does not
          automatically refund completed purchases. Data handling after closure is described in our{' '}
          <a href="/privacy-policy" className="font-medium text-indigo-600 hover:underline">
            Privacy Policy
          </a>
          .
        </p>
      </PolicySection>

      <PolicySection id="how-to" title="6. How to cancel or request help">
        <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
          Email <span className="font-medium text-slate-900">support@cobrother.com</span> or use the Contact page with
          your order/payment reference and what you want cancelled. We will confirm next steps by email.
        </p>
      </PolicySection>

      <PolicySection id="changes" title="7. Changes to this policy">
        <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
          We may update this Cancellation Policy from time to time. The &quot;Last updated&quot; date on this page will
          change when updates are published.
        </p>
      </PolicySection>

      <PolicySection id="contact" title="8. Contact">
        <PolicyContactCard />
      </PolicySection>
    </LegalPolicyShell>
  );
}
