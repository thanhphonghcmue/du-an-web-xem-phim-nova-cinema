"use client";
import { MotionConfig } from "framer-motion";
import CatalogProvider from "./CatalogProvider.jsx";
import App from "../App.jsx";
import LanguageProvider from "./LanguageProvider.jsx";
export default function NovaClient() {
  return (
    <MotionConfig reducedMotion="user">
      <LanguageProvider>
        <CatalogProvider>
          <App />
        </CatalogProvider>
      </LanguageProvider>
    </MotionConfig>
  );
}
