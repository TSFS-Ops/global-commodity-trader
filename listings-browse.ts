import { Router } from "express";
import { storage } from "../storage.js";
import { TAXONOMY } from "../taxonomy.js";

// Middleware to check if user is authenticated
const isAuthenticated = (req: any, res: any, next: any) => {
  if (req.isAuthenticated()) {
    return next();
  }
  return res.status(401).send("Unauthorized");
};

const router = Router();

// helper to map code -> label
function catLabel(code?: string | null) {
  if (!code) return null;
  const c = TAXONOMY.categories.find(c => c.code === code);
  return c?.label || code;
}

router.get("/api/listings", isAuthenticated, async (req, res) => {
  try {
    const {
      status,
      category_code,
      q,
      mine,
      limit = "24",
      offset = "0"
    } = req.query as Record<string,string>;

    const filters: Record<string, any> = {};
    
    // Visibility rules
    if (mine === "true") {
      // Show user's own listings (both draft and active)
      filters.sellerId = req.user!.id;
    } else {
      // Show only active listings for others, hide drafts
      filters.status = "active";
    }
    
    // Additional filters
    if (category_code) {
      filters.categoryCode = category_code;
    }
    
    if (q) {
      filters.search = q; // Will be handled in storage layer
    }
    
    const numLimit = parseInt(limit);
    const numOffset = parseInt(offset);
    const listings = await storage.getListings(filters, numLimit, numOffset);
    
    // Add category labels from taxonomy
    const enrichedListings = listings.map((listing: any) => {
      const category = TAXONOMY.categories.find(cat => cat.code === listing.categoryCode);
      return {
        ...listing,
        category_label: category?.label || listing.categoryCode || listing.category,
        category_code: listing.categoryCode || listing.category
      };
    });
    
    // Add cache headers for better performance
    res.set('Cache-Control', 'public, max-age=300'); // Cache for 5 minutes
    res.json({
      ok: true,
      items: enrichedListings,
      nextOffset: numOffset + numLimit
    });
  } catch (e: any) {
    console.error("GET /api/listings error", e);
    res.status(500).json({ ok: false, error: "Failed to load listings" });
  }
});

export default router;