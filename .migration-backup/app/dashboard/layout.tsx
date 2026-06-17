import QrAlertBanner from '@/components/ui/QrAlertBanner';

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
    </>
  );
}
