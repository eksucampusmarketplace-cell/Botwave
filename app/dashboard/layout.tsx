import QrAlertBanner from '@/components/ui/QrAlertBanner';
import SupportChat from '@/components/ui/SupportChat';

export const dynamic = 'force-dynamic';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <QrAlertBanner />
      {children}
      <SupportChat />
    </>
  );
}
