import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * Merges Tailwind CSS classes using clsx and tailwind-merge.
 * @param inputs - Variadic list of class names or conditional class objects.
 * @returns A merged string of optimized Tailwind classes.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Formats a number as Ugandan Shilling (UGX) currency.
 * Uses en-US locale to ensure the "UGX" code is used as the prefix instead of regional symbols like "USh".
 * @param amount - The numeric value to format.
 * @returns A formatted string e.g., "UGX 50,000".
 */
export function formatUGX(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'UGX',
    minimumFractionDigits: 0,
  }).format(amount);
}
