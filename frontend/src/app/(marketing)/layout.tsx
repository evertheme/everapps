import MarketingHeader from '@/components/marketing/Header';
import MarketingFooter from '@/components/marketing/Footer';
import { isComingSoonMode } from '@/lib/coming-soon';

export default async function MarketingLayout({ children }: { children: React.ReactNode }) {
  const comingSoon = isComingSoonMode();

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <MarketingHeader hideNavigation={comingSoon} />
      <main className="flex-1">{children}</main>
      <MarketingFooter minimal={comingSoon} />
    </div>
  );
}
