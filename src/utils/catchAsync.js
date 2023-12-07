module.exports = (fn) => {
    // The error gets caught when an error is thrown from the function 
    // not when using return next()
    // So this is for errors that happen when using async fuc like find, which is thrown to here
    // not called in the case of using return next(new Error)
    return (req, res, next) => {
        fn(req, res, next).catch(next)
    }
}

