import mongoose from "mongoose";
import dotenv from "dotenv";
import { User } from "../src/models/user.js";

// Load environment variables
dotenv.config();

// Sample user data
const sampleUsers = [
  { name: "Rasil Baidar", email: "rasil@gmail.com", password: "abc123" },
  {
    name: "John Doe",
    email: "john.doe@example.com",
    password: "password123",
  },
  {
    name: "Jane Smith",
    email: "jane.smith@example.com",
    password: "password123",
  },
  {
    name: "Bob Johnson",
    email: "bob.johnson@example.com",
    password: "password123",
  },
  {
    name: "Alice Brown",
    email: "alice.brown@example.com",
    password: "password123",
  },
  {
    name: "Charlie Wilson",
    email: "charlie.wilson@example.com",
    password: "password123",
  },
];

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

// Clear existing users
const clearUsers = async () => {
  try {
    await User.deleteMany({});
    console.log("🗑️  Cleared existing users");
  } catch (error) {
    console.error("❌ Failed to clear users:", error);
  }
};

// Seed users
const seedUsers = async () => {
  try {
    const createdUsers: any[] = [];

    // Create users individually to trigger pre-save middleware
    for (const userData of sampleUsers) {
      const user = new User(userData);
      const savedUser = await user.save();
      createdUsers.push(savedUser);
    }

    console.log(`✅ Successfully seeded ${createdUsers.length} users`);

    // Display created users (without passwords)
    createdUsers.forEach((user, index) => {
      console.log(`${index + 1}. ${user.name} (${user.email})`);
    });
  } catch (error) {
    console.error("❌ Failed to seed users:", error);
  }
};

// Check if users exist
const checkUsers = async () => {
  try {
    const userCount = await User.countDocuments();
    console.log(`📊 Current user count: ${userCount}`);

    if (userCount > 0) {
      const users = await User.find({}, { name: 1, email: 1, _id: 0 });
      console.log("👥 Existing users:");
      users.forEach((user, index) => {
        console.log(`${index + 1}. ${user.name} (${user.email})`);
      });
    }
  } catch (error) {
    console.error("❌ Failed to check users:", error);
  }
};

// Main seeding function
const main = async () => {
  const command = process.argv[2] || "seed";

  console.log("🌱 Starting user seeding process...");
  console.log(`📝 Command: ${command}`);

  try {
    await connectDB();

    switch (command) {
      case "seed":
        await clearUsers();
        await seedUsers();
        break;
      case "check":
        await checkUsers();
        break;
      case "clear":
        await clearUsers();
        console.log("🗑️  All users cleared");
        break;
      default:
        console.log(
          "❓ Unknown command. Available commands: seed, check, clear"
        );
        console.log("Usage: yarn seed:users [seed|check|clear]");
        break;
    }

    console.log("🎉 Operation completed successfully!");
  } catch (error) {
    console.error("💥 Operation failed:", error);
  } finally {
    // Close database connection
    await mongoose.connection.close();
    console.log("🔌 Database connection closed");
    process.exit(0);
  }
};

// Run the seeding script
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}
