const app = require('./main');
const database = require('./config/database');
const dotenv = require('dotenv');

// Load environment variables based on NODE_ENV
// If NODE_ENV is 'test', it will load .env.test. Otherwise, it loads .env.
if (process.env.NODE_ENV === 'test') {
  dotenv.config({ path: '.env.test' });
  console.log('Loading .env.test for test environment'); // Optional log for clarity
} else {
  dotenv.config(); // Loads .env by default for development/production
  console.log('Loading .env for development/production'); // Optional log for clarity
}

// Connect to the database using the MONGODB_URI from the loaded .env file
database.connectDB();

// Determine the port from environment variables, defaulting to 8000
const port = parseInt(process.env.PORT, 10) || 8000; // Changed default from 800 to 8000

// Start the server and capture the server instance
const server = app.listen(port, () => {
    console.log(`Server started on port ${port}`);
});

// IMPORTANT: Export the server instance for testing purposes
// Supertest needs this to simulate HTTP requests without a live network call
module.exports = server;