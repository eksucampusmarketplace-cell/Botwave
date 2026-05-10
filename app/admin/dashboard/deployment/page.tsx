'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import DeploymentTab from '@/components/admin/DeploymentTab';

export default function DeploymentPage() {
  const router = useRouter();
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    fetch('/api/admin/stats').then(res => {
      if (res.status === 401) router.push('/admin/login');
      else setAuthed(true);
    });
  }, [router]);

  if (!authed) return null;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Deployment Controls</h1>
        <p className="text-gray-500 text-sm mt-1">Deploy, restart, and manage containers</p>
      </div>
      <DeploymentTab />
    </div>
  );
}
