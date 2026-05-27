/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatTime(timestamp: number) {
  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(timestamp);
}

export const brandColorMap: Record<string, Record<string, string>> = {
  orange: {
    '--brand-50': '#fff7ed',
    '--brand-100': '#ffedd5',
    '--brand-200': '#fed7aa',
    '--brand-300': '#fdba74',
    '--brand-400': '#fb923c',
    '--brand-500': '#f97316',
    '--brand-600': '#ea580c',
    '--brand-700': '#c2410c',
    '--brand-800': '#9a3412',
    '--brand-900': '#7c2d12',
    '--brand-950': '#431407',
  },
  blue: {
    '--brand-50': '#eff6ff',
    '--brand-100': '#dbeafe',
    '--brand-200': '#bfdbfe',
    '--brand-300': '#93c5fd',
    '--brand-400': '#60a5fa',
    '--brand-500': '#3b82f6',
    '--brand-600': '#2563eb',
    '--brand-700': '#1d4ed8',
    '--brand-800': '#1e40af',
    '--brand-900': '#1e3a8a',
    '--brand-950': '#172554',
  },
  green: {
    '--brand-50': '#ecfdf5',
    '--brand-100': '#d1fae5',
    '--brand-200': '#a7f3d0',
    '--brand-300': '#6ee7b7',
    '--brand-400': '#34d399',
    '--brand-500': '#10b981',
    '--brand-600': '#059669',
    '--brand-700': '#047857',
    '--brand-800': '#065f46',
    '--brand-900': '#064e3b',
    '--brand-950': '#022c22',
  },
  purple: {
    '--brand-50': '#faf5ff',
    '--brand-100': '#f3e8ff',
    '--brand-200': '#e9d5ff',
    '--brand-300': '#d8b4fe',
    '--brand-400': '#c084fc',
    '--brand-500': '#a855f7',
    '--brand-600': '#9333ea',
    '--brand-700': '#7e22ce',
    '--brand-800': '#6b21a8',
    '--brand-900': '#581c87',
    '--brand-950': '#3b0764',
  },
  red: {
    '--brand-50': '#fff1f2',
    '--brand-100': '#ffe4e6',
    '--brand-200': '#fecdd3',
    '--brand-300': '#fda4af',
    '--brand-400': '#fb7185',
    '--brand-500': '#f43f5e',
    '--brand-600': '#e11d48',
    '--brand-700': '#be123c',
    '--brand-800': '#9f1239',
    '--brand-900': '#881337',
    '--brand-950': '#4c0519',
  },
  stone: {
    '--brand-50': '#fafaf9',
    '--brand-100': '#f5f5f4',
    '--brand-200': '#e7e5e4',
    '--brand-300': '#d6d3d1',
    '--brand-400': '#a8a29e',
    '--brand-500': '#78716c',
    '--brand-600': '#575249',
    '--brand-700': '#44403c',
    '--brand-800': '#292524',
    '--brand-900': '#1c1917',
    '--brand-950': '#0c0a09',
  }
};

export function applyAccentColor(color: string) {
  const map = brandColorMap[color] || brandColorMap['orange'];
  Object.entries(map).forEach(([prop, val]) => {
    document.documentElement.style.setProperty(prop, val);
  });
  // Also keep standard --brand-color for legacy settings mapping
  document.documentElement.style.setProperty('--brand-color', map['--brand-500']);
}

