import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type ColorScheme = 'light' | 'dark';

interface ThemeState {
    colorScheme: ColorScheme;
    toggleTheme: () => void;
    setTheme: (theme: ColorScheme) => void;
}

export const useThemeStore = create<ThemeState>()(
    persist(
        (set) => ({
            colorScheme: 'light',
            toggleTheme: () =>
                set((state) => ({
                    colorScheme: state.colorScheme === 'light' ? 'dark' : 'light',
                })),
            setTheme: (theme) => set({ colorScheme: theme }),
        }),
        {
            name: 'adynic-theme-storage',
        }
    )
);
