const express = require('express');
const cookieParser = require('cookie-parser');
const errorMiddleware = require('./middleware/error')
const cors = require('cors');
const app = express();

// route imports 

const userRoute = require("./routes/userRoutes")


app.use(cors({
    origin: process.env.FRONTEND_URL || "http://gsonsindia.com",
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE"],
}));
app.use(express.json())
app.use(cookieParser())

app.use("/gsons", userRoute);


// Middleware for error 

app.use(errorMiddleware);

module.exports = app