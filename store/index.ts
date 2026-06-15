import { create } from "zustand";
import type { NotificationItem, Player } from "@/types";

interface LivePrice {
  price: number;
  changePercent: number;
  direction: "up" | "down" | "flat";
  updatedAt: number;
}

interface ToastMessage {
  id: string;
  title: string;
  description?: string;
  variant: "success" | "error" | "info";
}

interface FPIStore {
  // live prices keyed by playerId, fed by the socket layer
  livePrices: Record<string, LivePrice>;
  setLivePrice: (playerId: string, price: number, changePercent: number) => void;

  // cached players (hydrated from server)
  players: Player[];
  setPlayers: (players: Player[]) => void;

  // connected wallet (identity)
  walletAddress: string | null;
  setWalletAddress: (address: string | null) => void;
  // verified SIWE session present
  authenticated: boolean;
  setAuthenticated: (v: boolean) => void;

  // notifications
  notifications: NotificationItem[];
  unreadCount: number;
  setNotifications: (items: NotificationItem[]) => void;
  markAllRead: () => void;

  // ui
  searchOpen: boolean;
  setSearchOpen: (open: boolean) => void;
  mobileNavOpen: boolean;
  setMobileNavOpen: (open: boolean) => void;
  notificationPanelOpen: boolean;
  setNotificationPanelOpen: (open: boolean) => void;

  // toasts
  toasts: ToastMessage[];
  addToast: (t: Omit<ToastMessage, "id">) => void;
  removeToast: (id: string) => void;
}

export const useStore = create<FPIStore>((set, get) => ({
  livePrices: {},
  setLivePrice: (playerId, price, changePercent) =>
    set((state) => {
      const prev = state.livePrices[playerId];
      const direction: LivePrice["direction"] =
        prev && price > prev.price ? "up" : prev && price < prev.price ? "down" : "flat";
      return {
        livePrices: {
          ...state.livePrices,
          [playerId]: { price, changePercent, direction, updatedAt: Date.now() },
        },
      };
    }),

  players: [],
  setPlayers: (players) => set({ players }),

  walletAddress: null,
  setWalletAddress: (walletAddress) => set({ walletAddress }),
  authenticated: false,
  setAuthenticated: (authenticated) => set({ authenticated }),

  notifications: [],
  unreadCount: 0,
  setNotifications: (items) =>
    set({ notifications: items, unreadCount: items.filter((n) => !n.isRead).length }),
  markAllRead: () =>
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, isRead: true })),
      unreadCount: 0,
    })),

  searchOpen: false,
  setSearchOpen: (open) => set({ searchOpen: open }),
  mobileNavOpen: false,
  setMobileNavOpen: (open) => set({ mobileNavOpen: open }),
  notificationPanelOpen: false,
  setNotificationPanelOpen: (open) => set({ notificationPanelOpen: open }),

  toasts: [],
  addToast: (t) => {
    const id = Math.random().toString(36).slice(2);
    set((state) => ({ toasts: [...state.toasts, { ...t, id }] }));
    setTimeout(() => get().removeToast(id), 4000);
  },
  removeToast: (id) =>
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
}));
