
import { MongoClient, Db, ServerApiVersion } from 'mongodb';

// MongoDB Atlas connection string
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://lost-found:sagar123@lost-found.6pref4z.mongodb.net/?retryWrites=true&w=majority&appName=lost-found';

let cachedClient: MongoClient | null = null;
let cachedDb: Db | null = null;

export async function connectToMongo(): Promise<{ client: MongoClient; db: Db }> {
  // For browser compatibility during development
  if (typeof window !== 'undefined') {
    console.log("Using mock MongoDB for browser development");
    return { client: {} as MongoClient, db: {} as Db };
  }

  if (cachedClient && cachedDb) {
    return { client: cachedClient, db: cachedDb };
  }

  try {
    const client = new MongoClient(MONGODB_URI, {
      serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
      }
    });

    await client.connect();
    const db = client.db();
    
    cachedClient = client;
    cachedDb = db;
    
    console.log("Connected to MongoDB Atlas");
    return { client, db };
  } catch (error) {
    console.error("Failed to connect to MongoDB:", error);
    // Fallback to mock DB for browser development
    return { client: {} as MongoClient, db: {} as Db };
  }
}

export function getDb() {
  if (!cachedDb) {
    throw new Error('You must call connectToMongo before using getDb');
  }
  return cachedDb;
}

export async function closeMongoConnection() {
  if (cachedClient) {
    await cachedClient.close();
    cachedClient = null;
    cachedDb = null;
    console.log("MongoDB connection closed");
  }
}

// Collections names
export const collections = {
  users: "users",
  lostItems: "lostItems",
  foundItems: "foundItems",
  images: "images"
};
