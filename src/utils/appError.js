class AppError extends Error {
    constructor(message, statusCode) {

        super(message);
        
        this.statusCode = statusCode
        this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error'
        this.isOperational = true

        // So that this call to the class don't appear in stack trace the call of the error constructor
        Error.captureStackTrace(this, this.constructor);
    }
}


module.exports = AppError