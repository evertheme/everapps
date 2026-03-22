import Link from 'next/link';
import { CheckCircle, Minus, ArrowRight, Sparkles, Zap, Building2 } from 'lucide-react';

/* ─── Tier definitions ──────────────────────────────────────────────────────── */

interface PricingTier {
  name: string;
  price: string;
  priceNote?: string;
  description: string;
  cta: string;
  ctaHref: string;
  ctaVariant: 'primary' | 'secondary' | 'enterprise';
  badge?: string;
  features: string[];
  notIncluded?: string[];
}

const TIERS: PricingTier[] = [
  {
    name: 'Free',
    price: '$0',
    priceNote: 'forever',
    description: 'Perfect for individuals exploring AI story generation.',
    cta: 'Get started',
    ctaHref: '/register',
    ctaVariant: 'secondary',
    features: [
      '3 projects',
      '5 document uploads / month',
      '50 generated stories / month',
      'OpenAI & Anthropic support',
      '1 PM tool integration',
      'Story version history',
      'Community support',
    ],
    notIncluded: ['AI story review', 'Bulk export', 'Ollama / Azure AI', 'Priority support'],
  },
  {
    name: 'Hobby',
    price: '$20',
    priceNote: 'per month',
    description: 'For solo practitioners who rely on everapps every sprint.',
    cta: 'Start Hobby',
    ctaHref: '/register?plan=hobby',
    ctaVariant: 'primary',
    badge: 'Most popular',
    features: [
      '10 projects',
      '20 document uploads / month',
      '200 generated stories / month',
      'All LLM providers incl. Ollama',
      '3 PM tool integrations',
      'AI story review',
      'Bulk export',
      'Story & document versioning',
      'Email support',
    ],
  },
  {
    name: 'Growth',
    price: '$60',
    priceNote: 'per month',
    description: 'For teams that need unlimited generation and full integrations.',
    cta: 'Start Growth',
    ctaHref: '/register?plan=growth',
    ctaVariant: 'primary',
    features: [
      'Unlimited projects',
      'Unlimited document uploads',
      'Unlimited generated stories',
      'All LLM providers incl. Ollama',
      'All PM tool integrations',
      'AI story review',
      'Bulk export',
      'Story & document versioning',
      'Team collaboration (up to 5 users)',
      'Custom LLM configuration',
      'Priority email support',
    ],
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    description: 'For large organisations with custom requirements and compliance needs.',
    cta: 'Contact sales',
    ctaHref: 'mailto:sales@everapps.io',
    ctaVariant: 'enterprise',
    features: [
      'Everything in Growth',
      'Unlimited users',
      'SSO / SAML authentication',
      'Custom PM tool integrations',
      'On-premise deployment option',
      'Custom LLM model configuration',
      'Dedicated success manager',
      '99.9% uptime SLA',
      'Priority 24 / 7 support',
      'Custom contracts & invoicing',
    ],
  },
];

/* ─── Feature comparison table data ─────────────────────────────────────────── */

interface ComparisonRow {
  feature: string;
  free: string | boolean;
  hobby: string | boolean;
  growth: string | boolean;
  enterprise: string | boolean;
}

const COMPARISON: ComparisonRow[] = [
  { feature: 'Projects', free: '3', hobby: '10', growth: 'Unlimited', enterprise: 'Unlimited' },
  { feature: 'Document uploads / mo', free: '5', hobby: '20', growth: 'Unlimited', enterprise: 'Unlimited' },
  { feature: 'Generated stories / mo', free: '50', hobby: '200', growth: 'Unlimited', enterprise: 'Unlimited' },
  { feature: 'AI story review', free: false, hobby: true, growth: true, enterprise: true },
  { feature: 'Bulk export to PM tools', free: false, hobby: true, growth: true, enterprise: true },
  { feature: 'OpenAI & Anthropic', free: true, hobby: true, growth: true, enterprise: true },
  { feature: 'Azure OpenAI & Ollama', free: false, hobby: true, growth: true, enterprise: true },
  { feature: 'PM integrations', free: '1', hobby: '3', growth: 'All', enterprise: 'All + custom' },
  { feature: 'Team members', free: '1', hobby: '1', growth: '5', enterprise: 'Unlimited' },
  { feature: 'SSO / SAML', free: false, hobby: false, growth: false, enterprise: true },
  { feature: 'On-premise option', free: false, hobby: false, growth: false, enterprise: true },
  { feature: 'SLA', free: false, hobby: false, growth: false, enterprise: '99.9%' },
  { feature: 'Support', free: 'Community', hobby: 'Email', growth: 'Priority email', enterprise: '24 / 7 dedicated' },
];

