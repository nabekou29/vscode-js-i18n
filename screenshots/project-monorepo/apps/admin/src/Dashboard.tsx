import { useTranslation } from "react-i18next";

export function Dashboard() {
  const { t } = useTranslation();

  return (
    <div>
      <aside>
        <nav>
          <a href="/users">{t("sidebar.users")}</a>
          <a href="/orders">{t("sidebar.orders")}</a>
          <a href="/analytics">{t("sidebar.analytics")}</a>
          <a href="/settings">{t("sidebar.settings")}</a>
        </nav>
      </aside>

      <main>
        <h1>{t("dashboard.title")}</h1>
        <div className="stats">
          <div>
            <h3>{t("dashboard.total_orders")}</h3>
            <span>1,234</span>
          </div>
          <div>
            <h3>{t("dashboard.revenue")}</h3>
            <span>$45,678</span>
          </div>
          <div>
            <h3>{t("dashboard.new_users")}</h3>
            <span>89</span>
          </div>
        </div>
      </main>
    </div>
  );
}
