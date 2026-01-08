const ErrorHandler = require('../utils/errorHandler');



module.exports = (err, req, res, next) => {
    err.statusCode = err.statusCode || 500

    err.message = err.message || "Inrernal Server Error"

    // wrong monogdb Cast Error 

    if (err.name === "CastError") {
        const message = `Resource not found Invalid: ${err.path}`
        err = new ErrorHandler(message, 400)
    }


    // duplicate key error 

    if (err.code === 11000) {
        const message = `Duplicate ${Object.keys(err.keyValue)} Entered`
        err = new ErrorHandler(message, 400)
    }

    // Wron jwt error
    if (err.name === "jsonWebTokenError") {
        const message = `Json Web Token is invalid , try again `
        err = new ErrorHandler(message, 401)
    }
    // jwt expire error
    if (err.name === "TokenExpiredError") {
        const message = `Json Web Token is Expired , try again `
        err = new ErrorHandler(message, 401)
    }


    res.status(err.statusCode).json({
        success: false,
        message: err.message
    })


}