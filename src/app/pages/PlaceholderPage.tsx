// Generic placeholder for MVP screens not yet implemented in this bridging milestone.
// Keeps the shell navigable across the full SPEC §4 screen list without faking features.

import { t } from '../i18n';

export function PlaceholderPage({ title }: { title: string }) {
  return (
    <section className="page">
      <h1 className="page__title">{title}</h1>
      <div className="state state--empty">
        <p>{t.common.comingSoon}</p>
      </div>
    </section>
  );
}
