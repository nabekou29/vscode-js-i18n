import { useTranslation } from "react-i18next";

export function AppB() {
  const { t } = useTranslation();
  return (
    <div>
      <h1>{t("welcome")}</h1>
      <button>{t("logout")}</button>
    </div>
  );
}
