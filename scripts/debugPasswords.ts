import mongoose from "mongoose";
import dotenv from "dotenv";
import { User } from "../src/models/user.js";

// Load environment variables
dotenv.config();

// Connect to MongoDB
const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
      throw new Error("MONGO_URI environment variable is not set");
    }

    await mongoose.connect(mongoUri);
    console.log("✅ Connected to MongoDB successfully");
  } catch (error) {
    console.error("❌ Failed to connect to MongoDB:", error);
    process.exit(1);
  }
};

// Debug password encryption
const debugPasswords = async () => {
  try {
    console.log("🔍 Checking password encryption...");

    // Get all users with password fields
    const users = await User.find(
      {},
      { name: 1, email: 1, password: 1, _id: 0 }
    );

    console.log(`📊 Found ${users.length} users:`);
    console.log("=".repeat(50));

    users.forEach((user, index) => {
      console.log(`${index + 1}. ${user.name} (${user.email})`);
      console.log(`   Password: ${user.password}`);
      console.log(`   Password length: ${user.password?.length || 0}`);
      console.log(
        `   Is encrypted: ${
          user.password !== "abc123" && user.password !== "password123"
            ? "✅ YES"
            : "❌ NO"
        }`
      );
      console.log("---");
    });

    // Check if any passwords are still plain text
    const plainTextPasswords = users.filter(
      (user) => user.password === "abc123" || user.password === "password123"
    );

    if (plainTextPasswords.length > 0) {
      console.log(
        `⚠️  WARNING: ${plainTextPasswords.length} passwords are still plain text!`
      );
      console.log("This means the encryption plugin is not working properly.");
    } else {
      console.log("🎉 All passwords appear to be encrypted!");
    }
  } catch (error) {
    console.error("❌ Failed to debug passwords:", error);
  }
};

// Main function
const main = async () => {
  console.log("🔍 Starting password debugging...");

  try {
    await connectDB();
    await debugPasswords();

    console.log("🎉 Password debugging completed!");
  } catch (error) {
    console.error("💥 Debugging failed:", error);
  } finally {
    // Close database connection
    await mongoose.connection.close();
    console.log("🔌 Database connection closed");
    process.exit(0);
  }
};

// Run the script
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}
