import { TAXONOMY } from "../taxonomy";

// normalise strings: trim, lower, collapse spaces/dashes
function norm(s?: string | null) {
  return (s || "").toString().trim().toLowerCase();
}

export function normaliseCategoryPayload(input: {
  category?: string | null;        // may be code or label
  category_code?: string | null;   // preferred
  subcategory?: string | null;     // may be code or label
  subcategory_code?: string | null;// preferred
}) {
  // prefer *_code if present
  let cat = input.category_code || input.category || null;
  let sub = input.subcategory_code || input.subcategory || null;

  // if looks like a label, map to code
  if (cat && !TAXONOMY.map[cat]) {
    const mapped = TAXONOMY.labelToCode[norm(cat)];
    cat = mapped || null;
  }
  // sub may be label; map to code
  if (sub) {
    // check if already a known code (any sub list contains it)
    const isKnownCode = Object.values(TAXONOMY.map).some(list => list.some(s => s.code === sub));
    if (!isKnownCode) {
      const mapped = TAXONOMY.labelToCode[norm(sub)];
      sub = mapped || null;
    }
  }

  return { category_code: cat, subcategory_code: sub };
}

export function subcategoryBelongs(catCode?: string | null, subCode?: string | null) {
  if (!catCode || !subCode) return true; // lenient for drafts
  const list = TAXONOMY.map[catCode] || [];
  return list.some(s => s.code === subCode);
}