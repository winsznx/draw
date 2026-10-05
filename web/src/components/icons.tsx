import type { ReactNode, SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function Icon({ size = 20, children, ...rest }: IconProps & { children: ReactNode }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...rest}>
      {children}
    </svg>
  );
}

export const IconOverview = (p: IconProps) => <Icon {...p}><rect x="3.5" y="3.5" width="7" height="9" rx="2" /><rect x="13.5" y="3.5" width="7" height="5" rx="2" /><rect x="13.5" y="11.5" width="7" height="9" rx="2" /><rect x="3.5" y="15.5" width="7" height="5" rx="2" /></Icon>;
export const IconCall = (p: IconProps) => <Icon {...p}><path d="M7 3.5h7l4.5 4.5v12.5H7z" /><path d="M14 3.5V8h4.5M10 12.5h5.5M10 16h5.5" /></Icon>;
export const IconPayments = (p: IconProps) => <Icon {...p}><path d="M4 8.5h13.5M4 8.5l3.5-3.5M4 8.5 7.5 12M20 15.5H6.5M20 15.5 16.5 12M20 15.5 16.5 19" /></Icon>;
export const IconInvestors = (p: IconProps) => <Icon {...p}><circle cx="9" cy="8.5" r="3.5" /><path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 5a3.5 3.5 0 0 1 0 7M18 14.5a6 6 0 0 1 3.5 5.5" /></Icon>;
export const IconNotice = (p: IconProps) => <Icon {...p}><rect x="4.5" y="3.5" width="15" height="17" rx="2.5" /><path d="M8.5 8.5h7M8.5 12h7M8.5 15.5h4" /></Icon>;
export const IconShield = (p: IconProps) => <Icon {...p}><path d="M12 3.5 19 6.5v5c0 4.4-3 8-7 9.5-4-1.5-7-5.1-7-9.5v-5z" /><path d="m9 12 2 2 4-4" /></Icon>;
export const IconEye = (p: IconProps) => <Icon {...p}><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" /><circle cx="12" cy="12" r="3" /></Icon>;
export const IconEyeOff = (p: IconProps) => <Icon {...p}><path d="M3 3l18 18M10.6 5.6A9.8 9.8 0 0 1 12 5.5c6 0 9.5 6.5 9.5 6.5a17 17 0 0 1-2.9 3.7M6.2 6.7C3.8 8.4 2.5 12 2.5 12S6 18.5 12 18.5a9 9 0 0 0 4.6-1.3M9.9 10a3 3 0 0 0 4.2 4.2" /></Icon>;
export const IconLock = (p: IconProps) => <Icon {...p}><rect x="5" y="10.5" width="14" height="10" rx="2.5" /><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" /></Icon>;
export const IconCheck = (p: IconProps) => <Icon {...p}><path d="m5 12.5 4.5 4.5L19 7.5" /></Icon>;
export const IconCheckCircle = (p: IconProps) => <Icon {...p}><circle cx="12" cy="12" r="8.5" /><path d="m8.5 12.2 2.4 2.4 4.6-4.8" /></Icon>;
export const IconArrowRight = (p: IconProps) => <Icon {...p}><path d="M5 12h14M13 6l6 6-6 6" /></Icon>;
export const IconChevronDown = (p: IconProps) => <Icon {...p}><path d="m6 9 6 6 6-6" /></Icon>;
export const IconKey = (p: IconProps) => <Icon {...p}><circle cx="8" cy="15" r="4" /><path d="m11 12 9-9M17 6l3 3M14.5 8.5l2 2" /></Icon>;
export const IconLayers = (p: IconProps) => <Icon {...p}><path d="m12 3.5 9 5-9 5-9-5z" /><path d="m3 13 9 5 9-5" /></Icon>;
export const IconCoin = (p: IconProps) => <Icon {...p}><circle cx="12" cy="12" r="8.5" /><path d="M14.5 9.2A3.3 3.3 0 0 0 12 8.2c-1.6 0-2.8.9-2.8 2s1.2 1.6 2.8 1.8 2.8.8 2.8 2-1.2 2-2.8 2a3.4 3.4 0 0 1-2.6-1.1M12 6.5v1.7M12 15.8v1.7" /></Icon>;
export const IconFile = (p: IconProps) => <Icon {...p}><path d="M7 3.5h7l4.5 4.5v12.5H7z" /><path d="M14 3.5V8h4.5" /></Icon>;
export const IconExternal = (p: IconProps) => <Icon {...p}><path d="M14 4.5h5.5V10M19.5 4.5 11 13M18 14v5.5H4.5V6H10" /></Icon>;
export const IconSwitch = (p: IconProps) => <Icon {...p}><path d="M4 8h14l-3.5-3.5M20 16H6l3.5 3.5" /></Icon>;
export const IconPlus = (p: IconProps) => <Icon {...p}><path d="M12 5v14M5 12h14" /></Icon>;
export const IconClock = (p: IconProps) => <Icon {...p}><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></Icon>;
export const IconBuilding = (p: IconProps) => <Icon {...p}><path d="M4 20.5h16M6 20.5V5.5l6-2 6 2v15M9.5 9h1M13.5 9h1M9.5 12.5h1M13.5 12.5h1M10.5 20.5v-4h3v4" /></Icon>;
export const IconUser = (p: IconProps) => <Icon {...p}><circle cx="12" cy="8.5" r="4" /><path d="M4.5 20.5a7.5 7.5 0 0 1 15 0" /></Icon>;
export const IconGlobe = (p: IconProps) => <Icon {...p}><circle cx="12" cy="12" r="8.5" /><path d="M3.5 12h17M12 3.5c2.4 2.4 3.5 5.3 3.5 8.5s-1.1 6.1-3.5 8.5c-2.4-2.4-3.5-5.3-3.5-8.5S9.6 5.9 12 3.5Z" /></Icon>;
export const IconMenu = (p: IconProps) => <Icon {...p}><path d="M4 7h16M4 12h16M4 17h16" /></Icon>;
export const IconClose = (p: IconProps) => <Icon {...p}><path d="M6 6l12 12M18 6 6 18" /></Icon>;
export const IconDownload = (p: IconProps) => <Icon {...p}><path d="M12 4v11M7 10.5l5 5 5-5M5 19.5h14" /></Icon>;
export const IconSpark = (p: IconProps) => <Icon {...p}><path d="M12 3.5v4M12 16.5v4M3.5 12h4M16.5 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6" /></Icon>;