/* ─── Components ─────────────────────────────────────────────────────────────── */

function TierCard({ tier }: { tier: PricingTier }) {
  const isHighlighted = tier.ctaVariant === 'primary' && tier.badge;

  return (
    <div
      className={`relative flex flex-col rounded-2xl p-8 ${
        isHighlighted
          ? 'bg-brand-600 text-white shadow-2xl shadow-brand-200 ring-2 ring-brand-600 scale-[1.02]'
          : 'bg-white border border-gray-200 shadow-sm'
      }`}
    >
      {tier.badge && (
        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-500 border border-brand-400 px-4 py-1 text-xs font-semibold text-white shadow">
            <Sparkles className="w-3 h-3" />
            {tier.badge}
          </span>
        </div>
      )}

      {/* Header */}
      <div className="mb-7">
        <h3
          className={`text-lg font-bold mb-1 ${
            isHighlighted ? 'text-white' : 'text-gray-900'
          }`}
        >
          {tier.name}
        </h3>
        <div className="flex items-end gap-1.5 mb-3">
          <span
            className={`text-4xl font-extrabold ${
              isHighlighted ? 'text-white' : 'text-gray-900'
            }`}
          >
            {tier.price}
          </span>
          {tier.priceNote && (
            <span
              className={`text-sm pb-1 ${
                isHighlighted ? 'text-brand-200' : 'text-gray-500'
              }`}
            >
              {tier.priceNote}
            </span>
          )}
        </div>
        <p
          className={`text-sm leading-relaxed ${
            isHighlighted ? 'text-brand-100' : 'text-gray-500'
          }`}
        >
          {tier.description}
        </p>
      </div>

      {/* CTA */}
      <Link
        href={tier.ctaHref}
        className={`mb-8 w-full inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold transition-colors ${
          tier.ctaVariant === 'primary' && isHighlighted
            ? 'bg-white text-brand-600 hover:bg-brand-50 shadow-sm'
            : tier.ctaVariant === 'enterprise'
            ? 'bg-gray-900 text-white hover:bg-gray-800 shadow-sm'
            : 'bg-brand-600 text-white hover:bg-brand-700 shadow-sm'
        }`}
      >
        {tier.cta}
        <ArrowRight className="w-4 h-4" />
      </Link>

      {/* Feature list */}
      <ul className="space-y-3 flex-1">
        {tier.features.map((f) => (
          <li key={f} className="flex items-start gap-2.5">
            <CheckCircle
              className={`w-4 h-4 mt-0.5 shrink-0 ${
                isHighlighted ? 'text-brand-200' : 'text-brand-500'
              }`}
            />
            <span
              className={`text-sm ${
                isHighlighted ? 'text-brand-50' : 'text-gray-600'
              }`}
            >
              {f}
            </span>
          </li>
        ))}
        {tier.notIncluded?.map((f) => (
          <li key={f} className="flex items-start gap-2.5 opacity-50">
            <Minus className="w-4 h-4 mt-0.5 shrink-0 text-gray-400" />
            <span className="text-sm text-gray-400 line-through">{f}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ComparisonCell({ value }: { value: string | boolean }) {
  if (value === true) return <CheckCircle className="w-5 h-5 text-brand-500 mx-auto" />;
  if (value === false) return <Minus className="w-4 h-4 text-gray-300 mx-auto" />;
  return <span className="text-sm text-gray-700">{value}</span>;
}

/* ─── Page ──────────────────────────────────────────────────────────────────── */

export const metadata = { title: 'Pricing — everapps' };

export default function PricingPage() {
  return (
    <>
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="bg-gradient-to-b from-brand-50 to-white pt-20 pb-6 sm:pt-28 sm:pb-10 text-center px-4">
        <div className="inline-flex items-center gap-2 bg-brand-100 text-brand-700 rounded-full px-4 py-1.5 text-sm font-medium mb-6 ring-1 ring-brand-200">
          <Zap className="w-3.5 h-3.5" />
          Simple, transparent pricing
        </div>
        <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 tracking-tight mb-4">
          Start free. Scale as you grow.
        </h1>
        <p className="text-lg text-gray-500 max-w-xl mx-auto mb-2">
          No hidden fees. No per-seat surprises. Cancel anytime.
        </p>
      </section>

      {/* ── Tier cards ───────────────────────────────────────────────────── */}
      <section className="py-16 px-4">
        <div className="max-w-7xl mx-auto grid sm:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch">
          {TIERS.map((tier) => (
            <TierCard key={tier.name} tier={tier} />
          ))}
        </div>
      </section>

      {/* ── Feature comparison ───────────────────────────────────────────── */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-10">
            Full feature comparison
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600 w-1/3">
                    Feature
                  </th>
                  {TIERS.map((t) => (
                    <th
                      key={t.name}
                      className={`px-6 py-4 text-center text-sm font-bold ${
                        t.badge ? 'text-brand-600' : 'text-gray-900'
                      }`}
                    >
                      {t.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {COMPARISON.map((row, i) => (
                  <tr
                    key={row.feature}
                    className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50/60'}
                  >
                    <td className="px-6 py-3.5 text-sm text-gray-700 font-medium">{row.feature}</td>
                    <td className="px-6 py-3.5 text-center">
                      <ComparisonCell value={row.free} />
                    </td>
                    <td className="px-6 py-3.5 text-center">
                      <ComparisonCell value={row.hobby} />
                    </td>
                    <td className="px-6 py-3.5 text-center">
                      <ComparisonCell value={row.growth} />
                    </td>
                    <td className="px-6 py-3.5 text-center">
                      <ComparisonCell value={row.enterprise} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ── Enterprise callout ───────────────────────────────────────────── */}
      <section className="py-16 px-4">
        <div className="max-w-3xl mx-auto bg-gray-900 rounded-2xl p-10 text-center shadow-xl">
          <Building2 className="w-10 h-10 text-gray-400 mx-auto mb-5" />
          <h2 className="text-2xl font-bold text-white mb-3">Need a custom plan?</h2>
          <p className="text-gray-400 mb-8 leading-relaxed">
            For large teams, on-premise deployments, custom integrations, or procurement requirements,
            our sales team will build a solution that works for you.
          </p>
          <Link
            href="mailto:sales@everapps.io"
            className="inline-flex items-center gap-2 rounded-xl bg-white px-8 py-3.5 text-sm font-semibold text-gray-900 hover:bg-gray-100 transition-colors shadow"
          >
            Talk to sales
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* ── Bottom CTA ───────────────────────────────────────────────────── */}
      <section className="py-20 bg-brand-600 text-center px-4">
        <h2 className="text-3xl font-extrabold text-white mb-4">Ready to ship faster?</h2>
        <p className="text-brand-200 mb-8 max-w-lg mx-auto">
          Start on the Free tier today. Upgrade when you need more — no pressure, no surprises.
        </p>
        <Link
          href="/register"
          className="inline-flex items-center gap-2 rounded-xl bg-white px-8 py-3.5 text-base font-semibold text-brand-600 hover:bg-brand-50 transition-colors shadow-md"
        >
          Create a free account
          <ArrowRight className="w-4 h-4" />
        </Link>
      </section>
    </>
  );
}
