import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPercent(value: number | null | undefined, digits = 1): string {
  if (value == null || isNaN(value)) return '-';
  return `${(value * 100).toFixed(digits)}%`;
}

export function formatFloat(value: number | null | undefined, digits = 2): string {
  if (value == null || isNaN(value)) return '-';
  return value.toFixed(digits);
}

export function safeJsonParse<T = any>(str: string | null | undefined, fallback: T): T {
  if (!str) return fallback;
  try {
    return JSON.parse(str) as T;
  } catch {
    return fallback;
  }
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
