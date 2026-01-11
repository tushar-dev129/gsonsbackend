const app = require("../app");
const dotenv = require('dotenv');
const connectDatabase = require("../config/database");

// config 
dotenv.config({ path: 'config/config.env' })

// Connect to database
connectDatabase();

module.exports = app;
