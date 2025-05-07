
// This file is kept for compatibility but doesn't actually connect to MongoDB in browser
// In a real implementation, this would be a server-side script

// Mock MongoDB client for browser compatibility
export async function connectToMongo() {
  console.log("Mock MongoDB connection for browser development");
  return {};
}

// Get mock database instance
export function getDb() {
  return {};
}

// Close mock MongoDB connection
export async function closeMongoConnection() {
  console.log("Mock MongoDB connection closed");
}

// Collections names (for consistency)
export const collections = {
  users: "users",
  lostItems: "lostItems",
  foundItems: "foundItems",
  images: "images"
};
