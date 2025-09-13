import React, { useEffect, useMemo, useState } from "react";
import { fetchTaxonomy, Taxonomy } from "@/api/taxonomy";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";


// Types

type ListingDraft = {
  id?: string;
  category_code?: string | null;
  subcategory_code?: string | null;
  
  isAnonymous?: boolean;
  tradingName?: string | null;
  title?: string | null;
  description?: string | null;
  
  quantity?: number | null;
  unit?: string | null;
  minOrderQuantity?: number | null;
  location?: string | null;
  supplyFrequency?: string | null;
  
  pricePerUnit?: number | null;
  currency?: string | null;
  paymentMethod?: string | null;
  
  coaDocument?: string | null;
  certificatesDocuments?: string[];
  images?: string[];
  
  // Server-calculated for checklist
  photoCount?: number;
  coaCount?: number;
  licenceOrCertCount?: number;
};

// API helpers
async function saveDraft(draft: Partial<ListingDraft>): Promise<{ok:boolean; id:string}> {
  const payload = {
    category_code: draft.category_code ?? null,
    subcategory_code: draft.subcategory_code ?? null,
    isAnonymous: draft.isAnonymous,
    tradingName: draft.tradingName,
    title: draft.title,
    description: draft.description,
    quantity: draft.quantity,
    unit: draft.unit,
    minOrderQuantity: draft.minOrderQuantity,
    location: draft.location,
    supplyFrequency: draft.supplyFrequency,
    pricePerUnit: draft.pricePerUnit,
    currency: draft.currency,
    paymentMethod: draft.paymentMethod,
    coaDocument: draft.coaDocument,
    certificatesDocuments: draft.certificatesDocuments,
    images: draft.images
  };
  
  const res = await apiRequest("POST", "/api/listings", payload);
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || "Save failed");
  return { ok: true, id: json.id };
}

async function updateDraft(id: string, draft: Partial<ListingDraft>) {
  const payload = {
    category_code: draft.category_code ?? null,
    subcategory_code: draft.subcategory_code ?? null,
    isAnonymous: draft.isAnonymous,
    tradingName: draft.tradingName,
    title: draft.title,
    description: draft.description,
    quantity: draft.quantity,
    unit: draft.unit,
    minOrderQuantity: draft.minOrderQuantity,
    location: draft.location,
    supplyFrequency: draft.supplyFrequency,
    pricePerUnit: draft.pricePerUnit,
    currency: draft.currency,
    paymentMethod: draft.paymentMethod,
    coaDocument: draft.coaDocument,
    certificatesDocuments: draft.certificatesDocuments,
    images: draft.images
  };
  
  const res = await apiRequest("PATCH", `/api/listings/${id}`, payload);
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || "Update failed");
}

async function publishListing(id: string): Promise<{ok:boolean; checklist?:string[]}> {
  const res = await apiRequest("POST", `/api/listings/${id}/publish`);
  const json = await res.json();
  if (!res.ok) return { ok: false, checklist: json.checklist || [json.error || "Publish failed"] };
  return { ok: true };
}

