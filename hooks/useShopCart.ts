// hooks/useShopCart.ts — giỏ hàng Gian hàng GOATWIN (lưu trên máy, dùng chung mọi màn qua useSyncExternalStore).
import { useSyncExternalStore } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type CartItem = { productId: string; name: string; image: string; price: number; color: string; qty: number; freeShip?: boolean };
const KEY = "pt_shop_cart_v1";
let items: CartItem[] = [];
let loaded = false;
const subs = new Set<() => void>();
const emit = () => {
  subs.forEach((f) => f());
  AsyncStorage.setItem(KEY, JSON.stringify(items)).catch(() => {});
};
const load = () => {
  if (loaded) return;
  loaded = true;
  AsyncStorage.getItem(KEY)
    .then((s) => {
      const v = s ? JSON.parse(s) : [];
      if (Array.isArray(v)) {
        items = v.filter((x) => x && x.productId && x.qty > 0);
        subs.forEach((f) => f());
      }
    })
    .catch(() => {});
};
const same = (a: CartItem, productId: string, color: string) => a.productId === productId && (a.color || "") === (color || "");

export const shopCart = {
  add(it: Omit<CartItem, "qty">, qty = 1) {
    const i = items.findIndex((x) => same(x, it.productId, it.color));
    items = i >= 0 ? items.map((x, k) => (k === i ? { ...x, qty: Math.min(99, x.qty + qty), price: it.price } : x)) : [...items, { ...it, qty }];
    emit();
  },
  setQty(productId: string, color: string, qty: number) {
    items = qty <= 0 ? items.filter((x) => !same(x, productId, color)) : items.map((x) => (same(x, productId, color) ? { ...x, qty: Math.min(99, qty) } : x));
    emit();
  },
  clear() {
    items = [];
    emit();
  },
};

export function useShopCart() {
  load();
  const list = useSyncExternalStore(
    (f) => {
      subs.add(f);
      return () => subs.delete(f);
    },
    () => items,
  );
  const count = list.reduce((n, x) => n + x.qty, 0);
  const total = list.reduce((n, x) => n + x.qty * x.price, 0);
  return { items: list, count, total, ...shopCart };
}
