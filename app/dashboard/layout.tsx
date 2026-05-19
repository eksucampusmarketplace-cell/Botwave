import QrAlertBanner from '@/components/ui/QrAlertBanner';
import DashboardFooter from '@/components/layout/DashboardFooter';

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
      <DashboardFooter />
    </>
  );
}
