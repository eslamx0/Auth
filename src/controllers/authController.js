const {promisify} = require('util')
const jwt = require('jsonwebtoken')
const User = require('../models/userModel')
const catchAsync = require('../utils/catchAsync')
const AppError = require('../utils/appError')
const sendEmail = require('../utils/email')
const crypto = require('crypto')


const createSendToken = (user, statusCode, res) => {
    const token = signToken(user._id)

    res.status(statusCode).json({
        status: 'success',
        token,
        data: {
            user
        }
    })
}


const signToken = (id) =>{
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRE
    });
}

const verifyJwt = promisify(jwt.verify)

// The user is signed in automatically when signup
exports.signup = catchAsync (async (req, res, next) => {

    // Didn't use req.body directly so that no one can assign themselves as admin manually
    const userData = {

        name: req.body.name,
        email: req.body.email,
        password: req.body.password,
        passwordConfirm: req.body.passwordConfirm,
        role: req.body.role,

    }

    const newUser = await User.create(userData)

    // With expires: even if the signature was verified it won't work
    createSendToken(newUser, 201, res)
})


exports.login = async (req, res, next) => {

    const {email, password} = req.body;

    if(!email || !password){
        return next(new AppError('Please Add Email and password'))
    }

    const user = await User.findOne({ email }).select('+password')

    if(!user || !await user.correctPassword(password, user.password)){
        return next(new AppError('Incorrect email or password'))
    }

    createSendToken(user, 200, res)

}

exports.protect = catchAsync(async (req, res, next) => {

    const token = req.headers.authorization
    let tokenValue;

    if(token && token.startsWith('Bearer')) {
        tokenValue = token.split(' ')[1] 
    }

    if(!tokenValue) {
        return next(new AppError('You are not logged in! Please log in to get access'))
    }

    const decoded = await verifyJwt(tokenValue, process.env.JWT_SECRET)

    const currentUser = await User.findById(decoded.id)

    // Check if user still exists
    if(!currentUser){
        return next(new AppError('User corresponding to this token does not exist'))
    }
    
    if(currentUser.changedPasswordAfter(decoded.iat)) {
        return next( new AppError('User recently changed password, please login again'))
    }

    req.user = currentUser

    next()    
})


exports.restrictTo = (...roles) => {
    return (req, res, next) => {
        CurrentUserRole = req.user.role;

        if(!roles.includes(CurrentUserRole)) {
            return next( new AppError('You do not have permission to perform this action', 403 ))
        }

        next()
    }
}


exports.forgotPassword = catchAsync(async (req, res, next) => {
    const email = req.body.email
    const user = await User.findOne({email})

    if(!user) {
        return next(new AppError('This email does not exist', 404))
    }

    passwordResetToken = user.createPasswordResetToken()
    user.save({validateBeforeSave: false})

    const resetUrl = `${req.protocol}://${req.get('host')}/api/v1/users/resetPassword/${passwordResetToken}`

    const message = `Forgot your password? Please make a patch request to this url: ${resetUrl},
    If you didn't forget it, ignore this message`

    const options = {
        emailTo: user.email,
        subject:'Your password reset token (valid for 10m)',
        text: message
    }

    try {

        await sendEmail(options)

        res.status(200).json({
            status: 'success',
            message: 'Reset token sent to your email'
    
        })
    
        
    } catch (error) {
        user.passwordResetToken = undefined
        user.passwordResetExpires = undefined
        user.save({validateBeforeSave: false})

        return next(new AppError('Something went wrong when sending the email! Try again later', 500))
    }

})

exports.resetPassword = catchAsync(async (req, res, next) => {
    // Encrypt the token
    const hashedToken =  crypto.createHash('sha256').update(req.params.token).digest('hex')
    // Get the user and check if it doesn't exist raise an error
    const user = await User.findOne({passwordResetToken: hashedToken, passwordResetExpires: {$gt: Date.now()}})

    if(!user) {
        return next(new AppError('Token is invalid or expired', 400))
    }

    // If it exists, Get the user then save the password and passwordConfirm

    user.password = req.body.password
    user.passwordConfirm = req.body.passwordConfirm
    user.passwordResetToken = undefined
    user.passwordResetExpires = undefined

    await user.save();

    createSendToken(newUser, 200, res)

})

exports.updatePassword = catchAsync(async (req, res, next) => {

    if(req.user.id === req.user._id) console.log("congratulation")
    const user = await User.findById(req.user._id).select('+password')
    const {oldPassword, newPassword, newPasswordConfirm} = req.body

    // console.log({oldpassword, newPassword, newPasswordConfirm})

    if(!(await user.correctPassword(oldPassword, user.password))) {
        return next(new AppError('Invalid Password', 401))
    }

    user.password = newPassword
    user.passwordConfirm = newPasswordConfirm


    // we don't use for example findByIdAndUpdate because some validators won't work
    // with update as this in validators won't work because in this case the current object
    // isn't saved in memory by mongoose and pre save won't work
    await user.save()

    createSendToken(user, 200, res)


})                    