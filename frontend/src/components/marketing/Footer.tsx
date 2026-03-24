import Image from 'next/image';
import Link from 'next/link';

const FOOTER_LINKS: Record<string, { label: string; href: string }[]> = {
  Product: [
    { label: 'Features', href: '/#features' },
    { label: 'Use Cases', href: '/#use-cases' },
    { label: 'Pricing', href: '/pricing' },
    { label: 'FAQ', href: '/#faq' },
  ],
  Company: [
    { label: 'About', href: '#' },
    { label: 'Contact', href: '#' },
  ],
  Legal: [
    { label: 'Privacy Policy', href: '#' },
    { label: 'Terms of Service', href: '#' },
  ],
};

type MarketingFooterProps = {
  /** When true, show brand blurb and copyright only (no links). */
  minimal?: boolean;
};

export default function MarketingFooter({ minimal = false }: MarketingFooterProps) {
  if (minimal) {
    return (
      <footer className="bg-gray-900 text-gray-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
            <div>
              <div className="inline-block mb-3">
                <Image src="/images/brand/logo-light.png" alt="everapps" width={155} height={32} />
              </div>
              <p className="text-sm leading-relaxed max-w-md">
                AI-powered requirements-to-backlog automation for modern product teams.
              </p>
            </div>
            <span className="text-sm shrink-0">
              © {new Date().getFullYear()} everapps. All rights reserved.
            </span>
          </div>
        </div>
      </footer>
    );
  }

  return (
    <footer className="bg-gray-900 text-gray-400">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-10 mb-14">
          {/* Brand column */}
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="inline-block mb-4">
              <Image src="/images/brand/logo-light.png" alt="everapps" width={155} height={32} />
            </Link>
            <p className="text-sm leading-relaxed">
              AI-powered requirements-to-backlog automation for modern product teams.
            </p>
          </div>

          {/* Link columns */}
          {Object.entries(FOOTER_LINKS).map(([group, items]) => (
            <div key={group}>
              <h4 className="text-sm font-semibold text-white mb-4">{group}</h4>
              <ul className="space-y-3">
                {items.map((item) => (
                  <li key={item.label}>
                    <Link
                      href={item.href}
                      className="text-sm hover:text-white transition-colors"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="border-t border-gray-800 pt-8 flex flex-col sm:flex-row justify-between items-center gap-3 text-sm">
          <span>© {new Date().getFullYear()} everapps. All rights reserved.</span>
          <div className="flex items-center gap-6">
            <Link href="/login" className="hover:text-white transition-colors">
              Log in
            </Link>
            <Link href="/register" className="hover:text-white transition-colors">
              Sign up free
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
