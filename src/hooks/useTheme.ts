import { useCallback, useEffect, useState } from "react";

type Theme = "dark" | "light";

const THEME_STORAGE_KEY = "tms-theme";

function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle("light", theme === "light");
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>("dark");
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    try {
      const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
      if (savedTheme === "light" || savedTheme === "dark") {
        setTheme(savedTheme);
      }
    } catch (error) {
      console.error("Could not read theme preference", error);
    }
    setIsInitialized(true);
  }, []);

  useEffect(() => {
    if (!isInitialized) {
      return;
    }
    applyTheme(theme);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch (error) {
      console.error("Could not save theme preference", error);
    }
  }, [theme, isInitialized]);

  const toggle = useCallback(
    () => setTheme((currentTheme) => (currentTheme === "dark" ? "light" : "dark")),
    [],
  );

  return { theme, toggle };
}
