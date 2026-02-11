import { useTranslation } from "react-i18next";

export function App() {
  const { t } = useTranslation();
  return (
    <div>
      <h1>{t("greeting")}</h1>
      <p>{t("farewell")}</p>
      <p>{t("nonexistent")}</p>
    </div>
  );
}