export function ListingFormStepper() {
  const { toast } = useToast();
  const { user } = useAuth();
  
  const [tax, setTax] = useState<Taxonomy>({ categories: [], map: {}, labelToCode: {} });
  const [draft, setDraft] = useState<ListingDraft>({});
  const [step, setStep] = useState<number>(1);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [draftId, setDraftId] = useState<string | undefined>(undefined);

  useEffect(() => {
    let mounted = true;
    fetchTaxonomy()
      .then(t => mounted && setTax(t))
      .catch(() => setTax({ categories: [], map: {}, labelToCode: {} }));
    return () => { mounted = false; };
  }, []);

  // Derived: subcategory list & auto-title
  const subcatOptions = useMemo(() => 
    draft.category_code ? (tax.map[draft.category_code] || []) : [], 
    [draft.category_code, tax]
  );

  useEffect(() => {
    // Reset subcategory when category changes
    setDraft(prev => ({ ...prev, subcategory_code: undefined }));
  }, [draft.category_code]);

  useEffect(() => {
    // Simple auto-title suggestion after enough info is present
    const parts = [];
    
    // Get display labels for title
    const categoryLabel = tax.categories.find(cat => cat.code === draft.category_code)?.label;
    const subcategoryLabel = tax.map[draft.category_code || '']?.find(sub => sub.code === draft.subcategory_code)?.label;
    
    if (categoryLabel) parts.push(categoryLabel);
    if (subcategoryLabel) parts.push(subcategoryLabel);
    if (draft.location) parts.push(String(draft.location));
    if (draft.quantity && draft.unit) parts.push(`${draft.quantity} ${draft.unit}`);
    const suggestion = parts.join(" — ");
    setDraft(prev => ({ ...prev, title: prev.title || (suggestion || null) }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft.category_code, draft.subcategory_code, draft.location, draft.quantity, draft.unit, tax]);

  async function handleSave() {
    setLoading(true); 
    setErrors([]);
    try {
      if (!draftId) {
        const res = await saveDraft(draft);
        setDraftId(res.id);
      } else {
        await updateDraft(draftId, draft);
      }
      toast({
        title: "Draft Saved",
        description: "Your listing has been saved as a draft.",
      });
    } catch (e: any) {
      toast({
        title: "Error",
        description: e.message || "Save failed",
        variant: "destructive",
      });
    } finally { 
      setLoading(false); 
    }
  }

  async function handlePublish() {
    if (!draftId) { 
      toast({
        title: "Error",
        description: "Save as Draft first.",
        variant: "destructive",
      });
      return; 
    }
    setLoading(true); 
    setErrors([]);
    try {
      const res = await publishListing(draftId);
      if (!res.ok) {
        setErrors(res.checklist || ["Unable to publish"]);
        return;
      }
      toast({
        title: "Success",
        description: "Listing published successfully!",
      });
      // optionally navigate to listings page
    } catch (e: any) {
      setErrors([e.message || "Publish failed"]);
    } finally { 
      setLoading(false); 
    }
  }

  if (!user) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Please log in to create a listing.</p>
      </div>
    );
  }

  // Simple step container
  const Nav = () => (
    <div className="flex items-center gap-2 my-4">
      <Button 
        variant="outline" 
        onClick={() => setStep(s => Math.max(1, s-1))}
        disabled={step === 1}
      >
        Back
      </Button>
      <Button 
        variant="outline"
        onClick={handleSave}
        disabled={loading}
      >
        {loading ? "Saving..." : "Save as Draft"}
      </Button>
      <Button 
        onClick={() => setStep(s => s+1)}
        disabled={step === 8}
      >
        Next
      </Button>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Create New Listing</CardTitle>
          <div className="text-sm text-gray-600">
            Step {step} of 8: {
              step === 1 ? "Category" :
              step === 2 ? "Sub-category" :
              step === 3 ? "Identity & Presentation" :
              step === 4 ? "Quantity & Logistics" :
              step === 5 ? "Commercials" :
              step === 6 ? "Compliance & Trust" :
              step === 7 ? "Media" :
              "Review & Publish"
            }
          </div>
        </CardHeader>
        <CardContent>
          {/* Errors (e.g., from publish) */}
          {errors.length > 0 && (
            <div className="mb-4 rounded border border-red-300 bg-red-50 p-3">
              <p className="font-medium mb-1">Needs attention before publish:</p>
              <ul className="list-disc pl-5">{errors.map((e,i) => <li key={i}>{e}</li>)}</ul>
            </div>
          )}

          {/* STEP 1: Category */}
          {step === 1 && (
            <section className="space-y-4">
              <div>
                <label className="block mb-1 font-medium">Category *</label>
                <select
                  value={draft.category_code || ""}
                  onChange={(e) => setDraft(d => ({ ...d, category_code: e.target.value || undefined, subcategory_code: undefined }))}
                  className="w-full border rounded px-3 py-2"
                >
                  <option value="">Select a category…</option>
                  {tax.categories.map(c => <option key={c.code} value={c.code}>{c.label}</option>)}
                </select>
                <p className="text-sm text-gray-500 mt-1">Choose a category to unlock the next step.</p>
              </div>
              <Nav />
            </section>
          )}

          {/* STEP 2: Sub-category */}
          {step === 2 && (
            <section className="space-y-4">
              <div>
                <label className="block mb-1 font-medium">Sub-category *</label>
                <select
                  value={draft.subcategory_code || ""}
                  onChange={(e) => setDraft(d => ({ ...d, subcategory_code: e.target.value || undefined }))}
                  disabled={!draft.category_code}
                  className="w-full border rounded px-3 py-2 disabled:bg-gray-100"
                >
                  <option value="">{draft.category_code ? "Select a sub-category…" : "Select a category first"}</option>
                  {(tax.map[draft.category_code!] || []).map(s => <option key={s.code} value={s.code}>{s.label}</option>)}
                </select>
              </div>
              <Nav />
            </section>
          )}

          {/* STEP 3: Identity & Presentation */}
          {step === 3 && (
            <section className="space-y-4">
              <div className="flex items-center gap-2">
                <input
                  id="anon"
                  type="checkbox"
                  checked={!!draft.isAnonymous}
                  onChange={(e) => setDraft(d => ({ ...d, isAnonymous: e.target.checked }))}
                />
                <label htmlFor="anon">Trade anonymously (show trading name publicly)</label>
              </div>
              {draft.isAnonymous && (
                <div>
                  <label className="block mb-1 font-medium">Trading name</label>
                  <input
                    value={draft.tradingName || ""}
                    onChange={(e) => setDraft(d => ({ ...d, tradingName: e.target.value || null }))}
                    className="w-full border rounded px-3 py-2"
                    placeholder="e.g., EC Green Trader"
                  />
                </div>
              )}
              <div>
                <label className="block mb-1 font-medium">Title</label>
                <input
                  value={draft.title || ""}
                  onChange={(e) => setDraft(d => ({ ...d, title: e.target.value || null }))}
                  className="w-full border rounded px-3 py-2"
                  placeholder="Auto-suggested title (editable)"
                />
              </div>
              <div>
                <label className="block mb-1 font-medium">Short description</label>
                <textarea
                  value={draft.description || ""}
                  onChange={(e) => setDraft(d => ({ ...d, description: e.target.value || null }))}
                  className="w-full border rounded px-3 py-2"
                  rows={4}
                />
              </div>
              <Nav />
            </section>
          )}

          {/* STEP 4: Quantity & Logistics */}
          {step === 4 && (
            <section className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1 font-medium">Quantity</label>
                  <input
                    type="number"
                    value={draft.quantity ?? ""}
                    onChange={(e) => setDraft(d => ({ ...d, quantity: e.target.value === "" ? null : Number(e.target.value) }))}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block mb-1 font-medium">Unit</label>
                  <select
                    value={draft.unit || ""}
                    onChange={(e) => setDraft(d => ({ ...d, unit: e.target.value || null }))}
                    className="w-full border rounded px-3 py-2"
                  >
                    <option value="">Select unit…</option>
                    {["kg","g","oz","lb","ton","units","ml","l"].map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1 font-medium">Minimum order quantity</label>
                  <input
                    type="number"
                    value={draft.minOrderQuantity ?? ""}
                    onChange={(e) => setDraft(d => ({ ...d, minOrderQuantity: e.target.value === "" ? null : Number(e.target.value) }))}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block mb-1 font-medium">Region / Location</label>
                  <input
                    value={draft.location || ""}
                    onChange={(e) => setDraft(d => ({ ...d, location: e.target.value || null }))}
                    className="w-full border rounded px-3 py-2"
                    placeholder="e.g., Eastern Cape, South Africa"
                  />
                </div>
              </div>
              <div>
                <label className="block mb-1 font-medium">Supply frequency *</label>
                <select
                  value={draft.supplyFrequency || ""}
                  onChange={(e) => setDraft(d => ({ ...d, supplyFrequency: e.target.value || null }))}
                  className="w-full border rounded px-3 py-2"
                >
                  <option value="">Select…</option>
                  {["one-time","weekly","monthly","quarterly","on-demand","continuous"].map(f => (
                    <option key={f} value={f}>{f.replace("-"," ")}</option>
                  ))}
                </select>
              </div>
              <Nav />
            </section>
          )}

          {/* STEP 5: Commercials */}
          {step === 5 && (
            <section className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1 font-medium">Price per unit</label>
                  <input
                    type="number"
                    value={draft.pricePerUnit ?? ""}
                    onChange={(e) => setDraft(d => ({ ...d, pricePerUnit: e.target.value === "" ? null : Number(e.target.value) }))}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block mb-1 font-medium">Currency</label>
                  <select
                    value={draft.currency || ""}
                    onChange={(e) => setDraft(d => ({ ...d, currency: e.target.value || null }))}
                    className="w-full border rounded px-3 py-2"
                  >
                    <option value="">Select currency…</option>
                    {["ZAR","USD","EUR","GBP"].map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block mb-1 font-medium">Payment method *</label>
                <select
                  value={draft.paymentMethod || ""}
                  onChange={(e) => setDraft(d => ({ ...d, paymentMethod: e.target.value || null }))}
                  className="w-full border rounded px-3 py-2"
                >
                  <option value="">Select…</option>
                  {["bank-transfer","credit-card","cryptocurrency","cash","escrow","payment-on-delivery"].map(p => (
                    <option key={p} value={p}>{p.replace("-"," ")}</option>
                  ))}
                </select>
              </div>
              <Nav />
            </section>
          )}

          {/* STEP 6: Compliance & Trust */}
          {step === 6 && (
            <section className="space-y-4">
              <div>
                <label className="block mb-1 font-medium">Certificate of Analysis (COA) *</label>
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setDraft(d => ({ ...d, coaDocument: file.name }));
                    }
                  }}
                  className="w-full border rounded px-3 py-2"
                />
                <p className="text-sm text-gray-500 mt-1">Upload lab test results or quality analysis</p>
              </div>
              <div>
                <label className="block mb-1 font-medium">Licenses & Certificates *</label>
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  multiple
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []);
                    if (files.length > 0) {
                      setDraft(d => ({ ...d, certificatesDocuments: files.map(f => f.name) }));
                    }
                  }}
                  className="w-full border rounded px-3 py-2"
                />
                <p className="text-sm text-gray-500 mt-1">Business license, cultivation permit, etc.</p>
              </div>
              <Nav />
            </section>
          )}

          {/* STEP 7: Media */}
          {step === 7 && (
            <section className="space-y-4">
              <div>
                <label className="block mb-1 font-medium">Product Photos *</label>
                <input
                  type="file"
                  accept=".jpg,.jpeg,.png"
                  multiple
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []);
                    if (files.length > 0) {
                      setDraft(d => ({ ...d, images: files.map(f => f.name) }));
                    }
                  }}
                  className="w-full border rounded px-3 py-2"
                />
                <p className="text-sm text-gray-500 mt-1">Add at least one high-quality photo</p>
              </div>
              <Nav />
            </section>
          )}

          {/* STEP 8: Review & Publish */}
          {step === 8 && (
            <section className="space-y-4">
              <h3 className="text-lg font-semibold">Publishing Checklist</h3>
              
              {/* Checklist */}
              <div className="space-y-2">
                {[
                  { label: "Choose a Category", completed: !!draft.category_code },
                  { label: "Choose a Sub-category", completed: !!draft.subcategory_code },
                  { label: "Set Supply Frequency", completed: !!draft.supplyFrequency },
                  { label: "Choose a Payment Method", completed: !!draft.paymentMethod },
                  { label: "Add at least one product photo", completed: (draft.images?.length || 0) > 0 },
                  { label: "Upload a Certificate of Analysis (COA)", completed: !!draft.coaDocument },
                  { label: "Upload a licence or certificate", completed: (draft.certificatesDocuments?.length || 0) > 0 }
                ].map((item, i) => (
                  <div key={i} className={`flex items-center gap-2 p-2 rounded ${item.completed ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                    <span>{item.completed ? '✓' : '✗'}</span>
                    <span>{item.label}</span>
                  </div>
                ))}
              </div>

              <div className="flex gap-2 pt-4">
                <Button variant="outline" onClick={() => setStep(7)}>
                  Back
                </Button>
                <Button 
                  onClick={handleSave}
                  variant="outline"
                  disabled={loading}
                >
                  Save as Draft
                </Button>
                <Button 
                  onClick={handlePublish}
                  disabled={loading}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {loading ? "Publishing..." : "Publish Listing"}
                </Button>
              </div>
            </section>
          )}
        </CardContent>
      </Card>
    </div>
  );
}