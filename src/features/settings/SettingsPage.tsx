// M9.1 — Settings: language selector + local-first/privacy information.
//
// No persisted app settings beyond language (which lives in the nav/locale context, shared with the
// sidebar selector). Everything else is read-only explanatory copy reinforcing the privacy posture.

import { useAppNav } from '../../app/nav-context';
import { t, type Locale } from '../../app/i18n';

// Keep in sync with package.json / src-tauri/tauri.conf.json version.
const APP_VERSION = '0.1.0';

export function SettingsPage() {
  const { locale, setLocale } = useAppNav();

  return (
    <section className="page">
      <h1 className="page__title">{t.settings.title}</h1>
      <p className="muted">{t.settings.intro}</p>

      <div className="settings-section">
        <h2 className="section-title">{t.settings.langTitle}</h2>
        <p className="muted">{t.settings.langDesc}</p>
        <label className="field">
          <span className="field__label">{t.lang.label}</span>
          <select
            className="field__input"
            value={locale}
            onChange={(e) => setLocale(e.currentTarget.value as Locale)}
          >
            <option value="vi">{t.lang.vi}</option>
            <option value="en">{t.lang.en}</option>
          </select>
        </label>
      </div>

      <div className="settings-section">
        <h2 className="section-title">{t.settings.privacyTitle}</h2>
        <p className="muted">{t.settings.privacyDesc}</p>
      </div>

      <div className="settings-section">
        <h2 className="section-title">{t.settings.aiTitle}</h2>
        <p className="muted">{t.settings.aiDesc}</p>
      </div>

      <div className="settings-section">
        <h2 className="section-title">{t.settings.storageTitle}</h2>
        <p className="muted">{t.settings.storageDesc}</p>
      </div>

      <div className="settings-section">
        <h2 className="section-title">{t.settings.demoTitle}</h2>
        <p className="muted">{t.settings.demoDesc}</p>
      </div>

      <div className="settings-section">
        <h2 className="section-title">{t.settings.noCloudTitle}</h2>
        <p className="muted">{t.settings.noCloudDesc}</p>
      </div>

      <p className="muted settings-version">
        {t.settings.versionLabel}: {APP_VERSION}
      </p>
    </section>
  );
}
