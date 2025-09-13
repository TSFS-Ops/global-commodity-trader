import { db } from "./server/db";
import { users, listings } from "./shared/schema";

async function main() {
  try {
    console.log("===== CHECKING DATABASE =====");
    
    // Check users
    const allUsers = await db.select().from(users);
    console.log("Users in database:", allUsers.length);
    allUsers.forEach(user => {
      console.log(`ID: ${user.id}, Username: ${user.username}, Email: ${user.email}, Role: ${user.role}`);
    });
    
    // Check listings
    const allListings = await db.select().from(listings);
    console.log("\nListings in database:", allListings.length);
    allListings.forEach(listing => {
      console.log(`ID: ${listing.id}, Title: ${listing.title}, Category: ${listing.category}, Price: ${listing.pricePerUnit}`);
    });
    
    console.log("===== DATABASE CHECK COMPLETE =====");
  } catch (error) {
    console.error("Error checking database:", error);
  } finally {
    // Close the connection pool
    process.exit(0);
  }
}

main();