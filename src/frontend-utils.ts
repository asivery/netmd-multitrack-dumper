import { Theme } from "@mui/material";
import { useEffect, useState } from "react";

export function themeSpacing(theme: Theme, number: number){
    return parseInt(theme.spacing(number).slice(0, -2));
}

export function forAnyDesktop(theme: Theme) {
    return theme.breakpoints.up(600 + themeSpacing(theme, 2) * 2);
}

export function forWideDesktop(theme: Theme) {
    return theme.breakpoints.up(700 + themeSpacing(theme, 2) * 2) + ` and (min-height: 750px)`;
}

export function useThemeDetector() {
    const getCurrentTheme = () => window.matchMedia('(prefers-color-scheme: dark)').matches;
    const [isDarkTheme, setIsDarkTheme] = useState(getCurrentTheme());
    const mqListener = (e: any) => {
        setIsDarkTheme(e.matches);
    };

    useEffect(() => {
        const darkThemeMq = window.matchMedia('(prefers-color-scheme: dark)');
        darkThemeMq.addEventListener('change', mqListener);
        return () => darkThemeMq.removeEventListener('change', mqListener);
    }, []);
    return isDarkTheme;
}

export function downloadBlob(buffer: Blob, fileName: string) {
    const url = URL.createObjectURL(buffer);
    const a = document.createElement('a');
    document.body.appendChild(a);
    a.style.display = 'none';
    a.href = url;
    a.download = fileName;
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
}

export function useSavedState<T>(defaultValue: T, name: string): [T, (newVal: T | ((oldVal: T) => T)) => void] {
    const [v, sV] = useState<T>(() => {
        let currentStoredValue = localStorage.getItem(name);
        let initialValue: T;
        if(currentStoredValue === null) {
            initialValue = defaultValue;
        } else {
            initialValue = JSON.parse(currentStoredValue) as T;
        }
        return initialValue;
    });
    return [v, (nVG) => {
        let nV;
        if (typeof nVG === 'function') {
            nV = (nVG as (v: T) => T)(v);
        } else {
            nV = nVG;
        }
        sV(nV);
        localStorage.setItem(name, JSON.stringify(nV));
    }];
}
