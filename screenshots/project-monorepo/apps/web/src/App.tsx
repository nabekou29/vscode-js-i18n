import { useTranslation } from "react-i18next";

export function App() {
  const { t } = useTranslation();

  return (
    <div>
      <header>
        <h1>{t("app.title")}</h1>
        <p>{t("app.description")}</p>
      </header>

      <nav>
        <a href="/">{t("nav.home")}</a>
        <a href="/products">{t("nav.products")}</a>
        <a href="/about">{t("nav.about")}</a>
      </nav>

      <section className="hero">
        <h2>{t("hero.title")}</h2>
        <p>{t("hero.subtitle")}</p>
        <button>{t("cta.shop_now")}</button>
      </section>
    </div>
  );
}
