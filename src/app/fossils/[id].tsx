import { useLocalSearchParams } from 'expo-router';

import { FossilDetailScreen } from '@/features/book/FossilDetailScreen';

/** /fossils/[id] — one fossil book entry; all logic lives in src/features/book. */
export default function FossilDetailRoute() {
  const { id } = useLocalSearchParams<{ id: string | string[] }>();
  return <FossilDetailScreen id={id} />;
}
