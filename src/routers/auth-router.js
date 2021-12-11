require("dotenv").config()
const router = require('express').Router()
const passport = require('passport')
const User = require('../models/user')
const Temp = require('../models/temp')
const auth = require('../middleware/auth')
const jwt = require('jsonwebtoken')
const referralCodes = require('referral-codes')
const sgMail = require('@sendgrid/mail')

sgMail.setApiKey(process.env.SENDGRID_API_KEY)

// Username & password signup
router.post('/signup', async (req,res) => {
    try{
        const user = await User.findOne({email:req.body.email})
        if(user){
            res.status(400).json({message: "hlo"})   
        } else{
            const otp = referralCodes.generate({ length: 6, charset: "0123456789" })[0]
            const tempuser = new Temp({...req.body,otp})
            await tempuser.save()
            const token = await tempuser.generateAuthToken()

            const msg = {
                to: tempuser.email,
                from: 'no-reply@happiecelebrations.com',
                subject: 'Happie Celebration | Verification code',
                text: 'Hello from Happie Celebrations',
                html: '<p>Hello from Happie Celebrations</p>',
                templateId: '97d436d1-6dc8-4473-82ac-5ec8ea9d62df',
                substitutionWrappers: ['{{', '}}'],
                substitutions: {
                    otp: tempuser.otp,
                },
            }
            sgMail.send(msg).then(() => {
                console.log('Email sent')
            }).catch((error) => {
                console.error(error)
            })

            res.status(201)
            .cookie('jwt', token, {
                sameSite:'None', 
                path: '/',
                expires: new Date(new Date().getTime() + 24 * 60 * 60 * 1000),
                httpOnly: true,
                secure: true,
            }).send("Signup successfully")
        }
    }catch(e){
        res.status(400).json({message: "You already have an account with this email. Please log in."})
    }
})

// username and password signin
router.post('/signin', async (req,res) => {
    try {
        const user = await User.findByCrediantials(req.body.email,req.body.password)
        if(user){
            const token = await user.generateAuthToken()
            res.status(200)
            .cookie('jwt', token, {
                sameSite:'None', 
                path: '/',
                expires: new Date(new Date().getTime() + 7 * 24 * 60 * 60 * 1000),
                httpOnly: true,
                secure: true,
            }).send("Successfully logged in")
        }
        else {
            const tempuser = await Temp.findByCrediantials(req.body.email,req.body.password)
            const token = await tempuser.generateAuthToken()
            const otp = referralCodes.generate({ length: 6, charset: "0123456789" })[0]
            tempuser.otp = otp
            tempuser.updatedAt = new Date()
            await tempuser.save()

            const msg = {
                to: tempuser.email,
                from: 'no-reply@happiecelebrations.com',
                subject: 'Happie Celebration | Verification code',
                text: 'Hello from Happie Celebrations',
                html: '<p>Hello from Happie Celebrations</p>',
                templateId: '97d436d1-6dc8-4473-82ac-5ec8ea9d62df',
                substitutionWrappers: ['{{', '}}'],
                substitutions: {
                    otp: tempuser.otp,
                },
            }
            sgMail.send(msg).then(() => {
                console.log('Email sent')
            }).catch((error) => {
                console.error(error)
            })

            res.status(200)
            .cookie('jwt', token, {
                sameSite:'None', 
                path: '/',
                expires: new Date(new Date(tempuser.createdAt).getTime() + 24 * 60 * 60 * 1000),
                httpOnly: true,
                secure: true,
            }).send("Successfully logged in")
        }
    } catch (e) {
        res.status(401).json({message: "Email or password is incorrect"})
    }
})

// logout
router.get('/signout',auth, async (req, res) => {
    if(req.cookies.jwt) {
        req.user.tokens = req.user.tokens.filter(token => { return token.token !== req.token })
        await req.user.save()
        req.logOut()
        res.status(202).clearCookie('jwt').send("Logout successfull")
    }
    else{
        res.status(401).json({ error: 'Something went wrong' })
    }
});

// verify otp
router.post('/verifyotp',auth,async(req,res) => {
    try {
        const timeout = Math.abs(new Date() - new Date(req.user.updatedAt))/1000
        if(timeout > 20*60){
            res.status(401).json({message: "Verification Code expired"})
        }
        else if(req.user.otp === req.body.otp){
            const user = new User({email:req.user.email,password:req.user.password,
            username:req.user.username})
            res.clearCookie('jwt')
            
            const token = await user.generateAuthToken()
            res.status(200)
            .cookie('jwt', token, {
                sameSite:'None', 
                path: '/',
                expires: new Date(new Date().getTime() + 7 * 24 * 60 * 60 * 1000),
                httpOnly: true,
                secure: true,
            }).send("Otp verified successfully")
        }
        else{
            res.status(401).json({message: "Verification code mismatched.Please try again"})
        }
    } catch (error) {
        res.status(500).send()
    }
})

// auth with google+
router.get('/google', passport.authenticate('google',{
    scope: [
        'https://www.googleapis.com/auth/userinfo.profile',
        'https://www.googleapis.com/auth/userinfo.email'
    ],session: false
}));

// Callback route for google to redirect
router.get('/google/callback',passport.authenticate('google',{ session: false }),(req,res) => {
    res.cookie('jwt', req.user.token, {
        sameSite:'None', 
        path: '/',
        expires: new Date(new Date().getTime() + 7 * 24 * 60 * 60 * 1000),
        httpOnly: true,
        secure: true,
    })
    res.redirect(process.env.FRONTEND)
})

// auth with fb
router.get('/facebook', passport.authenticate('facebook',{ scope: 'email',session: false }));

// Callback route for fb to redirect
router.get('/facebook/callback',
    passport.authenticate('facebook',{ session: false }),(req,res) => {
        res.cookie('jwt', req.user.token, {
            sameSite:'None', 
            path: '/',
            expires: new Date(new Date().getTime() + 7 * 24 * 60 * 60 * 1000),
            httpOnly: true,
            secure: true,
        })
        res.redirect(process.env.FRONTEND)
});

// auth with amazon
router.get('/amazon',passport.authenticate('amazon',{ scope: ['profile'],session: false }));

// Callback route for amazon to redirect
router.get('/amazon/callback', 
  passport.authenticate('amazon', { session: false }),(req, res) => {
    res.cookie('jwt', req.user.token, {
        sameSite:'None', 
        path: '/',
        expires: new Date(new Date().getTime() + 7 * 24 * 60 * 60 * 1000),
        httpOnly: true,
        secure: true,
    })
    res.redirect(process.env.FRONTEND);
});

// Get user data
router.get('/getuser',async (req,res) => {
    if(req.cookies.jwt){
        const decoded = jwt.verify(req.cookies.jwt,process.env.JWT_SECRET_KEY)
        let user = await User.findOne({ _id: decoded._id, 'tokens.token':req.cookies.jwt})
        if(!user){
            const temp = await Temp.findOne({ _id: decoded._id, 'tokens.token':req.cookies.jwt})
            let email = temp.email
            let username = temp.username
            let unverified = true
            user = {email,username,unverified}
        }
        res.status(200).send(user)
    }
    else{
        res.status(401).json({error: "Please login"})
    }
})

module.exports = router;
