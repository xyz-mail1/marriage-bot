import { MongoClient } from "mongodb";

const MONGO_URI = process.env.mongo_uri;
const DB_NAME = "kurt_rayloff";

const client = new MongoClient(MONGO_URI);

let db = null;

export async function connectToDatabase() {
  if (!db) {
    await client.connect();
    db = client.db(DB_NAME);
    console.log("✅ Connected to MongoDB");
  }
  return db;
}
