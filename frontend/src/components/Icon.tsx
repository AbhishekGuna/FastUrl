import type { ReactNode } from "react";

type IconName = "copy" | "check" | "chevron" | "plus" | "close" | "spinner";

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
