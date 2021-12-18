require("dotenv").config(); 
const passport = require('passport');
const User = require('../models/user')
const referralCodes = require('referral-codes')
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const FacebookStrategy = require('passport-facebook').Strategy;
const AmazonStrategy = require('passport-amazon').Strategy;

const saveSocialDetails = async (profile) => {
    let user = await User.findOne({ email: profile.emails[0].value })

        if(!user){
            const password = referralCodes.generate({})[0]

            user = await new User({
                username: profile.displayName,
                email: profile.emails[0].value,
                password,
                social_id: profile.id,
                social_provider: profile.provider
            }).save()
    
            console.log("new user created") 
        }
        else{
            console.log("user exists")

            if(!user.social_id) {
                // Send error   or    save social info in db
            }
    
            if(user.social_provider !== profile.provider ) {
                user.social_id = profile.id
                user.social_provider = profile.provider
                await user.save()
            }
        }

        const token = await user.generateAuthToken()
        const data = {...user._doc,token}
        delete data.password
        delete data.tokens
        delete data.social_id
        delete data.social_provider
        return data
}

passport.use(
    new GoogleStrategy({
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL,
        proxy: true 
    }, async (accessToken,refreshToken,profile,done) => { 
        const data = await saveSocialDetails(profile)
        return done(null,data)
    })
)

passport.use(new FacebookStrategy({
    clientID: process.env.FACEBOOK_APP_ID,
    clientSecret: process.env.FACEBOOK_APP_SECRET,
    callbackURL: process.env.FB_CALLBACK_URL,
    proxy: true 
  },
  async (accessToken, refreshToken, profile, done) => {
        console.log(profile)  
        const data = await saveSocialDetails(profile)
        return done(null,data)
        // console.log(profile.emails[0].value)  
        // console.log(profile.displayName)  
        // console.log(profile.id)  
        // console.log(profile.provider)  
    //     let user = await User.findOne({ email: profile.emails[0].value })

    //     if(!user){
    //         const password = referralCodes.generate({})[0]

    //         user = await new User({
    //             username: profile.displayName,
    //             email: profile.emails[0].value,
    //             password,
    //             social_id: profile.id,
    //             social_provider: profile.provider
    //         }).save()
    
    //         console.log("new user created") 
    //         // return done(null,{...user._doc,token})
    //     }
    //     else{
    //         console.log("user exists")

    //         if(!user.social_id) {
    //             // Send error   or    save social info in db
    //         }
    
    //         if(user.social_provider !== profile.provider ) {
    //             user.social_id = profile.id
    //             user.social_provider = profile.provider
    //             await user.save()
    //         }
    //     }

    //     const token = await user.generateAuthToken()
    //     const data = {...user._doc,token}
    //     console.log(data)
    //     return done(null,data)
    })
);

passport.use(new AmazonStrategy({
    clientID: process.env.AMAZON_CLIENT_ID,
    clientSecret: process.env.AMAZON_CLIENT_SECRET,
    callbackURL: process.env.AMAZON_CALLBACK_URL,
    proxy: true 
  },
  async (accessToken, refreshToken, profile, done) => {
    const data = await saveSocialDetails(profile)
    return done(null,data)
  }
));