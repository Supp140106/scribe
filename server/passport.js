


require("dotenv").config();
const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const User = require("./models/User");

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      // IMPORTANT: this must match the Redirect URI configured in Google Cloud Console
      callbackURL: `${process.env.SERVER_URL}/auth/google/callback`,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const googleId = profile.id;
        const name = profile.displayName;
        const email = profile.emails?.[0]?.value;
        const picture = profile.photos?.[0]?.value;

        let user = await User.findOne({ googleId });
        if (!user) {
          user = await User.create({
            googleId,
            name,
            email,
            picture,
            gameHistory: [], // initialize empty game history
          });
        } else {
          // Keep profile data fresh (optional)
          const updates = {};
          if (user.name !== name) updates.name = name;
          if (user.email !== email) updates.email = email;
          if (user.picture !== picture) updates.picture = picture;
          if (Object.keys(updates).length) {
            await User.updateOne({ _id: user._id }, { $set: updates });
            user = await User.findById(user._id);
          }
        }

        return done(null, user);
      } catch (err) {
        return done(err, null);
      }
    }
  )
);

passport.serializeUser((user, done) => {
  done(null, user._id.toString());
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (e) {
    done(e, null);
  }
});

module.exports = passport;
