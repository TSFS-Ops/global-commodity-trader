// client/src/pages/ListingsPage.tsx
import { useEffect, useState } from "react";

type Item = {
  id:string; title:string|null; region:string|null;
  quantity:number|null; unit:string|null;
  price_per_unit:number|null; currency:string|null;
  category_code:string|null; category_label:string|null;
};

export default function ListingsPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [category, setCategory] = useState<string | "">(
    new URLSearchParams(location.search).get("category_code") || ""
  );
  const [q, setQ] = useState("");

  useEffect(() => {
    const p = new URLSearchParams();
    if (category) p.set("category_code", category);
    if (q) p.set("q", q);
    fetch(`/api/listings?${p.toString()}`, { credentials: "include" })
      .then(r=>r.json()).then(j => setItems(j.items || []));
  }, [category, q]);

  return (
    <div className="container">
      <h1>Listings</h1>
      {/* simple filters here (category select, q input) */}
      <div className="grid">
        {items.map(x => (
          <a key={x.id} href={`/listings/${x.id}`} className="card">
            <div className="muted">{x.category_label}</div>
            <div className="title">{x.title || "Untitled"}</div>
            <div>{x.region || "—"}</div>
            <div>{x.quantity ? `${x.quantity} ${x.unit||""}` : "—"}</div>
            <div>{x.price_per_unit ? `${x.currency||""} ${x.price_per_unit}` : "Ask"}</div>
          </a>
        ))}
      </div>
    </div>
  );
}