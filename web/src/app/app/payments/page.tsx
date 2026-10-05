'use client';

import { PaymentsPage } from '@/components/app/admin';
import { Screen } from '@/components/app/screen';

export default function Payments() {
  return <Screen adminOnly>{(view) => <PaymentsPage view={view} />}</Screen>;
}
