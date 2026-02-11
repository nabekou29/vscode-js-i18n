import { useTranslation } from "react-i18next";

export function ProductPage() {
  const { t } = useTranslation("common");
  const { t: tProduct } = useTranslation("product");

  return (
    <div>
      <nav>
        <a href="/">{t("nav.home")}</a>
        <a href="/products">{t("nav.products")}</a>
        <a href="/cart">{t("nav.cart")}</a>
        <button>{t("actions.login")}</button>
      </nav>

      <main>
        <h1>{tProduct("name")}</h1>
        <p>{tProduct("description")}</p>
        <span>{tProduct("price_label")}</span>
        <span>{tProduct("in_stock")}</span>

        <div>
          <button>{t("actions.add_to_cart")}</button>
          <button>{t("actions.buy_now")}</button>
        </div>

        <section>
          <h2>{tProduct("reviews.title")}</h2>
          <p>{tProduct("reviews.summary")}</p>
        </section>
      </main>
    </div>
  );
}
