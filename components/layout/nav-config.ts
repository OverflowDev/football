import {
  LayoutDashboard,
  TrendingUp,
  Wallet,
  Trophy,
  Star,
  Sparkles,
  Settings,
  BookOpen,
  Rocket,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

export const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Market", href: "/market", icon: TrendingUp },
  { label: "IPOs", href: "/ipo", icon: Rocket },
  { label: "Portfolio", href: "/portfolio", icon: Wallet },
  { label: "Watchlist", href: "/watchlist", icon: Star },
  { label: "AI Agents", href: "/ai", icon: Sparkles },
  { label: "Leaderboard", href: "/leaderboard", icon: Trophy },
  { label: "Docs", href: "/docs", icon: BookOpen },
  { label: "Settings", href: "/settings", icon: Settings },
];

// Subset shown in the mobile bottom nav.
export const MOBILE_NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Market", href: "/market", icon: TrendingUp },
  { label: "Portfolio", href: "/portfolio", icon: Wallet },
  { label: "AI", href: "/ai", icon: Sparkles },
  { label: "More", href: "/settings", icon: Settings },
];
