"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export function useAppTheme() {
  const { theme, setTheme, systemTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Durante la hidratación, evitar mostrar el contenido hasta que esté montado
  if (!mounted) {
    return {
      theme: undefined,
      setTheme,
      systemTheme,
      resolvedTheme: undefined,
      isDark: false,
      isLight: false,
      isSystem: false,
      mounted: false,
    };
  }

  const isDark = resolvedTheme === "dark";
  const isLight = resolvedTheme === "light";
  const isSystem = theme === "system";

  return {
    theme,
    setTheme,
    systemTheme,
    resolvedTheme,
    isDark,
    isLight,
    isSystem,
    mounted,
  };
}
