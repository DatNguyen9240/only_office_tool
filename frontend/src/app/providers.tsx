import type { PropsWithChildren } from "react";
import { useEffect, useMemo, useState } from "react";
import { App as AntApp, ConfigProvider } from "antd";
import enUS from "antd/locale/en_US";
import viVN from "antd/locale/vi_VN";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ProConfigProvider, enUSIntl, viVNIntl } from "@ant-design/pro-components";
import { I18nProvider } from "@/i18n";
import { useAppStore } from "@/store/useAppStore";
import { useAuthStore } from "@/store/useAuthStore";
import { createAppTheme } from "@/app/theme";
import { AuthBootstrap } from "@/app/AuthBootstrap";

export function AppProviders({ children }: PropsWithChildren) {
  const { locale, themeMode } = useAppStore();
  const authUserId = useAuthStore((state) => state.user?.id);
  const [systemDark, setSystemDark] = useState(
    () => window.matchMedia("(prefers-color-scheme: dark)").matches,
  );
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            retry: 1,
          },
        },
      }),
  );
  const dark = themeMode === "dark" || (themeMode === "system" && systemDark);
  const currentTheme = useMemo(() => createAppTheme(dark), [dark]);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const update = (event: MediaQueryListEvent) => setSystemDark(event.matches);
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = dark ? "dark" : "light";
    document.documentElement.lang = locale;
  }, [dark, locale]);

  useEffect(() => {
    queryClient.removeQueries({ queryKey: ["documents"] });
  }, [authUserId, queryClient]);

  return (
    <QueryClientProvider client={queryClient}>
      <I18nProvider locale={locale}>
        <ConfigProvider theme={currentTheme} locale={locale === "vi" ? viVN : enUS}>
          <ProConfigProvider intl={locale === "vi" ? viVNIntl : enUSIntl}>
            <AntApp>
              <AuthBootstrap>{children}</AuthBootstrap>
            </AntApp>
          </ProConfigProvider>
        </ConfigProvider>
      </I18nProvider>
    </QueryClientProvider>
  );
}
