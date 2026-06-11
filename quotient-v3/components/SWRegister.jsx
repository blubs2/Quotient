"use client";
import { useEffect } from "react";

// Registers the service worker so the site is installable as a PWA.
export default function SWRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);
  return null;
}
