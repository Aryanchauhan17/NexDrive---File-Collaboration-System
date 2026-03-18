# NexDrive — File Collaboration System

A production-grade REST API for a cloud file collaboration platform, similar to Google Drive. Built with Node.js, Express, MongoDB, Redis, and Socket.io.

## 🛠️ Tech Stack

| Technology | Purpose |
|------------|---------|
| Node.js + Express.js | REST API server |
| MongoDB + Mongoose | Database |
| Redis (Upstash) | Caching + Presence tracking |
| Cloudinary | File storage |
| Socket.io | Real-time presence |
| JWT + bcrypt | Authentication |
| Winston + Morgan | Logging |
| Multer | File upload handling |

## ✨ Features

### 🔐 Authentication
- Register / Login / Logout
- JWT access tokens + refresh tokens
- Passwords hashed with bcrypt
- HTTP-only cookies for refresh tokens

### 📁 File Management
- Upload files to Cloudinary
- Rename, delete (soft delete), restore files
- Star / unstar files
- Move files into folders
- Storage quota per user (5GB)
- Trash / restore system

### 📂 Folder Management
- Create nested folders
- Rename, delete, restore folders
- Star / unstar folders
- Nested folder navigation with parent-child relationships
- Cascade delete — deleting folder deletes all contents

### 🤝 Sharing & Permissions
- Share files and folders with any user by email
- 3 permission roles — Owner / Editor / Viewer
- Cascade sharing — sharing a folder shares all files inside
- Update or revoke existing permissions
- Cannot share with yourself
- RBAC middleware enforces permissions on every route

### 💾 Storage
- Per user storage quota tracking
- Storage updates on upload and delete
- Storage usage API endpoint

### 🔴 Real-time (Socket.io)
- Live online presence tracking
- User joins personal room on login
- File viewing rooms — see who is viewing same file
- Notification system — send real-time alerts to specific users


## 📡 API Endpoints

### Auth
```
POST   /api/auth/register     Register new user
POST   /api/auth/login        Login user
POST   /api/auth/logout       Logout user
```

### Files
```
GET    /api/files             Get all files (with permissions)
POST   /api/files/upload      Upload a file
GET    /api/files/trash       Get trashed files
GET    /api/files/:id         Get single file
PUT    /api/files/:id         Rename / move file
DELETE /api/files/:id         Soft delete file
PUT    /api/files/:id/star    Star / unstar file
PUT    /api/files/:id/restore Restore from trash
```

### Folders
```
GET    /api/folders              Get all folders
POST   /api/folders              Create folder
GET    /api/folders/trash        Get trashed folders
GET    /api/folders/:id          Get folder contents
PUT    /api/folders/:id          Rename folder
DELETE /api/folders/:id          Soft delete folder
PUT    /api/folders/:id/star     Star / unstar folder
PUT    /api/folders/:id/restore  Restore from trash
```

### Sharing
```
POST   /api/share              Share file or folder with user
PUT    /api/share/:id          Change role
DELETE /api/share/:id          Revoke access
GET    /api/share/:resourceId  Get all permissions for resource
POST   /api/share/link         Generate public share link
GET    /api/share/link/:token  Access via public link
```

### User
```
GET    /api/user/storage    Get storage usage
GET    /api/user/starred    Get starred files and folders
```

## 🏗️ Project Structure
```
backend/
├── app.js
└── src/
    ├── config/
    │   ├── db.js           MongoDB connection
    │   ├── redis.js        Redis connection
    │   ├── cloudinary.js   Cloudinary connection
    │   └── env.js          Environment variables
    ├── controllers/
    │   ├── auth.controller.js
    │   ├── file.controller.js
    │   ├── folder.controller.js
    │   ├── share.controller.js
    │   └── user.controller.js
    ├── middleware/
    │   ├── auth.middleware.js    JWT verification
    │   ├── rbac.middleware.js    Role-based access control
    │   ├── upload.middleware.js  Multer file upload
    │   └── errorHandler.js      Global error handler
    ├── models/
    │   ├── user.model.js
    │   ├── file.model.js
    │   ├── folder.model.js
    │   ├── permission.model.js
    │   ├── shareLink.model.js
    │   ├── fileVersion.model.js
    │   └── refreshToken.model.js
    ├── routes/
    │   ├── auth.routes.js
    │   ├── file.routes.js
    │   ├── folder.routes.js
    │   ├── share.routes.js
    │   └── user.routes.js
    ├── socket/
    │   ├── presence.socket.js      Online presence
    │   └── notification.socket.js  Real-time notifications
    └── utils/
        ├── jwt.js          Token generation
        ├── logger.js       Winston logger
        └── createError.js  Error helper
```

## ⚙️ Setup & Installation

### Prerequisites
- Node.js v18+
- MongoDB Atlas account
- Cloudinary account
- Upstash Redis account

### Installation
```bash
# Clone the repository
git clone https://github.com/Aryanchauhan17/NexDrive---File-Collaboration-System.git

# Navigate to backend
cd NexDrive---File-Collaboration-System

# Install dependencies
npm install

# Create .env file
cp .env.example .env
# Fill in your environment variables

# Start development server
npm run dev
```

### Environment Variables
```
PORT=5000
NODE_ENV=development
MONGODB_URI=your_mongodb_uri
JWT_SECRET=your_jwt_secret
JWT_REFRESH_SECRET=your_refresh_secret
REDIS_URL=your_redis_url
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
CLIENT_URL=http://localhost:5173
```

## 🔒 Security Features
- JWT authentication with refresh token rotation
- Passwords hashed with bcrypt (10 salt rounds)
- RBAC middleware on every protected route
- Helmet.js for HTTP security headers
- CORS configured for specific origins
- Environment variables for all secrets

## 📝 Key Design Decisions

**Soft Delete** — Files and folders are never permanently deleted immediately. They move to trash first, allowing restore. This prevents accidental data loss.

**Permission Cascading** — When a folder is shared, all files and subfolders inside are automatically shared with the same role. This mirrors how Google Drive works.

**Redis Caching** — File and folder lists are cached in Redis to reduce MongoDB queries. Cache is invalidated on any write operation.

**Role-Based Access Control** — Every API route is protected by `checkPermission` middleware that verifies the user has the required role before allowing the operation.

