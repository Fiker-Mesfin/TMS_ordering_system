import { renderHook, act } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import type { AuthChangeEvent, Session, User } from "@supabase/supabase-js";
import { CartProvider, useCart, getUserStorageKey, GUEST_STORAGE } from "@/lib/cart";

type AuthCallback = (event: AuthChangeEvent, session: Session | null) => void;
let authListener: AuthCallback | null = null;
let mockUser: User | null = null;

vi.mock("@/services/authService", () => ({
  subscribeToAuthChanges: (callback: AuthCallback) => {
    authListener = callback;
    return {
      data: {
        subscription: {
          unsubscribe: () => {
            authListener = null;
          },
        },
      },
    };
  },
}));

vi.mock("@/lib/auth", () => ({
  useAuth: () => ({
    user: mockUser,
    ready: true,
    isAdmin: false,
  }),
}));

describe("CartProvider & useCart", () => {
  beforeEach(() => {
    localStorage.clear();
    authListener = null;
    mockUser = null;
  });

  it("loads initial guest items from localStorage", () => {
    const initialItems = [
      {
        key: "item-1|",
        menuItemId: "item-1",
        name: "Test Burger",
        imageKey: null,
        basePrice: 200,
        quantity: 2,
        extras: [],
      },
    ];
    localStorage.setItem(GUEST_STORAGE, JSON.stringify(initialItems));

    const { result } = renderHook(() => useCart(), {
      wrapper: CartProvider,
    });

    expect(result.current.lines).toHaveLength(1);
    expect(result.current.count).toBe(2);
    expect(result.current.estimate).toBe(400);
  });

  it("clears cart lines and removes localStorage entry on clear() for guest", () => {
    const { result } = renderHook(() => useCart(), {
      wrapper: CartProvider,
    });

    act(() => {
      result.current.add({
        menuItemId: "burger-1",
        name: "Smash Burger",
        imageKey: null,
        basePrice: 150,
        quantity: 1,
        extras: [],
      });
    });

    expect(result.current.count).toBe(1);
    expect(localStorage.getItem(GUEST_STORAGE)).toBeTruthy();

    act(() => {
      result.current.clear();
    });

    expect(result.current.lines).toEqual([]);
    expect(result.current.count).toBe(0);
    expect(localStorage.getItem(GUEST_STORAGE)).toBeNull();
  });

  it("persists items to user storage when logged in, clears active cart on logout, and restores when signing back in", () => {
    mockUser = { id: "user-abc" } as User;

    const { result, rerender } = renderHook(() => useCart(), {
      wrapper: CartProvider,
    });

    // Add item while logged in
    act(() => {
      result.current.add({
        menuItemId: "burger-user",
        name: "User Burger",
        imageKey: null,
        basePrice: 220,
        quantity: 2,
        extras: [],
      });
    });

    expect(result.current.count).toBe(2);
    expect(localStorage.getItem(getUserStorageKey("user-abc"))).toBeTruthy();

    // User logs out
    mockUser = null;
    rerender();

    // Cart is now empty on screen
    expect(result.current.lines).toEqual([]);
    expect(result.current.count).toBe(0);

    // But user's saved items in localStorage are still preserved!
    expect(localStorage.getItem(getUserStorageKey("user-abc"))).toBeTruthy();

    // That same user signs back in
    mockUser = { id: "user-abc" } as User;
    rerender();

    // Cart items are restored!
    expect(result.current.count).toBe(2);
    expect(result.current.lines[0]?.name).toBe("User Burger");
  });

  it("does not show user A's cart items to user B", () => {
    mockUser = { id: "user-a" } as User;
    const { result, rerender } = renderHook(() => useCart(), {
      wrapper: CartProvider,
    });

    act(() => {
      result.current.add({
        menuItemId: "burger-a",
        name: "Burger A",
        imageKey: null,
        basePrice: 200,
        quantity: 1,
        extras: [],
      });
    });

    // User A logs out
    mockUser = null;
    rerender();
    expect(result.current.count).toBe(0);

    // User B logs in
    mockUser = { id: "user-b" } as User;
    rerender();
    expect(result.current.count).toBe(0);
    expect(result.current.lines).toEqual([]);
  });

  it("merges guest items into user cart when user signs in", () => {
    // User already had 1 burger saved from before
    localStorage.setItem(
      getUserStorageKey("user-merge"),
      JSON.stringify([
        {
          key: "saved-burger|",
          menuItemId: "saved-burger",
          name: "Saved Burger",
          imageKey: null,
          basePrice: 180,
          quantity: 1,
          extras: [],
        },
      ]),
    );

    // Guest visits and adds another item
    mockUser = null;
    const { result, rerender } = renderHook(() => useCart(), {
      wrapper: CartProvider,
    });

    act(() => {
      result.current.add({
        menuItemId: "guest-burger",
        name: "Guest Burger",
        imageKey: null,
        basePrice: 160,
        quantity: 2,
        extras: [],
      });
    });

    expect(result.current.count).toBe(2);

    // User signs in
    mockUser = { id: "user-merge" } as User;
    rerender();

    // Both saved and guest items should be present!
    expect(result.current.count).toBe(3);
    expect(result.current.lines.map((l) => l.name)).toContain("Saved Burger");
    expect(result.current.lines.map((l) => l.name)).toContain("Guest Burger");
  });

  it("removes user persistent cart when clear() is called (e.g. after order placement)", () => {
    mockUser = { id: "user-checkout" } as User;
    const { result } = renderHook(() => useCart(), {
      wrapper: CartProvider,
    });

    act(() => {
      result.current.add({
        menuItemId: "burger-checkout",
        name: "Checkout Burger",
        imageKey: null,
        basePrice: 300,
        quantity: 1,
        extras: [],
      });
    });

    expect(result.current.count).toBe(1);
    expect(localStorage.getItem(getUserStorageKey("user-checkout"))).toBeTruthy();

    act(() => {
      result.current.clear();
    });

    expect(result.current.count).toBe(0);
    expect(localStorage.getItem(getUserStorageKey("user-checkout"))).toBeNull();
  });
});
