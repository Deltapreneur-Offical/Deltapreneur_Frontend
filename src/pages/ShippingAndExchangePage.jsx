import { Package } from 'lucide-react';
import LegalPolicyShell, { PolicyContactCard, PolicySection } from '../components/common/LegalPolicyShell';

const LAST_UPDATED = '6th August 2026';

const SECTIONS = [
  { id: 'overview', title: '1. Overview' },
  { id: 'nature', title: '2. Nature of our products' },
  { id: 'delivery', title: '3. Digital delivery / “shipping”' },
  { id: 'timelines', title: '4. Delivery timelines' },
  { id: 'exchange', title: '5. Exchange policy' },
  { id: 'failed', title: '6. Failed or delayed delivery' },
  { id: 'changes', title: '7. Changes to this policy' },
  { id: 'contact', title: '8. Contact' },
];

export default function ShippingAndExchangePage() {
  return (
    <LegalPolicyShell
      badgeIcon={Package}
      badge="Shipping & Exchange"
      titleAccent="Shipping & Exchange"
      intro="HubRegistrar primarily sells digital products and services. This page explains how delivery (“shipping”) works for domains and digital goods, and our exchange rules for banking and payment compliance."
      lastUpdated={LAST_UPDATED}
      sections={SECTIONS}
    >
      <PolicySection id="overview" title="1. Overview">
        <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
          HubRegistrar does not operate a physical warehouse or ship parcels for standard storefront purchases.
          Our products are delivered digitally through your HubRegistrar account, email, and/or registrar systems.
        </p>
      </PolicySection>

      <PolicySection id="nature" title="2. Nature of our products">
        <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
          Typical purchases include:
        </p>
        <ul className="mt-2 list-disc pl-5 space-y-1 text-slate-600 text-sm sm:text-base leading-relaxed">
          <li>Domain name registration and related digital domain services</li>
          <li>Marketplace domain and digital asset transactions</li>
          <li>Technology / software and other digital listings</li>
          <li>Professional and platform services arranged through HubRegistrar</li>
        </ul>
      </PolicySection>

      <PolicySection id="delivery" title="3. Digital delivery / “shipping”">
        <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
          <strong>No physical shipping</strong> applies to standard digital orders. After successful payment:
        </p>
        <ul className="mt-2 list-disc pl-5 space-y-1 text-slate-600 text-sm sm:text-base leading-relaxed">
          <li>Domain registrations are provisioned with our registrar partner and appear under your Purchases / order page.</li>
          <li>Marketplace and technology purchases are fulfilled digitally as described on the product page and order confirmation.</li>
          <li>Order status, DNS/management tools (where applicable), and receipts are available in your HubRegistrar account.</li>
        </ul>
        <p className="text-slate-600 text-sm sm:text-base leading-relaxed mt-3">
          If a rare offering involves physical media or on-site service, delivery terms will be stated clearly on that
          product page before checkout.
        </p>
      </PolicySection>

      <PolicySection id="timelines" title="4. Delivery timelines">
        <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
          Most digital fulfillments begin immediately after payment confirmation. Domain registration may take
          minutes to longer depending on registry processing, verification requirements, or registrar queues.
          You can track status in <strong>Purchases</strong> and the related order detail page.
        </p>
      </PolicySection>

      <PolicySection id="exchange" title="5. Exchange policy">
        <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
          Because domains and many digital products are unique or instantly provisioned, <strong>exchanges are
          generally not available</strong> after successful fulfillment. If you received the wrong digital item due
          to a confirmed HubRegistrar error, contact support and we will correct the order or apply the Refund Policy
          as appropriate.
        </p>
        <p className="text-slate-600 text-sm sm:text-base leading-relaxed mt-3">
          See also:{' '}
          <a href="/refund-policy" className="font-medium text-indigo-600 hover:underline">
            Refund Policy
          </a>{' '}
          and{' '}
          <a href="/cancellation-policy" className="font-medium text-indigo-600 hover:underline">
            Cancellation Policy
          </a>
          .
        </p>
      </PolicySection>

      <PolicySection id="failed" title="6. Failed or delayed delivery">
        <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
          If payment succeeds but digital delivery/registration does not complete, contact support with your payment
          ID. Do not make a duplicate payment for the same item. We will investigate and either complete fulfillment
          or process a refund under the Refund Policy.
        </p>
      </PolicySection>

      <PolicySection id="changes" title="7. Changes to this policy">
        <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
          We may update this Shipping &amp; Exchange Policy from time to time. The &quot;Last updated&quot; date on this
          page will change when updates are published.
        </p>
      </PolicySection>

      <PolicySection id="contact" title="8. Contact">
        <PolicyContactCard />
      </PolicySection>
    </LegalPolicyShell>
  );
}
