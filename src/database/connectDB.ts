import mongoose from "mongoose";

const connectDB = async (connection_uri) => {
  console.log("Connecting to MongoDB...");

  mongoose.set("strictQuery", true);
  return mongoose.connect(connection_uri);
};

export default connectDB;
