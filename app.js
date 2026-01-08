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

app.use("/gsons", userRoute);
app.use("/gsons", postRoute);
app.use("/gsons", productRoute);
app.use("/gsons", SavedRoute);
app.use("/gsons", categoryRoute);
app.use("/gsons", contactRoute);


// Middleware for error 

app.use(errorMiddleware);

module.exports = app
