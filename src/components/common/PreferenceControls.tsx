import {
  DesktopOutlined,
  GlobalOutlined,
  MoonOutlined,
  SunOutlined,
} from "@ant-design/icons";
import { Button, Dropdown, Space, Tooltip } from "antd";
import { useI18n } from "@/i18n";
import { useAppStore, type ThemeMode } from "@/store/useAppStore";

interface PreferenceControlsProps {
  className?: string;
}

export function PreferenceControls({ className = "" }: PreferenceControlsProps) {
  const { locale, t } = useI18n();
  const { setLocale, setThemeMode, themeMode } = useAppStore();
  const themeIcon = {
    system: <DesktopOutlined />,
    light: <SunOutlined />,
    dark: <MoonOutlined />,
  }[themeMode];

  return (
    <Space className={`app-preference-controls ${className}`.trim()} size={4}>
      <Dropdown
        menu={{
          selectable: true,
          selectedKeys: [themeMode],
          items: [
            { key: "system", icon: <DesktopOutlined />, label: t("theme.system") },
            { key: "light", icon: <SunOutlined />, label: t("theme.light") },
            { key: "dark", icon: <MoonOutlined />, label: t("theme.dark") },
          ],
          onClick: ({ key }: { key: string }) => setThemeMode(key as ThemeMode),
        }}
      >
        <Tooltip title={t("header.theme")}>
          <Button
            className="workspace-preference-button"
            type="text"
            aria-label={t("header.theme")}
            icon={themeIcon}
          />
        </Tooltip>
      </Dropdown>
      <Dropdown
        menu={{
          selectable: true,
          selectedKeys: [locale],
          items: [
            { key: "en", label: t("language.english") },
            { key: "vi", label: t("language.vietnamese") },
          ],
          onClick: ({ key }: { key: string }) => setLocale(key as "en" | "vi"),
        }}
      >
        <Tooltip title={t("header.language")}>
          <Button
            className="workspace-language-button"
            type="text"
            aria-label={t("header.language")}
            icon={<GlobalOutlined />}
          >
            {locale.toUpperCase()}
          </Button>
        </Tooltip>
      </Dropdown>
    </Space>
  );
}
