/* src/hooks/index.ts
export { usePullToRefresh } from './usePullToRefresh';
export { useInfiniteScroll } from './useInfiniteScroll';
// …other hooks
4. Consume them in any component:

import { usePullToRefresh } from '@/hooks';

export default function AppointmentsList() {
  const isRefreshing = usePullToRefresh(() => fetchAppointments());

  return (
    <IonContent
      onPullDownRefresh={async () => {
        await isRefreshing;      // resolves when async work is done
        ionRefresher?.complete(); // tell Capacitor we’re finished
      }}
    >
      {/* …list items…
*/