import { useTranslation } from "react-i18next";

export function AppA() {
  const { t } = useTranslation();
  return (
    <div>
      <h1>{t("greeting")}</h1>
      <p>{t("farewell")}</p>
    </div>
  );
}
