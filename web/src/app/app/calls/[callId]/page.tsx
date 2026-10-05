'use client';

import { useParams } from 'next/navigation';

import { CallDetail } from '@/components/app/admin';
import { Screen } from '@/components/app/screen';

export default function Call() {
  const { callId } = useParams<{ callId: string }>();
  return <Screen adminOnly>{(view) => <CallDetail view={view} callId={decodeURIComponent(callId)} />}</Screen>;
}
