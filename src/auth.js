const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const DiscordStrategy = require('passport-discord').Strategy;
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const Database = require('./database');

const db = new Database();

// Serialize user to session
passport.serializeUser((user, done) => {
    done(null, user.id);
});

// Deserialize user from session
passport.deserializeUser((id, done) => {
    db.getUser(id, (err, user) => {
        done(err, user);
    });
});

// Local Strategy (Email/Password)
passport.use(new LocalStrategy({
    usernameField: 'email',
}, (email, password, done) => {
    db.getUserByEmail(email, (err, user) => {
        if (err) return done(err);
        if (!user) return done(null, false, { message: 'Incorrect email.' });

        if (!user.password_hash) {
            return done(null, false, { message: 'Please login with Google or Discord.' });
        }

        bcrypt.compare(password, user.password_hash, (err, res) => {
            if (res) return done(null, user);
            return done(null, false, { message: 'Incorrect password.' });
        });
    });
}));

// Google Strategy
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    passport.use(new GoogleStrategy({
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: '/auth/google/callback'
    }, (accessToken, refreshToken, profile, done) => {
        db.getUserByProvider('google', profile.id, (err, user) => {
            if (err) return done(err);
            if (user) return done(null, user);

            // Create new user
            const newUser = {
                id: nanoid(),
                email: profile.emails[0].value,
                passwordHash: null,
                googleId: profile.id,
                discordId: null,
                name: profile.displayName,
                role: 'guest', // User sets role later
                profileId: null,
            };

            db.createUser(newUser, (err) => {
                if (err) return done(err);
                done(null, newUser);
            });
        });
    }));
}

// Discord Strategy
if (process.env.DISCORD_CLIENT_ID && process.env.DISCORD_CLIENT_SECRET) {
    passport.use(new DiscordStrategy({
        clientID: process.env.DISCORD_CLIENT_ID,
        clientSecret: process.env.DISCORD_CLIENT_SECRET,
        callbackURL: '/auth/discord/callback',
        scope: ['identify', 'email']
    }, (accessToken, refreshToken, profile, done) => {
        db.getUserByProvider('discord', profile.id, (err, user) => {
            if (err) return done(err);
            if (user) return done(null, user);

            // Create new user
            const newUser = {
                id: nanoid(),
                email: profile.email,
                passwordHash: null,
                googleId: null,
                discordId: profile.id,
                name: profile.username,
                role: 'guest',
                profileId: null,
            };

            db.createUser(newUser, (err) => {
                if (err) return done(err);
                done(null, newUser);
            });
        });
    }));
}


module.exports = passport;
