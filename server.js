const app = require('./app');
const dotenv = require('dotenv');
const connectDatabase = require('./config/database')

// Handling uncaught Exception Error 

process.on("uncaughtException", (err) => {
    console.log(`Error: ${err.message}`);

    console.log("Shutting down the server due to uncaught Exception Error ");

    process.exit(1)
})

// config 
dotenv.config({ path: 'config/config.env' })
connectDatabase();
const server = app.listen(process.env.PORT, () => {
    console.log(`server is working on http://localhost:${process.env.PORT}`)
})


// Unhandled Promise Rejection Error 

process.on("unhandledRejection", err => {
    console.log(`Error: ${err.message}`);

    console.log("Shutting down the server due to unhandled Promises  Rejection ");
    server.close(() => {
        process.exit(1)

    })
})