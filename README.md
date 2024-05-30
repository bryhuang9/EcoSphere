# MicroBlog

STILL WORK IN PROGRESS

MicroBlog is a simple blogging platform that allows users to register, log in, create posts, like other users' posts, and delete their own posts. The application uses Google OAuth for user authentication and an SQL database for data storage. It also supports sorting posts by likes or recency and integrates dynamic avatar generation and emoji support.

## Features

- **User Registration via Google OAuth**: Sign up for an account using Google OAuth and register a local username.
- **User Login via Google OAuth**: Log in using a Google account.
- **User Logout**: Log out of the account.
- **Session Management**: Keeps users logged in across different pages.
- **Post Creation**: Create new posts with a title and content.
- **Like Posts**: Like posts created by other users.
- **Delete Posts**: Delete own posts.
- **View Profile**: Display the user's profile information and their posts.
- **Dynamic Avatar Generation**: Generate avatars based on the first letter of the username.
- **Emoji Integration**: Fetch and display emojis for use in posts.
- **OAuth Authentication**: Use Google OAuth for user authentication.
- **SQL Database Integration**: Store user and post data in an SQL database.
- **Sorting Blog Posts**: Sort blog posts by the number of likes or recency.

## Features Under Development

- **User Profile Editing**: Update username and other profile information.
- **Data Deletion and Account Management**: Delete individual posts or the entire account.
- **User Notifications**: Receive notifications for new posts, likes, comments, or messages.
- **Enhanced Security Measures**: Implement security features such as rate limiting, input validation, and protection against common web vulnerabilities.
- **Administrative Interface**: Provide an admin panel for managing users and content.
- **Commenting System**: Comment on posts.

## Technologies Used

- **Backend**: Node.js, Express.js
- **Frontend**: HTML, CSS, Handlebars.js
- **Database**: SQLite
- **Authentication**: Google OAuth 2.0
- **Other Libraries**: Canvas (for dynamic avatar generation)

## Getting Started

### Prerequisites

- Node.js and npm installed
- Google OAuth credentials (Client ID and Client Secret)
- SQLite installed

### Installation

1. Clone the repository:
    ```bash
    git clone https://github.com/yourusername/microblog.git
    cd microblog
    ```

2. Install the dependencies:
    ```bash
    npm install
    ```

3. Set up environment variables:

    Create a `.env` file in the root directory and add your Google OAuth credentials:
    ```
    CLIENT_ID=your-google-client-id
    CLIENT_SECRET=your-google-client-secret
    ```

4. Initialize the database:
    ```bash
    node database/populatedb.js
    ```

5. Start the server:
    ```bash
    npm start
    ```

6. Open your browser and navigate to `http://localhost:3000`.

## Usage

- **Register**: Click "Login with Google" to sign up using your Google account. Register a local username after authentication.
- **Login**: Click "Login with Google" to log in using your Google account.
- **Create Post**: Use the post creation form on the homepage to create a new post.
- **Like Post**: Click the like button on a post to like it.
- **Delete Post**: Click the delete button on your own post to delete it.
- **View Profile**: Click on your profile to view your profile information and posts.
- **Sort Posts**: Use the dropdown menu to sort posts by likes or recency.

## Contributing

Contributions are welcome! Please fork the repository and submit a pull request with your changes.

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/YourFeature`)
3. Commit your Changes (`git commit -m 'Add some YourFeature'`)
4. Push to the Branch (`git push origin feature/YourFeature`)
5. Open a Pull Request

## License

Distributed under the MIT License. See `LICENSE` for more information.

## Contact

Your Name - [your.email@example.com](mailto:your.email@example.com)

Project Link: [https://github.com/yourusername/microblog](https://github.com/yourusername/microblog)
