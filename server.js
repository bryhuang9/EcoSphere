const express = require('express');
const expressHandlebars = require('express-handlebars');
const session = require('express-session');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
require('dotenv').config();
const canvas = require('canvas');
const { type } = require('os');
const { google } = require('googleapis');
const { OAuth2Client } = require('google-auth-library');
const getDBConnection = require('./database/database');

//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// Configuration and Setup
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

const app = express();
const PORT = process.env.PORT || 3000;

let db;

/*
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    Handlebars Helpers

    Handlebars helpers are custom functions that can be used within the templates 
    to perform specific tasks. They enhance the functionality of templates and 
    help simplify data manipulation directly within the view files.

    In this project, two helpers are provided:
    
    1. toLowerCase:
       - Converts a given string to lowercase.
       - Usage example: {{toLowerCase 'SAMPLE STRING'}} -> 'sample string'

    2. ifCond:
       - Compares two values for equality and returns a block of content based on 
         the comparison result.
       - Usage example: 
            {{#ifCond value1 value2}}
                <!-- Content if value1 equals value2 -->
            {{else}}
                <!-- Content if value1 does not equal value2 -->
            {{/ifCond}}
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
*/

(async () => {
    db = await getDBConnection();
})();

// Use environment variables for client ID and secret
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const REDIRECT_URI = 'http://localhost:3000/auth/google/callback';
const client = new OAuth2Client(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);

// Set up Handlebars view engine with custom helpers
//
app.engine('handlebars', expressHandlebars.engine({
    helpers: {
        toLowerCase: function (str) {
            return str.toLowerCase();
        },
        ifCond: function (v1, v2, options) {
            if (v1 === v2) {
                return options.fn(this);
            }
            return options.inverse(this);
        },
        indexOf: function(array, value) {
            return array && array.indexOf(value) !== -1;
        },
        eq: function (v1, v2) {
            return v1 === v2;
        }
    },
}));

app.set('view engine', 'handlebars');
app.set('views', './views');

//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// Middleware
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

app.use(
    session({
        secret: 'oneringtorulethemall',     // Secret key to sign the session ID cookie
        resave: false,                      // Don't save session if unmodified
        saveUninitialized: false,           // Don't create session until something stored
        cookie: { secure: false },          // True if using https. Set to false for development without https
    })
);

// Replace any of these variables below with constants for your application. These variables
// should be used in your template files. 
// 
app.use((req, res, next) => {
    res.locals.appName = 'EcoSphere';
    res.locals.copyrightYear = 2024;
    res.locals.postNeoType = 'Post';
    res.locals.loggedIn = req.session.loggedIn || false;
    res.locals.userId = req.session.userId || '';
    if (!req.session.likedPosts) {
        req.session.likedPosts = [];
    }
    next();
});

app.use(express.static('public'));                  // Serve static files
app.use(express.urlencoded({ extended: true }));    // Parse URL-encoded bodies (as sent by HTML forms)
app.use(express.json());                            // Parse JSON bodies (as sent by API clients)

//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// Routes
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

// Home route: render home view with posts and user
// We pass the posts and user variables into the home
// template
//

// Configure passport
passport.use(new GoogleStrategy({
    clientID: CLIENT_ID,
    clientSecret: CLIENT_SECRET,
    callbackURL: `http://localhost:${PORT}/auth/google/callback`
}, async (token, tokenSecret, profile, done) => {
    let user = await findUserByGoogleId(profile.id);
    if (!user) {
        user = await addUser(profile.displayName, profile.id);
    }
    return done(null, user);
}));

passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
    const user = await findUserById(id);  // Changed to deserialize by user ID
    done(null, user);
});

// Initialize passport and session
app.use(passport.initialize());
app.use(passport.session());

app.get('/', async (req, res) => {
    const sortBy = req.query.sort || 'recency';
    let posts;
    if (sortBy === 'likes') {
        posts = await getPostsSortedByLikes();
    } else {
        posts = await getPostsSortedByRecency();
    }
    const user = await getCurrentUser(req) || {};
    res.render('home', { posts, user, sort: sortBy });
});

// Register GET route is used for error response from registration
//
app.get('/register', (req, res) => {
    res.render('loginRegister', { regError: req.query.error });
});

// Login route GET route is used for error response from login
//
app.get('/login', (req, res) => {
    res.render('loginRegister', { loginError: req.query.error });
});

// Error route: render error page
//
app.get('/error', (req, res) => {
    res.render('error');
});

// Additional routes that you must implement

// Google OAuth routes
app.get('/auth/google', (req, res) => {
    const url = client.generateAuthUrl({
        access_type: 'offline',
        scope: ['https://www.googleapis.com/auth/userinfo.email', 'https://www.googleapis.com/auth/userinfo.profile'],
    });
    res.redirect(url);
});

