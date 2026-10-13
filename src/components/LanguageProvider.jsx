import { useEffect, useState } from "react";
import { LanguageContext, english } from "../i18n.js";
export default function LanguageProvider({ children }) {
  const [language, setLanguage] = useState(() =>
    localStorage.getItem("nova-language") === "en" ? "en" : "vi",
  );
  useEffect(() => {
    document.documentElement.lang = language;
    localStorage.setItem("nova-language", language);
  }, [language]);
  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        t: (text) => (language === "en" ? english[text] || text : text),
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}
