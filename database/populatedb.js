const sqlite = require('sqlite');
const sqlite3 = require('sqlite3');

// Placeholder for the database file name
const dbFileName = 'microblog.db';

async function initializeDB() {
    const db = await sqlite.open({ filename: dbFileName, driver: sqlite3.Database });

    await db.exec(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL UNIQUE,
            hashedGoogleId TEXT NOT NULL UNIQUE,
            avatar_url TEXT,
            memberSince DATETIME NOT NULL
        );

        CREATE TABLE IF NOT EXISTS posts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            content TEXT NOT NULL,
            username TEXT NOT NULL,
            timestamp DATETIME NOT NULL,
            likes INTEGER NOT NULL
        );
    `);

    // Sample data - Replace these arrays with your own data
    const users = [
        { username: 'alice', hashedGoogleId: 'hashedGoogleIdAlice', avatar_url: '', memberSince: '2024-01-01 12:00:00' },
        { username: 'bob', hashedGoogleId: 'hashedGoogleIdBob', avatar_url: '', memberSince: '2024-01-02 12:00:00' },
        { username: 'charlie', hashedGoogleId: 'hashedGoogleIdCharlie', avatar_url: '', memberSince: '2024-01-03 12:00:00' },
        { username: 'dave', hashedGoogleId: 'hashedGoogleIdDave', avatar_url: '', memberSince: '2024-01-04 12:00:00' },
        { username: 'eve', hashedGoogleId: 'hashedGoogleIdEve', avatar_url: '', memberSince: '2024-01-05 12:00:00' }
    ];

    const posts = [
        { title: 'Exploring the Mountains', content: 'Today I went hiking in the mountains and it was breathtaking!', username: 'alice', timestamp: '2024-01-01 13:00:00', likes: 5 },
        { title: 'My First Blog Post', content: 'Hello world! This is my first blog post. Excited to start this journey.', username: 'bob', timestamp: '2024-01-02 14:00:00', likes: 3 },
        { title: 'Tech Trends 2024', content: 'Here are the top tech trends to watch out for in 2024...', username: 'charlie', timestamp: '2024-01-03 15:00:00', likes: 10 },
        { title: 'Delicious Recipes', content: 'Tried out some new recipes today and they turned out amazing!', username: 'dave', timestamp: '2024-01-04 16:00:00', likes: 7 },
        { title: 'Travel Diaries', content: 'Just got back from my trip to Japan. It was an incredible experience!', username: 'eve', timestamp: '2024-01-05 17:00:00', likes: 8 },
        { title: 'Learning JavaScript', content: 'JavaScript is such a versatile language. Here are some tips for beginners...', username: 'alice', timestamp: '2024-01-06 18:00:00', likes: 6 },
        { title: 'Fitness Journey', content: 'Started my fitness journey today. Feeling motivated and excited!', username: 'bob', timestamp: '2024-01-07 19:00:00', likes: 4 },
        { title: 'Gardening Tips', content: 'Here are some gardening tips for beginners. Happy gardening!', username: 'charlie', timestamp: '2024-01-08 20:00:00', likes: 2 },
        { title: 'Book Review: The Great Gatsby', content: 'Just finished reading The Great Gatsby. Here are my thoughts...', username: 'dave', timestamp: '2024-01-09 21:00:00', likes: 9 },
        { title: 'Photography 101', content: 'Getting started with photography can be overwhelming. Here are some tips...', username: 'eve', timestamp: '2024-01-10 22:00:00', likes: 3 }
    ];

    // Insert sample data into the database
    await Promise.all(users.map(user => {
        return db.run(
            'INSERT INTO users (username, hashedGoogleId, avatar_url, memberSince) VALUES (?, ?, ?, ?)',
            [user.username, user.hashedGoogleId, user.avatar_url, user.memberSince]
        );
    }));

    await Promise.all(posts.map(post => {
        return db.run(
            'INSERT INTO posts (title, content, username, timestamp, likes) VALUES (?, ?, ?, ?, ?)',
            [post.title, post.content, post.username, post.timestamp, post.likes]
        );
    }));

    console.log('Database populated with initial data.');
    await db.close();
}

initializeDB().catch(err => {
    console.error('Error initializing database:', err);
});