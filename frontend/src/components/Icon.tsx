import type { ReactNode } from 'react';

type IconName =
    | 'copy'
    | 'check'
    | 'chevron'
    | 'plus'
    | 'close'
    | 'spinner'
    | 'chart'
    | 'moon'
    | 'sun'
    | 'link';

const paths: Record<IconName, ReactNode> = {
    copy: (
        <>
            <rect x="7.5" y="7.5" width="9" height="9" rx="1.5" />
            <path d="M4.5 12.5v-7A1.5 1.5 0 0 1 6 4h7" />
        </>
    ),
    check: <path d="M4 10.5 8 14.5 16 5.5" />,
    chevron: <path d="M5 7.5 10 12.5 15 7.5" />,
    plus: (
        <>
            <path d="M10 4v12" />
            <path d="M4 10h12" />
        </>
    ),
    close: (
        <>
            <path d="M5 5l10 10" />
            <path d="M15 5 5 15" />
        </>
    ),
    spinner: <path d="M10 3.5a6.5 6.5 0 1 0 6.5 6.5" />,
    chart: (
        <>
            <path d="M3 14 7 8l4 3 3-5 3 4" />
            <path d="M3 17h14" />
        </>
    ),
    moon: <path d="M16 12a6 6 0 1 1-8-8 8.1 8.1 0 0 0 8 8Z" />,
    sun: (
        <>
            <circle cx="10" cy="10" r="4" />
            <path d="M10 2v2M10 16v2M15.66 4.34l-1.42 1.42M5.76 14.24l-1.42 1.42M18 10h-2M4 10H2M15.66 15.66l-1.42-1.42M5.76 5.76 4.34 4.34" />
        </>
    ),
    link: (
        <>
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
        </>
    ),
};

export function Icon({ name, className }: { name: IconName; className?: string }) {
    return (
        <svg
            className={className}
            width="16"
            height="16"
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
        >
            {paths[name]}
        </svg>
    );
}
