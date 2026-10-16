import { ANNOUNCER_IDS } from '@/shared/lib/announce'

/** Live regions globais escritas por `announce()`; montadas uma única vez no root. */
export function Announcer() {
  return (
    <div className="sr-only">
      <div id={ANNOUNCER_IDS.polite} role="status" aria-live="polite" aria-atomic="true" />
      <div id={ANNOUNCER_IDS.assertive} role="alert" aria-live="assertive" aria-atomic="true" />
    </div>
  )
}
