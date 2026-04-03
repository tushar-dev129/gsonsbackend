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
const variantRoute = require('./routes/variantRoutes')
const dashboardRoute = require('./routes/dashboardRoutes')
const galleryRoute = require('./routes/galleryRoutes')



const corsOptions = {
    origin: [process.env.FRONTEND_URL, "https://gsonsindia.com", "https://www.gsonsindia.com", "http://localhost:3000"].filter(Boolean),
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept"],
};

app.use(cors(corsOptions));
app.use(express.json())
app.use(cookieParser())
app.options('*', cors(corsOptions));

app.get("/", (req, res) => {
    res.send("Server is working");
});

const apiPrefixes = ["/api/gsons", "/gsons"];

app.use(apiPrefixes, userRoute);
app.use(apiPrefixes, postRoute);
app.use(apiPrefixes, productRoute);
app.use(apiPrefixes, SavedRoute);
app.use(apiPrefixes, categoryRoute);
app.use(apiPrefixes, contactRoute);
app.use(apiPrefixes, variantRoute);
app.use(apiPrefixes, dashboardRoute);
app.use(apiPrefixes, galleryRoute);



// Middleware for error 

app.use(errorMiddleware);

module.exports = app
