import { useTranslation } from "react-i18next";

export function StatsPanel() {
  const { t } = useTranslation(undefined, { keyPrefix: "stats" });

  return (
    <div className="stats">
      <div className="stat-card">
        <h3>{t("active_projects")}</h3>
        <span className="value">12</span>
      </div>
      <div className="stat-card">
        <h3>{t("team_members")}</h3>
        <span className="value">8</span>
      </div>
      <div className="stat-card">
        <h3>{t("completed_tasks")}</h3>
        <span className="value">47</span>
      </div>
    </div>
  );
}
