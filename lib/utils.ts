import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

/**
 * Detect if the user is on a mobile device
 */
export function isMobileDevice(userAgent: string): boolean {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        userAgent
    );
}

/**
 * Format a number as a percentage
 */
export function formatPercentage(value: number): string {
    return `${Math.round(value)}%`;
}

/**
 * Format nutrition value with unit
 */
export function formatNutrition(value: number | null | undefined, unit: string): string {
    if (value === null || value === undefined) return "-";
    return `${value.toFixed(1)} ${unit}`;
}

/**
 * Capitalize the first letter of a string
 */
export function capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

/**
 * Sleep for a given number of milliseconds
 */
export function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Truncate a string to a given length
 */
export function truncate(str: string, length: number): string {
    if (str.length <= length) return str;
    return str.slice(0, length) + "...";
}
