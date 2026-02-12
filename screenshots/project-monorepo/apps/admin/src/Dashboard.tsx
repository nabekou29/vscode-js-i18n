import { useTranslation } from "react-i18next";

export function Dashboard() {
  const { t } = useTranslation();

  return (
    <div>
      <header>
        <h1>{t("app.title")}</h1>
        <p>{t("app.description")}</p>
      </header>

      <aside>
        <nav>
          <a href="/">{t("nav.home")}</a>
          <a href="/orders">{t("nav.orders")}</a>
          <a href="/analytics">{t("nav.analytics")}</a>
          <a href="/settings">{t("nav.settings")}</a>
        </nav>
      </aside>

      <main>
        <h2>{t("dashboard.total_orders")}</h2>
        <span>1,234</span>
        <h2>{t("dashboard.revenue")}</h2>
        <span>$45,678</span>
        <h2>{t("dashboard.new_users")}</h2>
        <span>89</span>
      </main>
    </div>
  );
}
