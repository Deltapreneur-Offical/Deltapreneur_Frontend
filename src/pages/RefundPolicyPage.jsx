import { RefreshCcw } from 'lucide-react';
import LegalPolicyShell, { PolicyContactCard, PolicySection } from '../components/common/LegalPolicyShell';

const LAST_UPDATED = '6th August 2026';

const SECTIONS = [
  { id: 'overview', title: '1. Overview' },
  { id: 'scope', title: '2. Scope of this policy' },
  { id: 'eligible', title: '3. When refunds are available' },
  { id: 'non-refundable', title: '4. Non-refundable items' },
  { id: 'how-to', title: '5. How to request a refund' },
  { id: 'process', title: '6. Refund process & timeline' },
  { id: 'payment', title: '7. Payment method for refunds' },
  { id: 'changes', title: '8. Changes to this policy' },
  { id: 'contact', title: '9. Contact' },
];

export default function RefundPolicyPage() {
  return (
    <LegalPolicyShell
      badgeIcon={RefreshCcw}
      badge="Refund Policy"
      titleAccent="Refund Policy"
      intro="This Refund Policy explains when and how CoBrother issues refunds for payments made on cobrother.com for domain registrations, marketplace purchases, technology products, and related digital services."
      lastUpdated={LAST_UPDATED}
      sections={SECTIONS}
    >
      <PolicySection id="overview" title="1. Overview">
        <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
          CoBrother (&quot;we&quot;, &quot;our&quot;, &quot;us&quot;) provides an online marketplace and digital services platform.
          Payments are processed securely through Razorpay. This policy applies to purchases completed on
          our website and related checkout flows.
        </p>
      </PolicySection>

      <PolicySection id="scope" title="2. Scope of this policy">
        <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
          This policy covers refunds for:
        </p>
        <ul className="mt-2 list-disc pl-5 space-y-1 text-slate-600 text-sm sm:text-base leading-relaxed">
          <li>Domain registration (via our registrar partner)</li>
          <li>Domain marketplace / buy-now listings</li>
          <li>Technology and digital product purchases</li>
          <li>Paid add-ons (where applicable), renewals, and related digital services</li>
        </ul>
      </PolicySection>

      <PolicySection id="eligible" title="3. When refunds are available">
        <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
          You may be eligible for a refund in these cases:
        </p>
        <ul className="mt-2 list-disc pl-5 space-y-1 text-slate-600 text-sm sm:text-base leading-relaxed">
          <li>Payment was successfully captured but the service could not be fulfilled (for example, domain registration failed after payment).</li>
          <li>A duplicate charge was made for the same order.</li>
          <li>An unauthorized or clearly erroneous charge attributable to a platform error.</li>
          <li>Any other case where we confirm, after review, that a refund is due under this policy or applicable law.</li>
        </ul>
      </PolicySection>

      <PolicySection id="non-refundable" title="4. Non-refundable items">
        <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
          Unless required by law, the following are generally non-refundable:
        </p>
        <ul className="mt-2 list-disc pl-5 space-y-1 text-slate-600 text-sm sm:text-base leading-relaxed">
          <li>Domain registrations that have been successfully registered at the registry / registrar.</li>
          <li>Digital goods or services that have already been delivered or activated as described at checkout.</li>
          <li>Marketplace purchases after ownership transfer / completion of the sale process.</li>
          <li>Fees marked as non-refundable at the time of purchase (for example certain auction or bid fees, where disclosed).</li>
        </ul>
        <p className="text-slate-600 text-sm sm:text-base leading-relaxed mt-3">
          Domain names are unique digital assets. Once registration is completed with the registry, we typically cannot reverse the registration, so refunds are not available in that case.
        </p>
      </PolicySection>

      <PolicySection id="how-to" title="5. How to request a refund">
        <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
          To request a refund, contact CoBrother Support with:
        </p>
        <ul className="mt-2 list-disc pl-5 space-y-1 text-slate-600 text-sm sm:text-base leading-relaxed">
          <li>Registered email / phone used at checkout</li>
          <li>Order or payment reference (Razorpay Payment ID / Order ID if available)</li>
          <li>Product or domain name</li>
          <li>Brief reason for the request</li>
        </ul>
        <p className="text-slate-600 text-sm sm:text-base leading-relaxed mt-3">
          Please raise refund requests promptly after the issue occurs so we can investigate while payment and provision records are fresh.
        </p>
      </PolicySection>

      <PolicySection id="process" title="6. Refund process & timeline">
        <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
          After we receive your request, we will review payment and fulfillment records. If a refund is approved,
          we will initiate it through Razorpay. Bank credit timelines vary by bank and payment method and may take
          several business days after Razorpay processes the refund.
        </p>
      </PolicySection>

      <PolicySection id="payment" title="7. Payment method for refunds">
        <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
          Approved refunds are returned to the original payment method used at checkout, unless Razorpay or your
          bank requires an alternative process.
        </p>
      </PolicySection>

      <PolicySection id="changes" title="8. Changes to this policy">
        <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
          We may update this Refund Policy from time to time. The &quot;Last updated&quot; date at the top of this page
          will be revised when changes are published. Continued use of CoBrother after updates constitutes acceptance
          of the revised policy.
        </p>
      </PolicySection>

      <PolicySection id="contact" title="9. Contact">
        <PolicyContactCard />
      </PolicySection>
    </LegalPolicyShell>
  );
}
