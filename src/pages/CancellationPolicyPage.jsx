import { Ban } from 'lucide-react';
import LegalPolicyShell, { PolicyContactCard, PolicySection } from '../components/common/LegalPolicyShell';
import { BUSINESS_LEGAL_NAME } from '../config/contactLinks';

const LAST_UPDATED = '7th August 2026';

const SECTIONS = [
  { id: 'overview', title: '1. Overview' },
  { id: 'before-payment', title: '2. Cancellation before payment' },
  { id: 'after-payment', title: '3. Cancellation after payment' },
  { id: 'timelines', title: '4. Cancellation timelines' },
  { id: 'orders-services', title: '5. Orders & ongoing services' },
  { id: 'account', title: '6. Account cancellation' },
  { id: 'refunds', title: '7. Refunds after cancellation' },
  { id: 'how-to', title: '8. How to cancel or request help' },
  { id: 'regulatory', title: '9. Regulatory compliance' },
  { id: 'changes', title: '10. Changes to this policy' },
  { id: 'contact', title: '11. Contact & grievance' },
];

export default function CancellationPolicyPage() {
  return (
    <LegalPolicyShell
      badgeIcon={Ban}
      badge="Cancellation Policy"
      titleAccent="Cancellation Policy"
      intro={`This Cancellation Policy explains how you can cancel an order or request before or after payment on HubRegistrar (${BUSINESS_LEGAL_NAME}), applicable timelines, and what happens next for digital products and domain services.`}
      lastUpdated={LAST_UPDATED}
      sections={SECTIONS}
      documentTitle="Cancellation Policy | HubRegistrar"
      documentDescription="HubRegistrar Cancellation Policy — cancel before or after payment, timelines, refunds within 5-7 business days, and contact details for hubregistrar.com."
    >
      <PolicySection id="overview" title="1. Overview">
        <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
          HubRegistrar offers digital marketplace and registration services. Cancellation options depend on whether you have
          completed payment, whether the service has already been fulfilled (for example, a domain successfully
          registered), and the product-specific terms shown at checkout. All prices are in INR.
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
            contact support immediately. We will attempt to stop or reverse fulfillment where possible and process a
            refund as per our Refund Policy.
          </li>
          <li>
            If fulfillment <strong>has</strong> completed (for example the domain is already registered, or a digital
            product has been delivered), cancellation may not be possible. Refund eligibility then follows the Refund
            Policy.
          </li>
        </ul>
      </PolicySection>

      <PolicySection id="timelines" title="4. Cancellation timelines">
        <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
          For digital orders where fulfillment has not started or is still in progress, you must submit a cancellation
          request within <strong>24 hours</strong> of payment confirmation, or before the service is marked as delivered
          in your HubRegistrar account—whichever is earlier. We confirm cancellation requests within{' '}
          <strong>2 business days</strong>. Marketplace or auction purchases may have shorter windows stated on the
          listing page; those terms apply in addition to this policy.
        </p>
      </PolicySection>

      <PolicySection id="orders-services" title="5. Orders & ongoing services">
        <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
          Subscription-style or renewing services (where offered) may be cancelled for future periods by contacting
          support at least <strong>7 calendar days</strong> before the next renewal charge, subject to product-specific
          terms shown at purchase. Past periods already delivered are generally non-cancellable.
        </p>
      </PolicySection>

      <PolicySection id="account" title="6. Account cancellation">
        <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
          You may request closure of your HubRegistrar account by contacting support. Account closure does not
          automatically refund completed purchases. Data handling after closure is described in our{' '}
          <a href="/privacy-policy" className="font-medium text-indigo-600 hover:underline">
            Privacy Policy
          </a>
          .
        </p>
      </PolicySection>

      <PolicySection id="refunds" title="7. Refunds after cancellation">
        <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
          When a cancellation is approved and a refund is due, we initiate the refund through our payment partner within{' '}
          <strong>2 business days</strong>. The amount is credited to your original payment method within{' '}
          <strong>5 to 7 business days</strong> (up to <strong>10 business days</strong> in rare cases), as described in
          our{' '}
          <a href="/refund-policy" className="font-medium text-indigo-600 hover:underline">
            Refund Policy
          </a>
          .
        </p>
      </PolicySection>

      <PolicySection id="how-to" title="8. How to cancel or request help">
        <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
          Email <span className="font-medium text-slate-900">support@hubregistrar.com</span> or use the Contact page with
          your order/payment reference, registered email or phone, and what you want cancelled. We will confirm next
          steps by email within <strong>2 business days</strong>.
        </p>
      </PolicySection>

      <PolicySection id="regulatory" title="9. Regulatory compliance">
        <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
          This Cancellation Policy is published in accordance with the Consumer Protection (E-Commerce) Rules, 2020. It
          should be read with our{' '}
          <a href="/refund-policy" className="font-medium text-indigo-600 hover:underline">
            Refund Policy
          </a>
          ,{' '}
          <a href="/terms-and-conditions" className="font-medium text-indigo-600 hover:underline">
            Terms and Conditions
          </a>
          , and{' '}
          <a href="/privacy-policy" className="font-medium text-indigo-600 hover:underline">
            Privacy Policy
          </a>
          .
        </p>
      </PolicySection>

      <PolicySection id="changes" title="10. Changes to this policy">
        <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
          We may update this Cancellation Policy from time to time. The &quot;Last updated&quot; date on this page will
          change when updates are published.
        </p>
      </PolicySection>

      <PolicySection id="contact" title="11. Contact & grievance">
        <PolicyContactCard />
      </PolicySection>
    </LegalPolicyShell>
  );
}
