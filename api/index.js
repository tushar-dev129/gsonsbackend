const app = require("../app");
const connectDatabase = require("../config/database");

module.exports = async (req, res) => {
    try {
        await connectDatabase();
        return app(req, res);
    } catch (error) {
        console.error("Vercel Function Error:", error);
        res.status(500).send("Server Error early in request lifecycle");
    }
};
