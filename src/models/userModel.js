const mongoose = require('mongoose')
const validator = require('validator')
const bcrypt = require('bcryptjs')
const crypto = require('crypto')

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Please provide your name']
    },

    email: {
        type: String,
        unique: true,
        required: [true, 'Please provide your email'],
        validate: [validator.isEmail, 'Please provide a valid email'],
        lowercase: true

    },

    password: {
        type: String,
        required: [true, 'Please provide your password'],
        minlength: [8, 'Password should be at least 8 characters long'],
        // To execlude the password when getting from DB
        select: false
    },

    passwordConfirm: {
        type: String,
        required: [true, 'Please confirm your password'],
        
        // this keword works only with normal fun not arrow function

        // The validator here will work only when using create or save like: User.create(),...
        // So it doesn't work with update so we want to take care!

        validate: {
            validator: function(value) {
                return value === this.password;
            },

            message: "Passwords are not the same"
        }
    },

    role: {
        type: String,
        enum: ['user', 'admin'],
        default: 'user'
    },

    changedPassword: {
        type: Date
    },

    passwordResetToken: String,
    passwordResetExpires: Date,

    active: {
        type: Boolean,
        default: true,
        select: false
    }
})

userSchema.pre("save", async function(next) {
    if (!this.isModified('password')) return next();

    this.password = await bcrypt.hash(this.password, 12);

    this.passwordConfirm = undefined;

    next()
})

userSchema.pre("save", function(next) {
    if (!this.isModified('password') || this.isNew)  return next();

    // The changedPassword field may take time to saves so it 
    // may appears to be longer than the issued token so we gurantee
    this.changedPassword = Date.now() - 1000

    next()
}) 


userSchema.pre(/^find/, function(next){
    this.find({ active: true })
    next()
})
// This adds the method to all documents of User collection
userSchema.methods.correctPassword = async (candidatePassword, password) => {
    return await bcrypt.compare(candidatePassword, password)
}

userSchema.methods.changedPasswordAfter = function(jwtIssuedAt){
    if(this.changedPassword) {
        jwtIssuedAtDate = new Date(jwtIssuedAt * 1000) 
        return this.changedPassword > jwtIssuedAtDate
    }

    return false
}

userSchema.methods.createPasswordResetToken = function() {
    const resetToken = crypto.randomBytes(32).toString('hex')
    const encrptedToken =  crypto.createHash('sha256').update(resetToken).digest('hex')
    this.passwordResetExpires = Date.now() + 10 * 60 * 1000
    this.passwordResetToken = encrptedToken
    
    return resetToken
}

const User = mongoose.model('User', userSchema)

module.exports = User;