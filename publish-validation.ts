import { TAXONOMY, ENUM_TO_DISPLAY } from "./taxonomy";

// Publish-time validation helper (keep drafts lenient)
export type PublishCheckInput = {
  category?: string | null;
  subcategory?: string | null;
  supplyFrequency?: string | null;        // one-time | weekly | monthly | quarterly | seasonal | continuous
  paymentMethod?: string | null;          // bank-transfer | escrow | letter-of-credit | card | other
  photoCount?: number;                    // derived from documents table (doc_type='product_image')
  coaCount?: number;                      // derived from documents table (doc_type='coa')
  licenceOrCertCount?: number;           // derived from documents table (doc_type in ['licence','certificate'])
};

export function computePublishBlockingIssues(input: PublishCheckInput): string[] {
  const issues: string[] = [];
  
  if (!input.category) {
    issues.push("Choose a Category");
  }
  
  if (!input.subcategory) {
    issues.push("Choose a Sub-category");
  }
  
  if (!input.supplyFrequency) {
    issues.push("Set Supply Frequency");
  }
  
  if (!input.paymentMethod) {
    issues.push("Choose a Payment Method");
  }
  
  if (!input.photoCount || input.photoCount < 1) {
    issues.push("Add at least one product photo");
  }
  
  if (!input.coaCount || input.coaCount < 1) {
    issues.push("Upload a Certificate of Analysis (COA)");
  }
  
  if (!input.licenceOrCertCount || input.licenceOrCertCount < 1) {
    issues.push("Upload a licence or certificate");
  }
  
  return issues;
}

export function subcategoryValid(category?: string | null, subcategory?: string | null): boolean {
  if (!category || !subcategory) return false;
  
  // Convert enum value to display name if needed
  const displayCategory = ENUM_TO_DISPLAY[category] || category;
  
  const subcategoryList = TAXONOMY.map[displayCategory] || [];
  return subcategoryList.includes(subcategory);
}

export function autoGenerateTitle(category?: string | null, subcategory?: string | null, location?: string | null, quantity?: number | null, unit?: string | null): string {
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