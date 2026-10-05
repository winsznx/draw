'use client';

import { CreateCall } from '@/components/app/admin';
import { Screen } from '@/components/app/screen';

export default function NewCall() {
  return <Screen adminOnly>{(view) => <CreateCall key={view.calls.length} view={view} />}</Screen>;
}
