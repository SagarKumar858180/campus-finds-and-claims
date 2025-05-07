
import { Item, ItemFormData, ItemStatus, ItemType, User } from "@/types";
import { connectToMongo, collections } from "@/config/mongodb";
import { ObjectId } from "mongodb";

// For browser compatibility during development, we'll use localStorage as fallback
const isBrowser = typeof window !== 'undefined';

// Helper to generate IDs for browser mode
const generateId = (): string => {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};

// Initialize storage for browser mode
const initStorage = () => {
  if (isBrowser) {
    if (!localStorage.getItem('users')) {
      localStorage.setItem('users', JSON.stringify([]));
    }
    if (!localStorage.getItem('lostItems')) {
      localStorage.setItem('lostItems', JSON.stringify([]));
    }
    if (!localStorage.getItem('foundItems')) {
      localStorage.setItem('foundItems', JSON.stringify([]));
    }
  }
};

// Store image as base64 string for browser mode
const storeImage = async (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      resolve(reader.result as string);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

// User operations
export const createUser = async (email: string, password: string, name: string): Promise<User> => {
  if (isBrowser) {
    initStorage();
    const id = generateId();
    const newUser = { id, email, name };
    
    // Store user in localStorage
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    users.push({ ...newUser, password }); // Only in browser mode we store password like this
    localStorage.setItem('users', JSON.stringify(users));
    
    return newUser;
  } else {
    try {
      const { db } = await connectToMongo();
      const usersCollection = db.collection(collections.users);
      
      // Hash password in a real implementation
      const hashedPassword = password; // Use bcrypt or similar in real app
      
      const result = await usersCollection.insertOne({
        email,
        password: hashedPassword,
        name,
        createdAt: new Date()
      });
      
      return {
        id: result.insertedId.toString(),
        email,
        name
      };
    } catch (error) {
      console.error("Error creating user:", error);
      throw new Error("Failed to create user");
    }
  }
};

export const findUserByEmail = async (email: string): Promise<{ id: string; email: string; name: string; password: string } | null> => {
  if (isBrowser) {
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    const user = users.find((u: any) => u.email.toLowerCase() === email.toLowerCase());
    return user || null;
  } else {
    try {
      const { db } = await connectToMongo();
      const usersCollection = db.collection(collections.users);
      
      const user = await usersCollection.findOne({ email: email.toLowerCase() });
      
      if (!user) return null;
      
      return {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
        password: user.password
      };
    } catch (error) {
      console.error("Error finding user:", error);
      return null;
    }
  }
};

// Item operations
export const createItem = async (
  itemData: ItemFormData,
  type: ItemType,
  userId: string,
  userName: string
): Promise<Item> => {
  if (isBrowser) {
    initStorage();
    
    const now = new Date().toISOString();
    const id = generateId();
    
    // Convert image to base64 if it exists
    const imageUrl = itemData.image 
      ? await storeImage(itemData.image)
      : '/placeholder.svg';
    
    const newItem: Item = {
      id,
      name: itemData.name,
      category: itemData.category,
      location: itemData.location,
      date: itemData.date,
      description: itemData.description,
      imageUrl: imageUrl,
      userId,
      userName,
      contactInfo: itemData.contactInfo,
      createdAt: now,
      type,
      status: "searching"
    };

    const collection = type === "lost" ? 'lostItems' : 'foundItems';
    const items = JSON.parse(localStorage.getItem(collection) || '[]');
    items.push(newItem);
    localStorage.setItem(collection, JSON.stringify(items));
    
    return newItem;
  } else {
    try {
      const { db } = await connectToMongo();
      const collection = type === "lost" ? collections.lostItems : collections.foundItems;
      
      // Process the image
      let imageUrl = '/placeholder.svg';
      if (itemData.image) {
        // In a real implementation, you'd upload to a storage service
        // For this example, we'll convert to base64
        imageUrl = await storeImage(itemData.image);
      }
      
      const newItem = {
        name: itemData.name,
        category: itemData.category,
        location: itemData.location,
        date: itemData.date,
        description: itemData.description,
        imageUrl,
        userId,
        userName,
        contactInfo: itemData.contactInfo,
        createdAt: new Date(),
        type,
        status: "searching" as ItemStatus
      };
      
      const result = await db.collection(collection).insertOne(newItem);
      
      return {
        ...newItem,
        id: result.insertedId.toString(),
        createdAt: new Date().toISOString()
      };
    } catch (error) {
      console.error("Error creating item:", error);
      throw new Error("Failed to create item");
    }
  }
};

export const getLostItems = async (): Promise<Item[]> => {
  if (isBrowser) {
    initStorage();
    return JSON.parse(localStorage.getItem('lostItems') || '[]');
  } else {
    try {
      const { db } = await connectToMongo();
      const lostItems = await db.collection(collections.lostItems)
        .find()
        .sort({ createdAt: -1 })
        .toArray();
      
      return lostItems.map(item => ({
        ...item,
        id: item._id.toString(),
        createdAt: item.createdAt.toISOString()
      }));
    } catch (error) {
      console.error("Error getting lost items:", error);
      return [];
    }
  }
};

export const getFoundItems = async (): Promise<Item[]> => {
  if (isBrowser) {
    initStorage();
    return JSON.parse(localStorage.getItem('foundItems') || '[]');
  } else {
    try {
      const { db } = await connectToMongo();
      const foundItems = await db.collection(collections.foundItems)
        .find()
        .sort({ createdAt: -1 })
        .toArray();
      
      return foundItems.map(item => ({
        ...item,
        id: item._id.toString(),
        createdAt: item.createdAt.toISOString()
      }));
    } catch (error) {
      console.error("Error getting found items:", error);
      return [];
    }
  }
};

export const getItemById = async (id: string): Promise<Item | undefined> => {
  if (isBrowser) {
    initStorage();
    
    // Try to find in lost items
    let lostItems = JSON.parse(localStorage.getItem('lostItems') || '[]');
    let item = lostItems.find((item: Item) => item.id === id);
    
    // If not found, try found items
    if (!item) {
      let foundItems = JSON.parse(localStorage.getItem('foundItems') || '[]');
      item = foundItems.find((item: Item) => item.id === id);
    }
    
    return item;
  } else {
    try {
      const { db } = await connectToMongo();
      
      // Try to find in lost items
      let item = await db.collection(collections.lostItems).findOne({
        _id: new ObjectId(id)
      });
      
      // If not found, try found items
      if (!item) {
        item = await db.collection(collections.foundItems).findOne({
          _id: new ObjectId(id)
        });
      }
      
      if (!item) return undefined;
      
      return {
        ...item,
        id: item._id.toString(),
        createdAt: typeof item.createdAt === 'string' ? item.createdAt : item.createdAt.toISOString()
      };
    } catch (error) {
      console.error("Error getting item by ID:", error);
      return undefined;
    }
  }
};

export const getUserItems = async (userId: string): Promise<Item[]> => {
  if (isBrowser) {
    initStorage();
    
    const lostItems = JSON.parse(localStorage.getItem('lostItems') || '[]');
    const foundItems = JSON.parse(localStorage.getItem('foundItems') || '[]');
    
    const userLostItems = lostItems.filter((item: Item) => item.userId === userId);
    const userFoundItems = foundItems.filter((item: Item) => item.userId === userId);
    
    return [...userLostItems, ...userFoundItems];
  } else {
    try {
      const { db } = await connectToMongo();
      
      const lostItems = await db.collection(collections.lostItems)
        .find({ userId })
        .sort({ createdAt: -1 })
        .toArray();
        
      const foundItems = await db.collection(collections.foundItems)
        .find({ userId })
        .sort({ createdAt: -1 })
        .toArray();
      
      const allItems = [...lostItems, ...foundItems].map(item => ({
        ...item,
        id: item._id.toString(),
        createdAt: typeof item.createdAt === 'string' ? item.createdAt : item.createdAt.toISOString()
      }));
      
      return allItems;
    } catch (error) {
      console.error("Error getting user items:", error);
      return [];
    }
  }
};

export const updateItemStatus = async (
  itemId: string,
  status: ItemStatus
): Promise<Item | null> => {
  if (isBrowser) {
    initStorage();
    
    // Try to update in lost items
    let lostItems = JSON.parse(localStorage.getItem('lostItems') || '[]');
    let itemIndex = lostItems.findIndex((item: Item) => item.id === itemId);
    
    if (itemIndex !== -1) {
      lostItems[itemIndex].status = status;
      localStorage.setItem('lostItems', JSON.stringify(lostItems));
      return lostItems[itemIndex];
    }
    
    // If not found, try found items
    let foundItems = JSON.parse(localStorage.getItem('foundItems') || '[]');
    itemIndex = foundItems.findIndex((item: Item) => item.id === itemId);
    
    if (itemIndex !== -1) {
      foundItems[itemIndex].status = status;
      localStorage.setItem('foundItems', JSON.stringify(foundItems));
      return foundItems[itemIndex];
    }
    
    return null;
  } else {
    try {
      const { db } = await connectToMongo();
      
      // Try to update in lost items
      const lostResult = await db.collection(collections.lostItems).findOneAndUpdate(
        { _id: new ObjectId(itemId) },
        { $set: { status } },
        { returnDocument: 'after' }
      );
      
      if (lostResult) {
        return {
          ...lostResult,
          id: lostResult._id.toString(),
          createdAt: typeof lostResult.createdAt === 'string' ? lostResult.createdAt : lostResult.createdAt.toISOString()
        };
      }
      
      // If not found, try found items
      const foundResult = await db.collection(collections.foundItems).findOneAndUpdate(
        { _id: new ObjectId(itemId) },
        { $set: { status } },
        { returnDocument: 'after' }
      );
      
      if (foundResult) {
        return {
          ...foundResult,
          id: foundResult._id.toString(),
          createdAt: typeof foundResult.createdAt === 'string' ? foundResult.createdAt : foundResult.createdAt.toISOString()
        };
      }
      
      return null;
    } catch (error) {
      console.error("Error updating item status:", error);
      return null;
    }
  }
};

export const deleteItem = async (itemId: string, userId: string): Promise<boolean> => {
  if (isBrowser) {
    initStorage();
    
    // Try to delete from lost items
    let lostItems = JSON.parse(localStorage.getItem('lostItems') || '[]');
    
    // Find the item first to check ownership
    const lostItem = lostItems.find((item: Item) => item.id === itemId);
    if (lostItem && lostItem.userId === userId) {
      // User owns this item, proceed with deletion
      lostItems = lostItems.filter((item: Item) => item.id !== itemId);
      localStorage.setItem('lostItems', JSON.stringify(lostItems));
      return true;
    } else if (lostItem) {
      // Item exists but user doesn't own it
      return false;
    }
    
    // If not found in lost items, try found items
    let foundItems = JSON.parse(localStorage.getItem('foundItems') || '[]');
    
    // Find the item first to check ownership
    const foundItem = foundItems.find((item: Item) => item.id === itemId);
    if (foundItem && foundItem.userId === userId) {
      // User owns this item, proceed with deletion
      foundItems = foundItems.filter((item: Item) => item.id !== itemId);
      localStorage.setItem('foundItems', JSON.stringify(foundItems));
      return true;
    } 
    
    // Item either doesn't exist or user doesn't own it
    return false;
  } else {
    try {
      const { db } = await connectToMongo();
      
      // First check if the user owns the item in lost items
      const lostItem = await db.collection(collections.lostItems).findOne({
        _id: new ObjectId(itemId),
        userId
      });
      
      if (lostItem) {
        await db.collection(collections.lostItems).deleteOne({ _id: new ObjectId(itemId) });
        return true;
      }
      
      // If not found in lost items, check found items
      const foundItem = await db.collection(collections.foundItems).findOne({
        _id: new ObjectId(itemId),
        userId
      });
      
      if (foundItem) {
        await db.collection(collections.foundItems).deleteOne({ _id: new ObjectId(itemId) });
        return true;
      }
      
      // Item either doesn't exist or user doesn't own it
      return false;
    } catch (error) {
      console.error("Error deleting item:", error);
      return false;
    }
  }
};

export const findPotentialMatches = async (itemId: string): Promise<Item[]> => {
  const item = await getItemById(itemId);
  
  if (!item) {
    return [];
  }
  
  if (isBrowser) {
    // Look for potential matches in the opposite collection
    const oppositeCollection = item.type === "lost" ? 'foundItems' : 'lostItems';
    const items = JSON.parse(localStorage.getItem(oppositeCollection) || '[]');
    
    // Find items with similar category, name, or description
    return items.filter((potentialMatch: Item) => {
      // Check if category matches
      if (potentialMatch.category === item.category) {
        return true;
      }
      
      // Check if name contains similar words
      const itemWords = item.name.toLowerCase().split(' ');
      const matchWords = potentialMatch.name.toLowerCase().split(' ');
      
      for (const word of itemWords) {
        if (word.length > 2 && matchWords.some(matchWord => matchWord.includes(word))) {
          return true;
        }
      }
      
      // Check if description contains similar words
      if (item.description && potentialMatch.description) {
        return itemWords.some(word => 
          word.length > 2 && potentialMatch.description.toLowerCase().includes(word)
        );
      }
      
      return false;
    });
  } else {
    try {
      const { db } = await connectToMongo();
      
      // Determine which collection to search in
      const oppositeCollection = item.type === "lost" 
        ? collections.foundItems 
        : collections.lostItems;
      
      // Create search criteria
      const itemWords = item.name.toLowerCase().split(' ')
        .filter(word => word.length > 2);
      
      // Use text search if MongoDB has text index set up
      // For simplicity, we'll just do a basic category match
      const matches = await db.collection(oppositeCollection)
        .find({ category: item.category })
        .toArray();
        
      return matches.map(match => ({
        ...match,
        id: match._id.toString(),
        createdAt: typeof match.createdAt === 'string' ? match.createdAt : match.createdAt.toISOString()
      }));
    } catch (error) {
      console.error("Error finding potential matches:", error);
      return [];
    }
  }
};
