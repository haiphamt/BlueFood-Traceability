import type { ComponentPropsWithoutRef } from 'react';

type IconProps = ComponentPropsWithoutRef<'svg'>;

function IconBase({ children, ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
      {children}
    </svg>
  );
}

export function BlueFoodLogo(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M12 3.2c4.2 2.1 7 5.7 7 9.4 0 4.3-3.1 7.4-7 7.4s-7-3.1-7-7.4c0-3.7 2.8-7.3 7-9.4Z" fill="currentColor" />
      <path d="M8.3 12.4c2.6-.1 4.8-1.2 6.7-3.4.7 3.8-.8 6.8-4.1 7.7-1.4.4-2.7.2-3.8-.4.4-1 .8-2.3 1.2-3.9Z" fill="#52b788" />
    </IconBase>
  );
}

export function ShieldCheckIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M12 3.2 5.4 5.6v5.1c0 4.2 2.6 7.9 6.6 9.3 4-1.4 6.6-5.1 6.6-9.3V5.6L12 3.2Z" stroke="currentColor" strokeWidth="1.8" />
      <path d="m8.8 12 2.1 2.1 4.5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </IconBase>
  );
}

export function AlertIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M12 3.8 21 20H3L12 3.8Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M12 9v4.8M12 17.2h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </IconBase>
  );
}

export function ChainIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M9.9 7.8 8.5 6.4a4 4 0 0 0-5.7 5.7l2.1 2.1a4 4 0 0 0 5.7 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="m14.1 16.2 1.4 1.4a4 4 0 1 0 5.7-5.7l-2.1-2.1a4 4 0 0 0-5.7 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="m8.8 15.2 6.4-6.4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </IconBase>
  );
}

export function FarmIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M4 19V9.5L12 5l8 4.5V19" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M8 19v-6h8v6M4 12h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </IconBase>
  );
}

export function PackageIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="m12 3 8 4.2v9.6L12 21l-8-4.2V7.2L12 3Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M4.5 7.5 12 12l7.5-4.5M12 12v8.4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </IconBase>
  );
}

export function CheckIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="m5 12.4 4.1 4.1L19 6.8" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" />
    </IconBase>
  );
}

export function TruckIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M3 6.5h11v9H3zM14 10h3.5l3 3v2.5H14z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M7 18.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM17.5 18.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" stroke="currentColor" strokeWidth="1.8" />
    </IconBase>
  );
}

export function StoreIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M5 10.5V20h14v-9.5M4 4h16l1 4.3a3 3 0 0 1-5.4 1.9 3 3 0 0 1-5.2 0A3 3 0 0 1 5 8.3L4 4Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M9 20v-5h6v5" stroke="currentColor" strokeWidth="1.8" />
    </IconBase>
  );
}

export function ExternalIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M14 5h5v5M10 14 19 5M19 14.5V19H5V5h4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </IconBase>
  );
}

export function DownloadIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M12 4v10m0 0 4-4m-4 4-4-4M5 20h14" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
    </IconBase>
  );
}

export function ShareIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M18 8a3 3 0 1 0-2.8-4.1M6 14a3 3 0 1 0 0 6 3 3 0 0 0 0-6Zm12 0a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z" stroke="currentColor" strokeWidth="1.8" />
      <path d="m8.7 16.3 6.6-3.6M15.3 11.3 8.7 7.7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </IconBase>
  );
}