app.get('/auth/google/callback', async (req, res) => {
    const { code } = req.query;
    const { tokens } = await client.getToken(code);
    client.setCredentials(tokens);

    const oauth2 = google.oauth2({
        auth: client,
        version: 'v2',
    });

    const userinfo = await oauth2.userinfo.get();
    const googleId = userinfo.data.id;

    let user = await findUserByGoogleId(googleId);
    if (!user) {
        req.session.tempGoogleId = googleId;
        req.session.tempName = userinfo.data.name;
        return res.redirect('/registerUsername');
    }

    req.session.userId = user.id;
    req.session.loggedIn = true;
    res.redirect('/');
});

app.get('/registerUsername', (req, res) => {
    if (!req.session.tempGoogleId) {
        return res.redirect('/login');
    }
    res.render('registerUsername', { error: req.query.error });
});

app.post('/registerUsername', async (req, res) => {
    const { username } = req.body;
    const tempGoogleId = req.session.tempGoogleId;
    const tempName = req.session.tempName;

    if (!tempGoogleId || !username) {
        return res.redirect('/registerUsername?error=Invalid+data');
    }

    const existingUser = await findUserByUsername(username);
    if (existingUser) {
        return res.redirect('/registerUsername?error=Username+already+exists');
    }

    const newUser = await addUser(tempName, tempGoogleId, username);
    req.session.userId = newUser.id;
    req.session.loggedIn = true;

    delete req.session.tempGoogleId;
    delete req.session.tempName;

    res.redirect('/');
});

app.post('/posts', async (req, res) => {
    // TODO: Add a new post and redirect to home
    const user = await getCurrentUser(req);
    if (user) {
        await addPost(req.body.title, req.body.content, user);
        res.redirect('/');
    } else {
        res.status(403).send('Forbidden');
    }
});

app.post('/like/:id', isAuthenticated, async (req, res) => {
    await updatePostLikes(req, res);
});

app.get('/profile', isAuthenticated, async (req, res) => {
    // TODO: Render profile page
    await renderProfile(req, res);
});

app.get('/avatar/:username', async (req, res) => {
    // TODO: Serve the avatar image for the user
    await handleAvatar(req, res);
});

app.post('/register', async (req, res) => {
    // TODO: Register a new user
    await registerUser(req, res);
});

app.post('/login', async (req, res) => {
    // TODO: Login a user
    await loginUser(req, res);
});

app.get('/logout', isAuthenticated, async (req, res) => {
    // TODO: Logout a user
    await logoutUser(req, res);
});

app.post('/delete/:id', isAuthenticated, async (req, res) => {
    // TODO: Delete a post if the current user is the owner
    const postId = parseInt(req.params.id, 10);
    const user = await getCurrentUser(req);
    const post = await db.get('SELECT * FROM posts WHERE id = ?', postId);

    if (post && post.username === user.username) {
        await db.run('DELETE FROM posts WHERE id = ?', postId);
        res.status(200).send('Post deleted successfully');
    } else {
        res.status(403).send('Forbidden: You do not have permission to delete this post');
    }
});

// Delete account route
app.delete('/delete-account', isAuthenticated, async (req, res) => {
    const userId = req.session.userId;

    try {
        // Find the username before deleting the user
        const user = await findUserById(userId);

        if (user) {
            const username = user.username;

            // Delete the user's posts from the database
            await db.run('DELETE FROM posts WHERE username = ?', username);

            // Delete the user from the database
            await db.run('DELETE FROM users WHERE id = ?', userId);

            // Destroy the session
            req.session.destroy(err => {
                if (err) {
                    return res.status(500).send('Failed to delete account');
                }
                res.clearCookie('connect.sid');
                res.status(200).send('Account deleted successfully');
            });
        } else {
            res.status(404).send('User not found');
        }
    } catch (error) {
        console.error('Error deleting account:', error);
        res.status(500).send('Failed to delete account');
    }
});

app.get('/search', async (req, res) => {
    const searchQuery = req.query.q; // 'q' corresponds to the name of the input field in your form

    // Handle the case where the search query is empty
    if (!searchQuery) {
        return res.render('searchResults', { posts: [], message: 'No keywords provided' });
    }

    try {
        // Use the updated searchPosts function to search both content and username
        const results = await searchPosts(searchQuery);
        res.render('searchResults', { posts: results });
    } catch (error) {
        res.status(500).render('error', { error: 'Failed to process search query' });
    }
});
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// Server Activation
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// Support Functions and Variables
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

let users = [];
let posts = [];

// Function to get posts sorted by recency
async function getPostsSortedByRecency() {
    return await db.all('SELECT * FROM posts ORDER BY timestamp DESC');
}

// Function to get posts sorted by number of likes
async function getPostsSortedByLikes() {
    return await db.all('SELECT * FROM posts ORDER BY likes DESC');
}

// Function to find a user by username
async function findUserByGoogleId(googleId) {
    return await db.get('SELECT * FROM users WHERE hashedGoogleId = ?', googleId);
}

async function findUserByUsername(username) {
    // TODO: Return user object if found, otherwise return undefined
    return await db.get('SELECT * FROM users WHERE username = ?', username);
}

// Function to find a user by user ID
async function findUserById(userId) {
    // TODO: Return user object if found, otherwise return undefined
    return await db.get('SELECT * FROM users WHERE id = ?', userId);
}

