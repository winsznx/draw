'use client';

import { Overview } from '@/components/app/admin';
import { InvestorHome, OutsiderHome } from '@/components/app/investor';
import { Screen } from '@/components/app/screen';

export default function Home() {
  return (
    <Screen>
      {(view) => (view.role === 'admin' ? <Overview view={view} /> : view.role === 'outsider' ? <OutsiderHome view={view} /> : <InvestorHome view={view} />)}
    </Screen>
  );
}
