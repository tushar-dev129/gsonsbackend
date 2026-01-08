const app = require("../app");
const connectDatabase = require("../config/database");

// Connect to database
connectDatabase();

module.exports = app;
