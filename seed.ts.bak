import { storage } from "./storage";
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";
import { log } from "./vite";

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

export async function seedDefaultUsers() {
  try {
    // Check if there are any users first
    const existingUsers = await storage.getUser(1);  // Check if at least one user exists
    
    if (existingUsers) {
      log("Users already exist, skipping seeding", "express");
      return; // Skip seeding if users exist
    }

    // Create a simple test user (easier to remember for testing)
    await storage.createUser({
      username: "test",
      email: "test@example.com",
      password: await hashPassword("test123"),
      fullName: "Test User",
      role: "buyer",
      bio: "Test account for development",
      company: "Test Company",
      location: "South Africa",
    });

    // Create a seller user for testing
    await storage.createUser({
      username: "seller",
      email: "seller@example.com",
      password: await hashPassword("seller123"),
      fullName: "Test Seller",
      role: "seller",
      bio: "Hemp products seller for testing",
      company: "Test Hemp Co",
      location: "South Africa",
    });

    // Create an admin user for testing
    await storage.createUser({
      username: "admin",
      email: "admin@example.com",
      password: await hashPassword("admin123"),
      fullName: "System Administrator",
      role: "admin",
      bio: "Platform administrator with full access",
      company: "Izenzo Admin",
      location: "South Africa",
    });

    log("Default test users created successfully (buyer: test/test123, seller: seller/seller123, admin: admin/admin123)", "express");
  } catch (error) {
    log(`Error seeding default users: ${error}`, "express");
  }
}

export async function seedDefaultListings() {
  try {
    // Check if any listings exist
    const existingListings = await storage.getListings();
    
    if (existingListings && existingListings.length > 0) {
      log("Listings already exist, skipping seeding", "express");
      return;
    }
    
    // Get the seller user
    const seller = await storage.getUserByUsername("seller");
    
    if (!seller) {
      log("Seller user not found, cannot seed listings", "express");
      return;
    }
    
    // Create some sample hemp product listings
    await storage.createListing({
      sellerId: seller.id,
      title: "Premium Hemp Flower",
      category: "hemp",
      description: "High-quality, organically grown hemp flower with high CBD content. Perfect for processing into oils and extracts.",
      pricePerUnit: 150.00,
      unit: "kg",
      quantity: 100,
      minOrderQuantity: 5,
      location: "Eastern Cape, South Africa",
      status: "active",
      isFeatured: true
    });

    await storage.createListing({
      sellerId: seller.id,
      title: "Hemp Fiber Bundle",
      category: "hemp",
      description: "Raw hemp fiber bundles, perfect for textile manufacturing. Sustainably grown and processed.",
      pricePerUnit: 75.00,
      unit: "kg",
      quantity: 500,
      minOrderQuantity: 50,
      location: "KwaZulu-Natal, South Africa",
      status: "active",
      isFeatured: true
    });

    await storage.createListing({
      sellerId: seller.id,
      title: "Organic Hemp Seeds",
      category: "hemp",
      description: "Certified organic hemp seeds for planting or food production. High germination rate.",
      pricePerUnit: 200.00,
      unit: "kg",
      quantity: 50,
      minOrderQuantity: 5,
      location: "Western Cape, South Africa",
      status: "active",
      isFeatured: false
    });

    // Create a cannabis listing
    await storage.createListing({
      sellerId: seller.id,
      title: "Premium Cannabis Flower",
      category: "cannabis",
      description: "Top-quality cannabis flower with balanced THC and CBD content. Grown using organic practices and carefully harvested.",
      pricePerUnit: 45.00,
      unit: "gram",
      quantity: 5000,
      minOrderQuantity: 50,
      location: "Eastern Cape, South Africa",
      status: "active",
      isFeatured: true
    });

    log("Default listings created successfully", "express");
  } catch (error) {
    log(`Error seeding default listings: ${error}`, "express");
  }
}

