import { useState, useEffect } from "react";
import * as Notifications from "expo-notifications";

export function useNotifications() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    Notifications.getPermissionsAsync().then(({ status }) => {
      setEnabled(status === "granted");
    });
  }, []);

  const toggle = async (value: boolean) => {
    if (value) {
      const { status } = await Notifications.requestPermissionsAsync();
      setEnabled(status === "granted");
    } else {
      setEnabled(false);
    }
  };

  return { enabled, toggle };
}
