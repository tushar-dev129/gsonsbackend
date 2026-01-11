const express = require('express');
const cookieParser = require('cookie-parser');
const errorMiddleware = require('./middleware/error')
const cors = require('cors');
const app = express();

// route imports 

const userRoute = require("./routes/userRoutes")
const postRoute = require("./routes/postRoutes")
const productRoute = require('./routes/productRoutes')
const SavedRoute = require('./routes/savedRoutes')
const categoryRoute = require('./routes/categoryRoutes')
const contactRoute = require('./routes/contactRoutes')


app.use(cors({
    origin: ["https://gsonsindia.com", "http://localhost:3000", "https://gsonsbackend.vercel.app"],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
}));
app.use(express.json())
app.use(cookieParser())
app.options('*', cors());

app.use("/api/gsons", userRoute);
app.use("/api/gsons", postRoute);
app.use("/api/gsons", productRoute);
app.use("/api/gsons", SavedRoute);
app.use("/api/gsons", categoryRoute);
app.use("/api/gsons", contactRoute);


// Middleware for error 

app.use(errorMiddleware);

module.exports = app
