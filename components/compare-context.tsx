"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

interface CompareContextType {
    compareList: string[];
    addToCompare: (barcode: string) => void;
    removeFromCompare: (barcode: string) => void;
    isInCompare: (barcode: string) => boolean;
    clearCompare: () => void;
}

const CompareContext = createContext<CompareContextType | undefined>(undefined);

export function CompareProvider({ children }: { children: React.ReactNode }) {
    const [compareList, setCompareList] = useState<string[]>([]);

    // Load from local storage on mount
    useEffect(() => {
        const stored = localStorage.getItem("nutrika-compare-list");
        if (stored) {
            try {
                setCompareList(JSON.parse(stored));
            } catch (e) {
                console.error("Failed to parse compare list", e);
            }
        }
    }, []);

    // Save to local storage whenever it changes
    useEffect(() => {
        localStorage.setItem("nutrika-compare-list", JSON.stringify(compareList));
    }, [compareList]);

    const addToCompare = (barcode: string) => {
        setCompareList((prev) => {
            if (prev.includes(barcode)) return prev;
            // Limit to 4 items for comparison
            const nextList = [...prev, barcode].slice(-4);
            return nextList;
        });
    };

    const removeFromCompare = (barcode: string) => {
        setCompareList((prev) => prev.filter((id) => id !== barcode));
    };

    const isInCompare = (barcode: string) => compareList.includes(barcode);

    const clearCompare = () => setCompareList([]);

    return (
        <CompareContext.Provider
            value={{
                compareList,
                addToCompare,
                removeFromCompare,
                isInCompare,
                clearCompare,
            }}
        >
            {children}
        </CompareContext.Provider>
    );
}

export function useCompare() {
    const context = useContext(CompareContext);
    if (context === undefined) {
        throw new Error("useCompare must be used within a CompareProvider");
    }
    return context;
}
