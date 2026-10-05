'use client';

import { InvestorsPage } from '@/components/app/admin';
import { Screen } from '@/components/app/screen';

export default function Investors() {
  return <Screen adminOnly>{(view) => <InvestorsPage view={view} />}</Screen>;
}