export async function seedMockOrders() {
  try {
    // Check if any orders exist
    const existingOrders = await storage.getOrders();
    
    if (existingOrders && existingOrders.length > 0) {
      log("Orders already exist, skipping seeding", "express");
      return;
    }
    
    // Get the buyer and seller users
    const buyer = await storage.getUserByUsername("test");
    const seller = await storage.getUserByUsername("seller");
    
    if (!buyer || !seller) {
      log("Buyer or seller user not found, cannot seed orders", "express");
      return;
    }
    
    // Get the listings
    const listings = await storage.getListings();
    
    if (!listings || listings.length === 0) {
      log("No listings found, cannot seed orders", "express");
      return;
    }
    
    // Create some sample orders with different statuses
    
    // Order 1: Completed order for Premium Hemp Flower
    const hempFlower = listings.find(l => l.title === "Premium Hemp Flower");
    if (hempFlower) {
      await storage.createOrder({
        buyerId: buyer.id,
        sellerId: seller.id,
        listingId: hempFlower.id,
        quantity: 10,
        totalPrice: 10 * hempFlower.pricePerUnit,
        status: "completed",
        deliveryAddress: "123 Test Street, Cape Town, South Africa",
        notes: "Please package securely for long transport",
        transactionId: "mock-transaction-001"
      });
    }
    
    // Order 2: Processing order for Hemp Fiber Bundle
    const hempFiber = listings.find(l => l.title === "Hemp Fiber Bundle");
    if (hempFiber) {
      await storage.createOrder({
        buyerId: buyer.id,
        sellerId: seller.id,
        listingId: hempFiber.id,
        quantity: 100,
        totalPrice: 100 * hempFiber.pricePerUnit,
        status: "processing",
        deliveryAddress: "456 Sample Road, Johannesburg, South Africa",
        notes: "Need delivery confirmation call",
        transactionId: "mock-transaction-002"
      });
    }
    
    // Order 3: Pending order for Cannabis Flower
    const cannabisFlower = listings.find(l => l.title === "Premium Cannabis Flower");
    if (cannabisFlower) {
      await storage.createOrder({
        buyerId: buyer.id,
        sellerId: seller.id,
        listingId: cannabisFlower.id,
        quantity: 100,
        totalPrice: 100 * cannabisFlower.pricePerUnit,
        status: "pending",
        deliveryAddress: "789 Test Avenue, Durban, South Africa",
        notes: "Need certificates of authenticity and lab results",
        transactionId: null
      });
    }
    
    log("Mock orders created successfully", "express");
  } catch (error) {
    log(`Error seeding mock orders: ${error}`, "express");
  }
}

export async function seedCannabisProducts() {
  try {
    // Check if there are any cannabis products first
    const existingProducts = await storage.getCannabisProductById(1);
    
    if (existingProducts) {
      log("Cannabis products already exist, skipping seeding", "express");
      return;
    }
    
    // Get the seller user
    const seller = await storage.getUserByUsername("seller");
    if (!seller) {
      log("Seller not found, cannot seed cannabis products", "express");
      return;
    }
    
    // Create cannabis products
    await storage.createCannabisProduct({
      ownerId: seller.id,
      productName: "Premium Hemp Flower",
      strain: "Charlotte's Web",
      location: "Eastern Cape, South Africa",
      quantity: 1000,
      pricePerUnit: 15.0,
      thcContent: 0.2,
      cbdContent: 12.5,
      description: "High-CBD hemp flower, perfect for extracting CBD oil or making tinctures.",
      certificationStandard: "Organic Certified",
      harvestDate: new Date("2025-03-15")
    });
    
    await storage.createCannabisProduct({
      ownerId: seller.id,
      productName: "Cannabis Sativa Seeds",
      strain: "Durban Poison",
      location: "KwaZulu-Natal, South Africa",
      quantity: 500,
      pricePerUnit: 25.0,
      thcContent: 17.5,
      cbdContent: 0.5,
      description: "Premium cannabis seeds from the famous Durban Poison strain. High germination rate.",
      certificationStandard: "Endemic Landrace Certified",
      harvestDate: new Date("2025-04-01")
    });
    
    await storage.createCannabisProduct({
      ownerId: seller.id,
      productName: "Hemp Fiber",
      strain: "Industrial Hemp",
      location: "Eastern Cape, South Africa",
      quantity: 5000,
      pricePerUnit: 3.5,
      thcContent: 0.1,
      cbdContent: 2.0,
      description: "High-quality industrial hemp fiber for textiles and manufacturing.",
      certificationStandard: "Sustainable Harvest Certified",
      harvestDate: new Date("2025-02-10")
    });
    
    log("Cannabis products created successfully", "express");
  } catch (error) {
    log(`Error seeding cannabis products: ${error}`, "express");
  }
}

export async function seedAllData() {
  await seedDefaultUsers();
  await seedDefaultListings();
  await seedCannabisProducts();
  await seedMockOrders();
}