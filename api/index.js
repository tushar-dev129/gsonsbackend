const app = require("../app");
const dotenv = require('dotenv');
const connectDatabase = require("../config/database");

const path = require('path');

// config 
dotenv.config({ path: path.join(__dirname, '../.env') });

// Connect to database
connectDatabase();

module.exports = app;
