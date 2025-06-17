# Blogs API

## Project Overview

This is a RESTful API for a blogging platform. It allows users to register, log in, create, manage, and view blog posts. The API is designed with authentication (JWT), data validation, and a structured architecture using the Model-View-Controller (MVC) pattern with a Service Layer.

## Features Implemented

### User Management:
* User registration (signup) with `first_name`, `last_name`, `email`, `password`.
* User sign-in (login) using `email` and `password`.
* JWT authentication strategy with token expiration (1 hour).

### Blog Management:
* Blogs can be in two states: `draft` and `published`.
* **Logged-in users can create a blog.** Blogs are initially created in `draft` state.
* **All users (logged-in and not) can list all published blogs:**
    * Paginated (default 20 blogs per page).
    * Searchable by `author`, `title`, and `tags`.
    * Orderable by `read_count`, `reading_time`, and `timestamp`.
* **All users (logged-in and not) can view a single published blog:**
    * Returns the full blog content including author details.
    * Updates the `read_count` of the blog by 1 upon viewing.
* **Blog owner can update their blog:**
    * Can edit blogs in both `draft` or `published` states.
    * Can update the `state` of the blog (e.g., from `draft` to `published`).
* **Blog owner can delete their blog:**
    * Can delete blogs in both `draft` or `published` states.
* **Blog owner can list their own blogs:**
    * Endpoint is paginated.
    * Filterable by `state` (`draft` or `published`).
* Automatic calculation of `reading_time` for each blog.

## Technologies Used

* **Node.js:** JavaScript runtime environment.
* **Express.js:** Web application framework.
* **MongoDB:** NoSQL database.
* **Mongoose:** ODM (Object Data Modeling) library for MongoDB.
* **JSON Web Tokens (JWT):** For authentication.
* **Bcrypt.js:** For password hashing.
* **Joi:** For request payload validation.
* **Dotenv:** For managing environment variables.
* **Jest & Supertest:** For automated API testing (if implemented).

## Architectural Pattern

The API follows the **Model-View-Controller (MVC)** pattern, enhanced with a **Service Layer** for robust business logic management.

* **Models (`/models`):** Define data schemas and interact with MongoDB.
* **Services (`/services`):** Contain core business logic and orchestrate database operations.
* **Controllers (`/controllers`):** Handle HTTP requests, call Service functions, and send responses.
* **Views:** Handled by the client-side application that consumes the API.

## Setup Instructions (Local Development)

### Prerequisites

* Node.js (v18.x or higher recommended)
* npm (Node Package Manager)
* MongoDB (Community Edition installed locally, or a MongoDB Atlas cluster)
* Git

### Installation

1.  **Clone the repository:**
    ```bash
    git clone [YOUR_GITHUB_REPO_URL]
    cd blogs-api
    ```
2.  **Install dependencies:**
    ```bash
    npm install
    ```

### Environment Variables (`.env` file)

Create a `.env` file in the root directory of your project (same level as `package.json`). Fill it with your configuration:



PORT=3001
MONGODB_URI=[YOUR_LOCAL_MONGODB_CONNECTION_STRING_HERE] # e.g., mongodb://localhost:27017/blogdb
JWT_SECRET=[YOUR_JWT_SECRET_KEY_HERE] # Use a strong, random string



### Running the Application

To start the API in development mode (with `nodemon` for auto-restarts):

```bash
npm run dev 
```


API Endpoints (API Contract)
The base URL for local development is http://localhost:3001/api/v1.
1. User Authentication
a. Register User (POST)
URL: /users/signup
Description: Registers a new user and returns a JWT token.
Authentication: None required.
Request Body (JSON):
JSON
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john.doe@example.com",
  "password": "StrongPassword123!"
}


Success Response (201 Created):
JSON
{
  "status": "success",
  "message": "User created successfully",
  "data": { "user": { "_id": "...", "email": "...", "firstName": "..." }, "token": "..." }
}


Error Responses: 409 Conflict (Email registered), 400 Bad Request (Validation failed).

b. Login User (POST)
URL: /users/login
Description: Authenticates a user and returns a JWT token.
Authentication: None required.
Request Body (JSON):
JSON
{
  "email": "john.doe@example.com",
  "password": "StrongPassword123!"
}


