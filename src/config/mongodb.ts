
import { MongoClient, Db, ServerApiVersion } from 'mongodb';

// MongoDB Atlas connection string
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://lost-found:sagar123@lost-found.6pref4z.mongodb.net/?retryWrites=true&w=majority&appName=lost-found';

let cachedClient: MongoClient | null = null;
let cachedDb: Db | null = null;

// Check if code is running in browser
const isBrowser = typeof window !== 'undefined';

export async function connectToMongo(): Promise<{ client: MongoClient; db: Db }> {
  // For browser compatibility, return mock objects
  if (isBrowser) {
    console.log("Using mock MongoDB for browser environment");
    return { 
      client: {} as MongoClient, 
      db: {
        collection: () => ({
          find: () => ({
            sort: () => ({
              toArray: async () => []
            }),
            toArray: async () => []
          }),
          findOne: async () => null,
          insertOne: async () => ({ insertedId: "mock-id" }),
          findOneAndUpdate: async () => null,
          deleteOne: async () => ({ deletedCount: 1 })
        })
      } as unknown as Db 
    };
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
    throw new Error("Failed to connect to MongoDB");
  }
}

export function getDb() {
  // If in browser, return mock db
  if (isBrowser) {
    return {
      collection: () => ({
        find: () => ({
          sort: () => ({
            toArray: async () => []
          }),
          toArray: async () => []
        }),
        findOne: async () => null,
        insertOne: async () => ({ insertedId: "mock-id" }),
        findOneAndUpdate: async () => null,
        deleteOne: async () => ({ deletedCount: 1 })
      })
    } as unknown as Db;
  }
  
  if (!cachedDb) {
    throw new Error('You must call connectToMongo before using getDb');
  }
  return cachedDb;
}

export async function closeMongoConnection() {
  if (!isBrowser && cachedClient) {
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
