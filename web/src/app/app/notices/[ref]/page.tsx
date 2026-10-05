'use client';

import { useParams } from 'next/navigation';

import { NoticePage } from '@/components/app/investor';
import { Screen } from '@/components/app/screen';

export default function Notice() {
  const { ref } = useParams<{ ref: string }>();
  return <Screen>{(view) => <NoticePage key={ref} view={view} obligationRef={decodeURIComponent(ref)} />}</Screen>;
}
