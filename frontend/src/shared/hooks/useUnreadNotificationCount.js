import { useEffect, useState } from "react";
import { request } from "../services/api";

export default function useUnreadNotificationCount(enabled = true) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!enabled) return undefined;
    let active = true;

    const refresh = () => {
      request("/notifications/unread-count")
        .then((result) => {
          if (active) setCount(Number.isInteger(result.count) ? result.count : 0);
        })
        .catch((error) => {
          if (active) console.error("Could not refresh unread notification count.", error);
        });
    };

    refresh();
    const timer = window.setInterval(refresh, 15000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [enabled]);

  return [count, setCount];
}
