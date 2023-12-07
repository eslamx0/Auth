const AppError = require('../utils/appError')

const handleCastError = (err)=> {
    const message = (`Invalid ${err.path}: ${err.value}.`)
    return new AppError(message, 400)
}

const handleDuplicateFields = (err)=> {
    keys = Object.keys(err.keyValue)
    key = keys[0]
    value = err.keyValue[key]

    const message = (`Duplicate field value: ${value}, please use another value`)
    return new AppError(message, 400)
}

const handleValidationError = (err) => {
    const errors = Object.values(err.errors)
    const errorsMessages = errors.map(err => err.message)

    const message = `Invalid Input Data. ${errorsMessages.join('. ')}`
    return new AppError(message, 400)
}

const handleJWTError = () => new AppError('Invalid Token, please login again', 401)
const handleExpiredToken = () => new AppError('Expired Token, please login again', 401)


const sendDevError = (err, req, res) => {

    res.status(err.statusCode).json({
        status: err.status,
        error: err,
        message: err.message,
        stack: err.stack
    })

}

const sendProdError = (err, req, res) => {
    if(err.isOperational) {


        res.status(err.statusCode).json({
            status: err.status,
            message: err.message
        })

    } else {

        res.status(err.statusCode).json({
            status: err.status,
            message: "OOPS, Something went wrong!"
        })

    }
}

module.exports = (err, req, res, next) => {

    err.statusCode = err.statusCode || 500;
    err.status = err.status || 'error';

    if(process.env.NODE_ENV === 'development') {
        console.error('Error 💥', err)
        sendDevError(err, req, res);
    }

    if(process.env.NODE_ENV === 'production') {
        console.error('Error 💥', err)

        let error = { ...err }
        if(err.name === 'CastError') error = handleCastError(error);
        if(err.name === 'ValidationError') error = handleValidationError(error)
        if(err.code === 11000) error = handleDuplicateFields(error)
        if(err.name === 'JsonWebTokenError') error = handleJWTError()
        if(err.name === 'TokenExpiredError') error = handleExpiredToken()


        sendProdError(err, req, res)

    }


}