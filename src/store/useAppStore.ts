import { create } from "zustand";
import { persist } from "zustand/middleware";

type ViewMode = "list" | "grid";
export type ThemeMode = "system" | "light" | "dark";
export type AppLocale = "en" | "vi";

interface AppState {
  collapsed: boolean;
  mobileNavOpen: boolean;
  viewMode: ViewMode;
  selectedFolderId: string;
  selectedDocumentId?: string;
  previewOpen: boolean;
  themeMode: ThemeMode;
  locale: AppLocale;
  setCollapsed: (collapsed: boolean) => void;
  setMobileNavOpen: (open: boolean) => void;
  setViewMode: (mode: ViewMode) => void;
  setSelectedFolderId: (id: string) => void;
  selectDocument: (id?: string) => void;
  setPreviewOpen: (open: boolean) => void;
  setThemeMode: (mode: ThemeMode) => void;
  setLocale: (locale: AppLocale) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      collapsed: false,
      mobileNavOpen: false,
      viewMode: "list",
      selectedFolderId: "all",
      previewOpen: true,
      themeMode: "system",
      locale: "en",
      setCollapsed: (collapsed) => set({ collapsed }),
      setMobileNavOpen: (mobileNavOpen) => set({ mobileNavOpen }),
      setViewMode: (viewMode) => set({ viewMode }),
      setSelectedFolderId: (selectedFolderId) =>
        set({ selectedFolderId, selectedDocumentId: undefined }),
      selectDocument: (selectedDocumentId) => set({ selectedDocumentId }),
      setPreviewOpen: (previewOpen) => set({ previewOpen }),
      setThemeMode: (themeMode) => set({ themeMode }),
      setLocale: (locale) => set({ locale }),
    }),
    {
      name: "meridian-dms-ui",
      partialize: (state) => ({
        collapsed: state.collapsed,
        viewMode: state.viewMode,
        selectedFolderId: state.selectedFolderId,
        previewOpen: state.previewOpen,
        themeMode: state.themeMode,
        locale: state.locale,
      }),
    },
  ),
);
