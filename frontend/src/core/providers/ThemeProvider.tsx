"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { ConfigProvider, theme as antTheme } from "antd";

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
        return {
            theme: "light",
            toggleTheme: () => {},
            setTheme: () => {},
        };
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
        // Lấy theme từ localStorage, fallback sang system preference hoặc light
        const savedTheme = localStorage.getItem("theme") as Theme;
        if (savedTheme && (savedTheme === "light" || savedTheme === "dark")) {
            setThemeState(savedTheme);
        } else if (typeof window !== "undefined" && window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) {
            setThemeState("dark");
        } else {
            setThemeState("light");
        }
    }, []);

    useEffect(() => {
        if (mounted) {
            // Áp dụng theme vào document qua attribute và class
            document.documentElement.setAttribute("data-theme", theme);
            if (theme === "dark") {
                document.documentElement.classList.add("dark");
            } else {
                document.documentElement.classList.remove("dark");
            }
            localStorage.setItem("theme", theme);
        }
    }, [theme, mounted]);

    const toggleTheme = () => {
        setThemeState((prev) => (prev === "light" ? "dark" : "light"));
    };

    const setTheme = (newTheme: Theme) => {
        setThemeState(newTheme);
    };

    const isDark = mounted ? theme === "dark" : false;

    return (
        <ThemeContext.Provider value={{ theme: mounted ? theme : "light", toggleTheme, setTheme }}>
            <ConfigProvider
                theme={{
                    algorithm: isDark ? antTheme.darkAlgorithm : antTheme.defaultAlgorithm,
                    token: {
                        fontFamily: 'var(--font-inter), ui-sans-serif, system-ui, sans-serif',
                        colorPrimary: '#059669', // VietSign emerald primary-600
                        colorPrimaryHover: '#10b981', // primary-500
                        colorPrimaryActive: '#047857', // primary-700
                        colorLink: isDark ? '#34d399' : '#059669',
                        colorLinkHover: isDark ? '#6ee7b7' : '#047857',
                        ...(isDark
                            ? {
                                colorBgBase: '#111827',
                                colorBgContainer: '#1f2937',
                                colorBgElevated: '#374151',
                                colorBgLayout: '#0b0f19',
                                colorText: '#f9fafb',
                                colorTextSecondary: '#e5e7eb',
                                colorTextTertiary: '#9ca3af',
                                colorTextQuaternary: '#6b7280',
                                colorBorder: '#374151',
                                colorBorderSecondary: '#1f2937',
                            }
                            : {
                                colorBgBase: '#ffffff',
                                colorBgContainer: '#ffffff',
                                colorBgElevated: '#ffffff',
                                colorBgLayout: '#f9fafb',
                                colorText: '#111827',
                                colorTextSecondary: '#4b5563',
                                colorTextTertiary: '#6b7280',
                                colorTextQuaternary: '#9ca3af',
                                colorBorder: '#d1d5db',
                                colorBorderSecondary: '#e5e7eb',
                            }),
                    },
                    components: {
                        Form: {
                            labelColor: isDark ? '#e5e7eb' : '#374151',
                            labelFontSize: 14,
                            labelRequiredMarkColor: isDark ? '#f87171' : '#ef4444',
                        },
                        Input: {
                            colorBgContainer: isDark ? '#111827' : '#ffffff',
                            colorBorder: isDark ? '#374151' : '#d1d5db',
                            colorText: isDark ? '#f9fafb' : '#111827',
                            colorTextPlaceholder: '#9ca3af',
                            colorIcon: isDark ? '#9ca3af' : '#6b7280',
                            colorIconHover: isDark ? '#e5e7eb' : '#111827',
                            activeBorderColor: '#059669',
                            hoverBorderColor: '#10b981',
                            activeShadow: '0 0 0 2px rgba(5, 150, 105, 0.2)',
                            borderRadius: 8,
                        },
                        Button: {
                            colorPrimary: '#059669',
                            colorPrimaryHover: '#10b981',
                            colorPrimaryActive: '#047857',
                            borderRadius: 8,
                            controlHeight: 40,
                        },
                    },
                }}
            >
                {children}
            </ConfigProvider>
        </ThemeContext.Provider>
    );
};

export default ThemeProvider;
