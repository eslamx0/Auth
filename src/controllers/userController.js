const AppError = require('../utils/appError')
const User = require('../models/userModel')
const catchAsync = require('../utils/catchAsync')
const { findByIdAndUpdate } = require('../models/userModel')

const filterObj = (obj, ...allowedFields) => {
    const filteredObj = {}
    Object.keys(obj).forEach( el => {
        if(allowedFields.includes(el)){
            filteredObj[el] = obj[el]
        }
    })

    return filteredObj
}

exports.getAllUsers = catchAsync( async (req, res, next) => {
    const users = await User.find({})
    res.status(200).json({
        status: 'success',
        results: users.length,
        data: {
            users
        }
    })
})

exports.deleteUser = catchAsync (async (req, res, next) => {
    const id = req.params.id
    const user = await User.findByIdAndDelete({_id: id})

    if(!user) return next( new AppError('User does not exist', 404))

    res.status(204).json({
        status: 'success',
        data: null
    })
})

exports.updateMyData = catchAsync(async (req, res, next)=> {
    // if body sent includes password or password confirm send error
    if(req.body.password || req.body.passwordConfirm) {
        return next(new AppError('You can not use this route to update password', 400))   
    }
    // filter the body
    const filteredBody = filterObj(req.body, 'name', 'email')

    const updatedUser = await User.findByIdAndUpdate(req.user.id, filteredBody, {
        new: true,
        runValidators: true
    })

    res.status(200).json({
        status: "success",
        data: {
            user: updatedUser
        }
    })


})

exports.deleteMe = catchAsync(async (req, res, next) => {
    await User.findByIdAndUpdate(req.user.id, {active: false})

    res.status(204).json({
        status: "success",
        data: null
    })
})


