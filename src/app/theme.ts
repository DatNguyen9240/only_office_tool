import { theme, type ThemeConfig } from "antd";

export function createAppTheme(dark: boolean): ThemeConfig {
  return {
  algorithm: dark ? theme.darkAlgorithm : theme.defaultAlgorithm,
  token: {
    colorPrimary: "#275dad",
    colorInfo: "#275dad",
    colorSuccess: "#2f7d55",
    colorWarning: "#a86412",
    colorError: "#b84444",
    colorText: dark ? "#e9edf4" : "#172033",
    colorTextSecondary: dark ? "#aab4c3" : "#5d687a",
    colorBgLayout: dark ? "#101722" : "#f4f6f8",
    colorBgContainer: dark ? "#18212d" : "#ffffff",
    colorBorder: dark ? "#354152" : "#dbe2ea",
    colorBorderSecondary: dark ? "#2b3544" : "#e5eaf0",
    lineHeight: 1.57,
    boxShadowSecondary: "0 16px 40px rgba(35, 54, 81, 0.14)",
  },
  components: {
    Button: {
      fontWeight: 500,
      primaryShadow: "none",
    },
    Layout: {
      headerBg: dark ? "#18212d" : "#ffffff",
      bodyBg: dark ? "#101722" : "#f4f6f8",
      siderBg: dark ? "#18212d" : "#ffffff",
    },
    Menu: {
      itemBorderRadius: 6,
      itemMarginInline: 8,
      itemSelectedBg: dark ? "#203a59" : "#eaf1fb",
      itemSelectedColor: dark ? "#8bb9f2" : "#275dad",
    },
    Table: {
      headerBg: dark ? "#141c27" : "#f8fafc",
      headerColor: dark ? "#b8c2d0" : "#4f5b6e",
      headerSplitColor: dark ? "#2b3544" : "#e5eaf0",
      rowHoverBg: dark ? "#1b2a3b" : "#f6f9fd",
      cellPaddingBlock: 12,
      cellPaddingInline: 16,
    },
    Tree: {
      nodeHoverBg: dark ? "#1b2a3b" : "#f4f7fb",
      nodeSelectedBg: dark ? "#203a59" : "#eaf1fb",
    },
  },
  };
}
