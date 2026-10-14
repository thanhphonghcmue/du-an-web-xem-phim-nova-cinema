"use client";
import { MotionConfig } from "framer-motion";
import App from "../App.jsx";
import LanguageProvider from "./LanguageProvider.jsx";
export default function NovaClient() {
  return (
    <MotionConfig reducedMotion="user">
      <LanguageProvider>
        <App />
      </LanguageProvider>
    </MotionConfig>
  );
}
