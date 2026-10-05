'use client';

import { CallsPage } from '@/components/app/admin';
import { Screen } from '@/components/app/screen';

export default function Calls() {
  return <Screen adminOnly>{(view) => <CallsPage view={view} />}</Screen>;
}
