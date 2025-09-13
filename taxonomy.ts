export type Taxonomy = {
  categories: { code: string; label: string }[];
  map: Record<string, { code: string; label: string }[]>;
  labelToCode: Record<string, string>;
};

const C = (code: string, label: string) => ({ code, label });

export const TAXONOMY: Taxonomy = {
  categories: [
    C("cannabis-raw",       "Cannabis – Raw Plant Material"),
    C("cannabis-extracts",  "Cannabis – Extracts & Concentrates"),
    C("cannabis-infused",   "Cannabis – Infused Products"),
    C("cannabis-medical",   "Cannabis – Medical & Pharma"),
    C("cannabis-cpg",       "Cannabis – Consumer Packaged Goods"),
    C("hemp-industrial",    "Hemp – Industrial Hemp"),
    C("wellness-lifestyle", "Wellness & Lifestyle"),
    C("byproducts-secondary","Byproducts & Secondary"),
    C("tech-ancillary",     "Tech & Ancillary"),
  ],
  map: {
    "cannabis-raw":      [C("flower-bud","Flower/Bud"), C("trim-shake","Trim & Shake")],
    "cannabis-extracts": [C("solvent-based","Solvent-based"), C("solventless","Solventless"), C("specialty-concentrates","Specialty Concentrates")],
    "cannabis-infused":  [C("edibles","Edibles"), C("sublinguals","Sublinguals"), C("topicals-transdermals","Topicals & Transdermals")],
    "cannabis-medical":  [C("prescription-grade","Prescription-grade"), C("compounded-formulations","Compounded Formulations"), C("novel-cannabinoids","Novel Cannabinoids")],
    "cannabis-cpg":      [C("pre-rolls","Pre-rolls"), C("vapes-cartridges","Vapes & Cartridges")],
    "hemp-industrial":   [C("fibres-textiles","Fibres & Textiles"), C("hurds","Hurds"), C("seeds-oils","Seeds & Oils"), C("bioplastics","Bioplastics"), C("smokable-hemp","Smokable Hemp")],
    "wellness-lifestyle":[C("cbd-wellness","CBD Wellness Products"), C("nutraceuticals","Nutraceuticals")],
    "byproducts-secondary":[C("terpenes","Terpenes"), C("biomass-waste","Biomass Waste Streams"), C("carbon-credits","Carbon Credits")],
    "tech-ancillary":    [C("cultivation-tech","Cultivation Tech"), C("post-harvest-equip","Post-Harvest Equipment"), C("testing-compliance","Testing & Compliance"), C("packaging","Packaging")]
  },
  labelToCode: {}
};

// Build a label-to-code index (case/space/emoji tolerant)
for (const {code, label} of TAXONOMY.categories) {
  TAXONOMY.labelToCode[label.toLowerCase()] = code;
}
for (const [catCode, subs] of Object.entries(TAXONOMY.map)) {
  for (const {code, label} of subs) {
    TAXONOMY.labelToCode[label.toLowerCase()] = code;
  }
}

// Utility functions for normalization
export function normalizeCategoryCode(input?: string | null): string | null {
  if (!input) return null;
  
  // If already a code, return as-is
  const category = TAXONOMY.categories.find(cat => cat.code === input);
  if (category) return input;
  
  // Find by label (case-insensitive)
  const code = TAXONOMY.labelToCode[input.toLowerCase()];
  return code || null;
}

export function normalizeSubcategoryCode(categoryCode?: string | null, subcategoryInput?: string | null): string | null {
  if (!categoryCode || !subcategoryInput) return null;
  
  const subcategories = TAXONOMY.map[categoryCode] || [];
  
  // If already a code, return as-is
  const subcategory = subcategories.find(sub => sub.code === subcategoryInput);
  if (subcategory) return subcategoryInput;
  
  // Find by label (case-insensitive)
  const code = TAXONOMY.labelToCode[subcategoryInput.toLowerCase()];
  
  // Verify the code belongs to this category
  const isValidForCategory = subcategories.some(sub => sub.code === code);
  return isValidForCategory ? code : null;
}

export function validateCategorySubcategory(categoryCode?: string | null, subcategoryCode?: string | null): boolean {
  if (!categoryCode || !subcategoryCode) return true; // Allow nulls for drafts
  
  const subcategories = TAXONOMY.map[categoryCode] || [];
  return subcategories.some(sub => sub.code === subcategoryCode);
}

// Legacy compatibility exports
export const CATEGORY_MAPPING: Record<string, string> = Object.fromEntries(
  TAXONOMY.categories.map(cat => [cat.label, cat.code])
);

export const ENUM_TO_DISPLAY: Record<string, string> = Object.fromEntries(
  TAXONOMY.categories.map(cat => [cat.code, cat.label])
);