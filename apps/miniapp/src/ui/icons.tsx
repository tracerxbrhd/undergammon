import type { ReactNode, SVGProps } from 'react';

type IconProps = Omit<SVGProps<SVGSVGElement>, 'children'>;

function Icon({ children, ...props }: IconProps & { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className="ui-icon"
      {...props}
    >
      {children}
    </svg>
  );
}

export function StoreIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M5 8.5h14l-1 11H6z" />
      <path d="M8.5 9V7a3.5 3.5 0 0 1 7 0v2" />
    </Icon>
  );
}

export function CosmeticsIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="m12 3 1.2 3.3L16.5 7.5l-3.3 1.2L12 12l-1.2-3.3-3.3-1.2 3.3-1.2z" />
      <path d="m17.5 12.5.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z" />
      <path d="m6.5 13.5.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z" />
    </Icon>
  );
}

export function PlayIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="m10.5 8.8 5 3.2-5 3.2z" />
    </Icon>
  );
}

export function RankingsIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M8 4h8v3.5a4 4 0 0 1-8 0z" />
      <path d="M8 6H5.5v1.5A3.5 3.5 0 0 0 9 11" />
      <path d="M16 6h2.5v1.5A3.5 3.5 0 0 1 15 11" />
      <path d="M12 11.5V16" />
      <path d="M8.5 20h7M10 16h4v4h-4z" />
    </Icon>
  );
}

export function ProfileIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="8" r="3.25" />
      <path d="M5.5 19c.7-3.2 3-5 6.5-5s5.8 1.8 6.5 5" />
    </Icon>
  );
}

export function MoreIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="5" cy="12" r="1" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
      <circle cx="19" cy="12" r="1" fill="currentColor" stroke="none" />
    </Icon>
  );
}

export function ReactionIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M8.5 10h.01M15.5 10h.01" strokeWidth="2.4" />
      <path d="M8.5 14.2c1 1.25 2.15 1.8 3.5 1.8s2.5-.55 3.5-1.8" />
    </Icon>
  );
}

export function CloseIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="m7 7 10 10M17 7 7 17" />
    </Icon>
  );
}

export function ChevronLeftIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="m14.5 6-6 6 6 6" />
    </Icon>
  );
}

export function ChevronRightIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="m9.5 6 6 6-6 6" />
    </Icon>
  );
}

export function EmptyStateIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4.5 8.5 12 4l7.5 4.5V16L12 20l-7.5-4z" />
      <path d="m4.5 8.5 7.5 4 7.5-4M12 12.5V20" />
    </Icon>
  );
}

export function RetryIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M19 8.5A7.5 7.5 0 1 0 19.2 15" />
      <path d="M19 4v4.5h-4.5" />
    </Icon>
  );
}
