import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/** Tiny classname helper — keep date-fns out of auth/login bundles. */
export function cn(...inputs) {
  return twMerge(clsx(inputs))
}
