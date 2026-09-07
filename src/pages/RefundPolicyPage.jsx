import { RefreshCcw } from 'lucide-react';
import LegalPolicyShell, { PolicyContactCard, PolicySection } from '../components/common/LegalPolicyShell';
import { BUSINESS_LEGAL_NAME } from '../config/contactLinks';

const LAST_UPDATED = '7th August 2026';

const SECTIONS = [
  { id: 'overview', title: '1. Overview' },
  { id: 'scope', title: '2. Scope of this policy' },
  { id: 'eligible', title: '3. When refunds are available' },
  { id: 'non-refundable', title: '4. Non-refundable items' },
  { id: 'how-to', title: '5. How to request a refund' },
  { id: 'process', title: '6. Refund process & timeline' },
  { id: 'payment', title: '7. Payment method for refunds' },
  { id: 'failed', title: '8. Failed or cancelled payments' },
  { id: 'regulatory', title: '9. Regulatory compliance' },
  { id: 'changes', title: '10. Changes to this policy' },
  { id: 'contact', title: '11. Contact & grievance' },
];

export default function RefundPolicyPage() {
  return (
    <LegalPolicyShell
      badgeIcon={RefreshCcw}
      badge="Refund Policy"
      titleAccent="Refund Policy"
      intro={`This Refund Policy explains when and how ${BUSINESS_LEGAL_NAME} (Deltapreneur) issues refunds for payments made in INR on www.deltapreneur.com for domain registrations, marketplace purchases, technology products, and related digital services.`}
      lastUpdated={LAST_UPDATED}
      sections={SECTIONS}
      documentTitle="Refund Policy | Deltapreneur"
      documentDescription="Deltapreneur Refund Policy — eligibility, timelines (5-7 business days), how to request refunds, and grievance contact for www.deltapreneur.com."
    >
      <PolicySection id="overview" title="1. Overview">
        <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
          Deltapreneur is operated by {BUSINESS_LEGAL_NAME}. Payments on www.deltapreneur.com are processed securely through
          authorized payment partners (including Razorpay and HDFC Bank SmartGateway / other RBI-regulated payment
          aggregators or banks enabled on our checkout). This policy applies to all purchases completed on our website
          and related checkout flows.
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
        <p className="text-slate-600 text-sm sm:text-base leading-relaxed mt-3">
          All prices are displayed in Indian Rupees (INR). For order cancellation before fulfillment, see our{' '}
          <a href="/cancellation-policy" className="font-medium text-indigo-600 hover:underline">
            Cancellation Policy
          </a>
          .
        </p>
      </PolicySection>

      <PolicySection id="eligible" title="3. When refunds are available">
        <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
          You may be eligible for a full or partial refund in these cases:
        </p>
        <ul className="mt-2 list-disc pl-5 space-y-1 text-slate-600 text-sm sm:text-base leading-relaxed">
          <li>Payment was successfully captured but the service could not be fulfilled (for example, domain registration failed after payment).</li>
          <li>You cancelled an order in accordance with our Cancellation Policy before digital fulfillment completed.</li>
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
          <li>Payment gateway convenience fees or surcharges, where charged separately and disclosed at checkout (only the eligible transaction amount is refunded).</li>
        </ul>
        <p className="text-slate-600 text-sm sm:text-base leading-relaxed mt-3">
          Domain names are unique digital assets. Once registration is completed with the registry, we typically cannot reverse the registration, so refunds are not available in that case.
        </p>
      </PolicySection>

      <PolicySection id="how-to" title="5. How to request a refund">
        <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
          To request a refund, contact Deltapreneur Support with:
        </p>
        <ul className="mt-2 list-disc pl-5 space-y-1 text-slate-600 text-sm sm:text-base leading-relaxed">
          <li>Registered email / phone used at checkout</li>
          <li>Order or payment reference (Payment ID / Order ID from your receipt)</li>
          <li>Product or domain name</li>
          <li>Brief reason for the request</li>
        </ul>
        <p className="text-slate-600 text-sm sm:text-base leading-relaxed mt-3">
          Please raise refund requests promptly after the issue occurs so we can investigate while payment and provision records are fresh.
        </p>
      </PolicySection>

      <PolicySection id="process" title="6. Refund process & timeline">
        <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
          After we receive your request, we will review payment and fulfillment records and respond within{' '}
          <strong>2 business days</strong> with approval, rejection, or a request for more information. If a refund is
          approved, we will initiate it through our payment partner within <strong>2 business days</strong> of approval.
        </p>
        <p className="text-slate-600 text-sm sm:text-base leading-relaxed mt-3">
          Once initiated, refunds are typically credited to your original payment method within{' '}
          <strong>5 to 7 business days</strong> (and in any case within <strong>10 business days</strong>), depending on
          your bank, card network, or UPI provider. Partial refunds may be issued where only part of an order is
          reversed.
        </p>
      </PolicySection>

      <PolicySection id="payment" title="7. Payment method for refunds">
        <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
          Approved refunds are returned to the <strong>original payment method</strong> used at checkout (same card,
          bank account, or UPI handle), in line with RBI and payment-network rules. We do not refund to third-party
          accounts except where the payment partner requires an alternative process for failed transfers.
        </p>
      </PolicySection>

      <PolicySection id="failed" title="8. Failed or cancelled payments">
        <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
          If your account was debited but the order was not completed (payment failed, abandoned, or duplicate after a
          technical error), we will initiate a refund after verification. Such refunds are processed within{' '}
          <strong>5 business days (T+5)</strong> from confirmation, and the amount should reflect in your account within{' '}
          <strong>5 to 7 business days</strong> thereafter, subject to your bank&apos;s processing time.
        </p>
      </PolicySection>

      <PolicySection id="regulatory" title="9. Regulatory compliance">
        <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
          This Refund Policy is published in accordance with the Consumer Protection (E-Commerce) Rules, 2020 and
          applicable RBI guidance on digital payments. It should be read together with our{' '}
          <a href="/terms-and-conditions" className="font-medium text-indigo-600 hover:underline">
            Terms and Conditions
          </a>
          ,{' '}
          <a href="/cancellation-policy" className="font-medium text-indigo-600 hover:underline">
            Cancellation Policy
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
          We may update this Refund Policy from time to time. The &quot;Last updated&quot; date at the top of this page
          will be revised when changes are published. Continued use of Deltapreneur after updates constitutes acceptance
          of the revised policy.
        </p>
      </PolicySection>

      <PolicySection id="contact" title="11. Contact & grievance">
        <PolicyContactCard />
      </PolicySection>
    </LegalPolicyShell>
  );
}
