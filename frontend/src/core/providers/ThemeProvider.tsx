"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { ConfigProvider } from "antd";

type Theme = "light" | "dark";

interface ThemeContextType {
    theme: Theme;
    toggleTheme: () => void;
    setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = (): ThemeContextType => {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error("useTheme must be used within a ThemeProvider");
    }
    return context;
};

interface ThemeProviderProps {
    children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
    const [theme, setThemeState] = useState<Theme>("light");
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        // Lấy theme từ localStorage, mặc định là light
        const savedTheme = localStorage.getItem("theme") as Theme;
        if (savedTheme && (savedTheme === "light" || savedTheme === "dark")) {
            setThemeState(savedTheme);
        } else {
            // Mặc định là light theme
            setThemeState("light");
            localStorage.setItem("theme", "light");
        }
    }, []);

    useEffect(() => {
        if (mounted) {
            // Áp dụng theme vào document
            document.documentElement.setAttribute("data-theme", theme);
            localStorage.setItem("theme", theme);
        }
    }, [theme, mounted]);

    const toggleTheme = () => {
        setThemeState((prev) => (prev === "light" ? "dark" : "light"));
    };

    const setTheme = (newTheme: Theme) => {
        setThemeState(newTheme);
    };

    // Tránh hydration mismatch
    if (!mounted) {
        return <>{children}</>;
    }

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
            <ConfigProvider theme={{ token: { fontFamily: 'var(--font-inter), ui-sans-serif, system-ui, sans-serif' } }}>
                {children}
            </ConfigProvider>
        </ThemeContext.Provider>
    );
};

export default ThemeProvider;
