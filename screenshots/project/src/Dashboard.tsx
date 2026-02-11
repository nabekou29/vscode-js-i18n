import { useTranslation } from "react-i18next";

export function Dashboard() {
  const { t } = useTranslation();

  return (
    <div className="app">
      <header>
        <h1>{t("app.title")}</h1>
        <nav>
          <a href="/dashboard">{t("nav.dashboard")}</a>
          <a href="/projects">{t("nav.projects")}</a>
          <a href="/team">{t("nav.team")}</a>
          <a href="/settings">{t("nav.settings")}</a>
        </nav>
      </header>

      <main>
        <section className="hero">
          <h2>{t("dashboard.welcome")}</h2>
          <p>{t("dashboard.overview")}</p>
        </section>

        <section className="stats">
          <div className="stat-card">
            <h3>{t("stats.active_projects")}</h3>
            <span className="value">12</span>
          </div>
          <div className="stat-card">
            <h3>{t("stats.team_members")}</h3>
            <span className="value">8</span>
          </div>
          <div className="stat-card">
            <h3>{t("stats.completed_tasks")}</h3>
            <span className="value">47</span>
          </div>
        </section>

        <section className="actions">
          <button>{t("actions.create_project")}</button>
          <button>{t("actions.invite_member")}</button>
        </section>

        <section className="activity">
          <h3>{t("dashboard.recent_activity")}</h3>
          <a href="/activity">{t("actions.view_all")}</a>
        </section>
      </main>

      <footer>
        <p>{t("footer.copyright")}</p>
        <a href="/privacy">{t("footer.privacy_policy")}</a>
        <a href="/terms">{t("footer.terms_of_service")}</a>
      </footer>
    </div>
  );
}
