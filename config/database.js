const mongoose = require("mongoose");

const connectDatabase = () => {
  if (mongoose.connection.readyState >= 1) {
    return;
  }

  mongoose
    .connect(process.env.DB_URL)
    .then((data) => {
      console.log(`Mongodb connected with server: ${data.connection.host}`);
    })
    .catch((err) => {
      console.log(`Database connection error: ${err.message}`);
    });
};

module.exports = connectDatabase;