// Function to add a new user
async function addUser(name, googleId, username) {
    // TODO: Create a new user object and add to users array
    await db.run(
        'INSERT INTO users (username, hashedGoogleId, avatar_url, memberSince) VALUES (?, ?, ?, ?)',
        [username, googleId, '', new Date().toISOString()]
    );
    return await findUserByGoogleId(googleId); // Retrieve the newly added user
}

// Middleware to check if user is authenticated
async function isAuthenticated(req, res, next) {
    if (req.session && req.session.userId) {
        next();
    } else {
        res.redirect('/login');
    }
}

// Function to register a user
async function registerUser(req, res) {
    // TODO: Register a new user and redirect appropriately
    const username = req.body.username;

    if (await findUserByUsername(username)) {
        res.redirect('/register?error=Username+already+exists');
    } else {
        const newUser = await addUser(username);
        req.session.userId = newUser.id;
        req.session.loggedIn = true;
        res.redirect('/');
    }
}

// Function to login a user
async function loginUser(req, res) {
    // TODO: Login a user and redirect appropriately
    const username = req.body.username;
    const user = await findUserByUsername(username);

    if (!user) {
        res.redirect('/login?error=Username+does+not+exist');
    } else {
        req.session.userId = user.id;
        req.session.loggedIn = true;
        res.redirect('/');
    }
}

// Function to logout a user
async function logoutUser(req, res) {
    // TODO: Destroy session and redirect appropriately
    req.session.destroy(err => {
        if (err) {
            return res.redirect('/');
        }
        res.clearCookie('connect.sid');
        res.redirect('/');
    });
}

// Function to render the profile page
async function renderProfile(req, res) {
    // TODO: Fetch user posts and render the profile page
    const user = await getCurrentUser(req);

    if (!user) {
        res.redirect('/login');
        return;
    }

    const userPosts = await db.all('SELECT * FROM posts WHERE username = ?', user.username);
    res.render('profile', { user, posts: userPosts });
}

// Function to update post likes
async function updatePostLikes(req, res) {
    // TODO: Increment post likes if conditions are met
    const postId = parseInt(req.params.id, 10);
    const user = await getCurrentUser(req);

    if (!user) {
        return res.status(403).send('Forbidden');
    }

    const post = await db.get('SELECT * FROM posts WHERE id = ?', postId);

    if (!post) {
        return res.status(404).send('Post not found');
    }

    const likedPosts = req.session.likedPosts || [];
    let likes;

    if (likedPosts.includes(postId)) {
        likes = post.likes - 1;
        req.session.likedPosts = likedPosts.filter(id => id !== postId);
    } else {
        likes = post.likes + 1;
        req.session.likedPosts.push(postId);
    }

    await db.run('UPDATE posts SET likes = ? WHERE id = ?', [likes, postId]);
    res.json({ likes });
}

// Function to handle avatar generation and serving
async function handleAvatar(req, res) {
    // TODO: Generate and serve the user's avatar image
    const username = req.params.username;
    const user = await findUserByUsername(username);

    if (user) {
        const avatarBuffer = generateAvatar(username.charAt(0).toUpperCase());
        res.setHeader('Content-Type', 'image/png');
        res.send(avatarBuffer);
    } else {
        res.status(404).send('User not found');
    }
}

// Function to get the current user from session
async function getCurrentUser(req) {
    // TODO: Return the user object if the session user ID matches
    if (req.session && req.session.userId) {
        const user = await findUserById(req.session.userId);
        if (user) {
            user.likedPosts = req.session.likedPosts || [];
            return user;
        }
    }

    return null;
}

// Function to get all posts, sorted by latest first
async function getPosts() {
    return await db.all('SELECT * FROM posts ORDER BY timestamp DESC');
}

// Function to add a new post
async function addPost(title, content, user, imagePath = null) {
    await db.run(
        'INSERT INTO posts (title, content, username, timestamp, likes, imagePath) VALUES (?, ?, ?, ?, ?, ?)',
        [title, content, user.username, new Date().toISOString(), 0, imagePath]
    );
}

async function searchPosts(query) {
    const db = await getDBConnection(); 
    const sql = "SELECT * FROM posts WHERE content LIKE ? OR username LIKE ?";
    return db.all(sql, [`%${query}%`, `%${query}%`]); 
}

// Function to generate an image avatar
function generateAvatar(letter, width = 100, height = 100) {
    // TODO: Generate an avatar image with a letter
    // Steps:
    // 1. Choose a color scheme based on the letter
    // 2. Create a canvas with the specified width and height
    // 3. Draw the background color
    // 4. Draw the letter in the center
    // 5. Return the avatar as a PNG buffer

    const Canvas = canvas.Canvas;
    const canvasInstance = new Canvas(width, height);
    const ctx = canvasInstance.getContext('2d');

    // Choose background color
    ctx.fillStyle = '#3498db';
    ctx.fillRect(0, 0, width, height);

    // Draw the letter in the center
    ctx.font = `${width / 2}px Arial`;
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(letter, width / 2, height / 2);

    // Return the avatar as a PNG buffer
    return canvasInstance.toBuffer();
}
