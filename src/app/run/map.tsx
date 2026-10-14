import { MapScreen } from '@/features/map/MapScreen';

/**
 * /run/map — the expedition map. The run layout shows this route while
 * `run.screen.type === 'map'`; all logic lives in src/features/map.
 */
export default function MapRoute() {
  return <MapScreen />;
}
