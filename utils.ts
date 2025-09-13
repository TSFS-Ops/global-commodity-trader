import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format a number as a currency string
 * @param amount The amount to format
 * @param currency The currency code (default: USD)
 * @returns Formatted currency string
 */
export function formatCurrency(amount: number | null | undefined, currency: string = 'USD'): string {
  if (amount === null || amount === undefined) {
    return '$0.00';
  }
  
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Auto-generate listing title based on category, subcategory, and other fields
 */
export function autoGenerateTitle(
  category?: string | null, 
  subcategory?: string | null, 
  location?: string | null, 
  quantity?: number | null, 
  unit?: string | null
): string {
  const parts: string[] = [];
  
  if (category) {
    // Simplify category names for titles
    const simplifiedCategory = category.replace(/^(Cannabis|Hemp)\s*[-–]\s*/, '').trim();
    parts.push(simplifiedCategory);
  }
  
  if (subcategory) {
    parts.push(subcategory);
  }
  
  if (quantity && unit) {
    parts.push(`${quantity}${unit}`);
  }
  
  if (location) {
    // Extract region/country from location
    const locationParts = location.split(',').map(p => p.trim());
    const region = locationParts[locationParts.length - 1]; // Last part is usually country/region
    parts.push(`from ${region}`);
  }
  
  return parts.join(' - ') || 'Cannabis Product';
}
