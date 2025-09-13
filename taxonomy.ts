export type Taxonomy = {
  categories: { code: string; label: string }[];
  map: Record<string, { code: string; label: string }[]>;
  labelToCode: Record<string, string>;
};

export async function fetchTaxonomy(): Promise<Taxonomy> {
  const res = await fetch("/api/taxonomy");
  const json = await res.json();
  if (!json.ok) throw new Error("Failed to load taxonomy");
  return json.taxonomy as Taxonomy;
}