Success Response (200 OK):
JSON
{
  "status": "success",
  "message": "User logged in successfully",
  "data": { "user": { "_id": "...", "email": "...", "firstName": "..." }, "token": "..." }
}

Error Response: 401 Unauthorized (Invalid credentials).

2. Blog Management
Authentication for Protected Endpoints:
For endpoints requiring authentication, include the JWT token in the Authorization header: Authorization: Bearer <YOUR_JWT_TOKEN>

a. Create Blog (POST)
URL: /blogs
Description: Creates a new blog (defaults to draft).
Authentication: Required.
Request Body (JSON):
JSON
{
  "title": "My New Awesome Blog",
  "description": "A brief overview...",
  "tags": ["nodejs", "api"],
  "body": "This is the full content..."
}


Success Response (201 Created):
JSON
{
  "status": "success",
  "message": "Blog created successfully",
  "data": { "_id": "...", "title": "...", "state": "draft", "author": "..." }
}


Error Responses: 409 Conflict (Duplicate title), 400 Bad Request (Validation), 401 Unauthorized.

b. List All Published Blogs (GET)
URL: /blogs
Description: Retrieves a paginated list of all published blog posts. Returns summary data.
Authentication: None required.
Query Parameters: page (optional), limit (optional), search (title/tags), author (name/email), sortBy (read_count, reading_time, timestamp), order (asc/desc).
Example Request: /blogs?page=1&limit=5&search=api&author=John&sortBy=read_count&order=desc
Success Response (200 OK):
JSON
{
  "status": "success",
  "message": "Published blogs retrieved successfully",
  "data": [ { "_id": "...", "title": "...", "description": "...", "author": { "_id": "...", "firstName": "..." }, "state": "published" } ],
  "meta": { "totalBlogs": 50, "currentPage": 1, "totalPages": 3, "limit": 20 }
}


c. View Single Published Blog (GET)
URL: /blogs/:id
Description: Retrieves full details of a single published blog; increments read_count.
Authentication: None required.
URL Parameters: id (Blog's _id)
Example Request: /blogs/60d0fe4f5d3d4b0015f8a7c3
Success Response (200 OK):
JSON
{
  "status": "success",
  "message": "Blog retrieved successfully",
  "data": { "_id": "...", "title": "...", "author": { "_id": "...", "firstName": "..." }, "state": "published", "read_count": 16, "body": "Full content..." }
}


Error Response: 404 Not Found (Blog not found or not published).




d. Update Blog (PUT)
URL: /blogs/:id
Description: Allows the owner to update a blog's content or state (draft to published).
Authentication: Required (Owner of the blog).
URL Parameters: id (Blog's _id)
Request Body (JSON): (Include only fields to update)
JSON
{ "title": "Updated Blog Title", "state": "published", "body": "New content." }


Success Response (200 OK):
JSON
{ "status": "success", "message": "Blog updated successfully", "data": { /* Updated blog object */ } }


Error Responses: 400 Bad Request (Validation), 401 Unauthorized, 403 Forbidden (Not owner), 404 Not Found.


e. Delete Blog (DELETE)
URL: /blogs/:id
Description: Allows the owner to delete their blog.
Authentication: Required (Owner of the blog).
URL Parameters: id (Blog's _id)
Success Response (200 OK):
JSON
{ "status": "success", "message": "Blog deleted successfully", "data": { /* The deleted blog object */ } }


Error Responses: 401 Unauthorized, 403 Forbidden (Not owner), 404 Not Found.


f. Get Owner's Blogs (GET)
URL: /blogs/my-blogs
Description: Retrieves a paginated list of blogs owned by the authenticated user.
Authentication: Required (Logged-in owner).
Query Parameters: page, limit, state (draft or published).
Example Request: /blogs/my-blogs?page=1&state=draft
Success Response (200 OK):
JSON
{
  "status": "success",
  "message": "Owner's blogs retrieved successfully",
  "data": [ { "_id": "...", "title": "...", "author": { "firstName": "..." }, "state": "draft" } ],
  "meta": { "totalBlogs": 2, "currentPage": 1, "totalPages": 1, "limit": 20 }
}


Error Response: 401 Unauthorized.
Deployment
The API is deployed on Render and can be accessed at:
Base URL: https://blogs-api-service.onrender.com/api/v1


Author
Awotunde Omotoyosi
