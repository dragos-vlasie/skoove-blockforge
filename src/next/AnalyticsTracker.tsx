"use client";

import { useEffect } from "react";

export function AnalyticsTracker() {
  useEffect(() => {
    if (navigator.webdriver || ["localhost", "127.0.0.1"].includes(location.hostname)) return;
    const createId = () => crypto.randomUUID?.() || `bf-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const sessionId = sessionStorage.getItem("bf:analytics-session-id") || createId();
    const visitorId = localStorage.getItem("bf:analytics-visitor-id") || createId();
    sessionStorage.setItem("bf:analytics-session-id", sessionId);
    localStorage.setItem("bf:analytics-visitor-id", visitorId);
    const send = (eventType: "page_view" | "click", target = "") => {
      const body = JSON.stringify({ event_type: eventType, path: location.pathname, title: document.title, target, referrer: document.referrer, session_id: sessionId, visitor_id: visitorId });
      if (navigator.sendBeacon) navigator.sendBeacon("/api/views", new Blob([body], { type: "application/json" }));
      else fetch("/api/views", { method: "POST", headers: { "content-type": "application/json" }, body, keepalive: true }).catch(() => undefined);
    };
    send("page_view");
    const click = (event: MouseEvent) => {
      const element = (event.target as Element | null)?.closest?.("[data-track], a[href], button");
      if (!element) return;
      send("click", element.getAttribute("data-track") || element.getAttribute("href") || element.getAttribute("aria-label") || element.textContent?.trim().replace(/\s+/g, " ").slice(0, 80) || element.tagName.toLowerCase());
    };
    document.addEventListener("click", click, { capture: true });
    return () => document.removeEventListener("click", click, { capture: true });
  }, []);
  return null;
}
