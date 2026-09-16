"use client";

import Cookies from "js-cookie";
import * as React from "react";

interface CookieOptions {
  expires?: number;
  path?: string;
  domain?: string;
  secure?: boolean;
  sameSite?: "strict" | "lax" | "none";
}

const DEFAULT_OPTIONS: CookieOptions = { expires: 1, path: "/" };

export function useCookieState<T>(
  key: string,
  initialValue: T,
  options: CookieOptions = DEFAULT_OPTIONS,
) {
  const [value, setValue] = React.useState<T>(() => {
    if (typeof window === "undefined") return initialValue;
    const cookie = Cookies.get(key);
    if (!cookie) return initialValue;
    try {
      return JSON.parse(cookie) as T;
    } catch {
      return initialValue;
    }
  });

  const updateCookie = React.useCallback(
    (next: T | ((prev: T) => T)) => {
      setValue((prev) => {
        const valueToStore = next instanceof Function ? next(prev) : next;
        if (valueToStore === null || valueToStore === undefined) {
          Cookies.remove(key, options);
        } else {
          Cookies.set(key, JSON.stringify(valueToStore), options);
        }
        return valueToStore;
      });
    },
    [key, options],
  );

  return [value, updateCookie] as const;
}
