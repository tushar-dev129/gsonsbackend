const mongoose = require("mongoose");

let cachedConnection = null;

const connectDatabase = async () => {
  if (mongoose.connection.readyState >= 1) {
    return;
  }

  if (cachedConnection) {
    return cachedConnection;
  }

  try {
    cachedConnection = await mongoose.connect(process.env.DB_URL);
    console.log(`Mongodb connected with server: ${cachedConnection.connection.host}`);
  } catch (err) {
    cachedConnection = null;
    console.log(`Database connection error: ${err.message}`);
    throw err;
  }
};

module.exports = connectDatabase;