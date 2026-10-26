import { useLocalSearchParams } from 'expo-router';

import { FossilDetailScreen } from '@/features/book/FossilDetailScreen';

/** /fossils/[id] — one fossil book entry; all logic lives in src/features/book. */
export default function FossilDetailRoute() {
  const { id, wiki } = useLocalSearchParams<{ id: string | string[]; wiki?: string }>();
  return <FossilDetailScreen id={id} wiki={wiki === '1'} />;
}
