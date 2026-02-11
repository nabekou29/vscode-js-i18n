import { useTranslation } from "react-i18next";

export function App() {
  const { t } = useTranslation();

  return (
    <div>
      <nav>
        <a href="/">{t("nav.home")}</a>
        <a href="/products">{t("nav.products")}</a>
        <a href="/about">{t("nav.about")}</a>
      </nav>

      <section className="hero">
        <h1>{t("hero.title")}</h1>
        <p>{t("hero.subtitle")}</p>
        <button>{t("cta.shop_now")}</button>
        <a href="/about">{t("cta.learn_more")}</a>
      </section>
    </div>
  );
}
