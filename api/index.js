const app = require("../app");
const dotenv = require('dotenv');
const connectDatabase = require("../config/database");

const path = require('path');

// config 
dotenv.config({ path: path.join(__dirname, '../.env') });

// Serverless handler - ensure DB is connected before handling requests
module.exports = async (req, res) => {
    await connectDatabase();
    return app(req, res);
};
