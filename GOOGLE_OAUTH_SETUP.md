# Google OAuth 2.0 Setup Guide

## Complete implementation of Google OAuth authentication for Stock Analysis Platform

---

## Table of Contents
1. [Google Cloud Console Setup](#google-cloud-console-setup)
2. [Backend Configuration](#backend-configuration)
3. [Frontend Implementation](#frontend-implementation)
4. [Testing](#testing)
5. [Production Deployment](#production-deployment)
6. [Troubleshooting](#troubleshooting)

---

## Google Cloud Console Setup

### Step 1: Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click **"Select a project"** → **"New Project"**
3. Enter project name: `Stock Analysis Platform`
4. Click **"Create"**
5. Wait for project creation (takes ~30 seconds)

### Step 2: Enable Google+ API

1. In the Google Cloud Console, select your project
2. Go to **"APIs & Services"** → **"Library"**
3. Search for **"Google+ API"**
4. Click on it and press **"Enable"**
5. Also enable **"Google OAuth2 API"** (if available)

### Step 3: Configure OAuth Consent Screen

1. Go to **"APIs & Services"** → **"OAuth consent screen"**
2. Select **"External"** (for testing with any Google account)
3. Click **"Create"**

**App Information:**
- App name: `Stock Analysis Platform`
- User support email: `your-email@gmail.com`
- App logo: (optional, upload your logo)

**App Domain:**
- Application home page: `http://localhost:5173` (for development)
- Privacy policy: (optional for testing)
- Terms of service: (optional for testing)

**Developer Contact:**
- Email: `your-email@gmail.com`

4. Click **"Save and Continue"**

**Scopes:**
5. Click **"Add or Remove Scopes"**
6. Select these scopes:
   - `openid`
   - `email`
   - `profile`
7. Click **"Update"** → **"Save and Continue"**

**Test Users (for External app):**
8. Click **"Add Users"**
9. Add your Gmail addresses for testing
10. Click **"Save and Continue"**
11. Review and click **"Back to Dashboard"**

### Step 4: Create OAuth 2.0 Credentials

1. Go to **"APIs & Services"** → **"Credentials"**
2. Click **"Create Credentials"** → **"OAuth client ID"**
3. Application type: **"Web application"**
4. Name: `Stock Analysis Web Client`

**Authorized JavaScript origins:**
```
http://localhost:5173
http://localhost:8000
```

**Authorized redirect URIs:**
```
http://localhost:8000/auth/google/callback
```

5. Click **"Create"**
6. **IMPORTANT:** Copy your credentials:
   - **Client ID**: `xxxxx.apps.googleusercontent.com`
   - **Client Secret**: `xxxxx`
7. Click **"OK"**

---

## Backend Configuration

### Step 1: Install Dependencies

```bash
cd backend
pip install httpx==0.26.0
```

Or install all dependencies:
```bash
pip install -r requirements.txt
```

### Step 2: Create .env File

Create `backend/.env` file (copy from `.env.example`):

```env
MONGODB_URL=mongodb://localhost:27017
DATABASE_NAME=stock_analysis
JWT_SECRET_KEY=your-super-secret-key-change-this-in-production
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440

# Google OAuth 2.0 Configuration
GOOGLE_CLIENT_ID=YOUR_CLIENT_ID.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=YOUR_CLIENT_SECRET
GOOGLE_REDIRECT_URI=http://localhost:8000/auth/google/callback
FRONTEND_URL=http://localhost:5173
```

**Replace:**
- `YOUR_CLIENT_ID` with your actual Google Client ID
- `YOUR_CLIENT_SECRET` with your actual Google Client Secret

### Step 3: Verify Backend Code

The following endpoints are already implemented:

**1. Initiate OAuth Flow:**
```python
GET /auth/google/login
Returns: { "auth_url": "https://accounts.google.com/..." }
```

**2. Handle OAuth Callback:**
```python
GET /auth/google/callback?code=xxx
- Exchanges code for access token
- Gets user info from Google
- Creates/updates user in database
- Sets HTTP-only cookie
- Redirects to frontend
```

**3. Session Validation:**
```python
GET /auth/me
Returns: { "email": "...", "name": "...", "authenticated": true }
```

---

## Frontend Implementation

### Step 1: Verify API Configuration

File: `frontend/src/services/api.js`

```javascript
export const auth = {
  googleLogin: () => api.get('/auth/google/login'),
  // ... other methods
}
```

### Step 2: Verify Login Component

File: `frontend/src/pages/Login.jsx`

The Google OAuth button is already implemented:

```javascript
const handleGoogleAuth = async () => {
  try {
    const response = await auth.googleLogin()
    const authUrl = response.data.auth_url
    window.location.href = authUrl // Redirect to Google
  } catch (error) {
    setError('Failed to initiate Google login. Please try again.')
  }
}
```

### Step 3: Verify App.jsx

File: `frontend/src/App.jsx`

OAuth success/error handling is already implemented:

```javascript
useEffect(() => {
  const urlParams = new URLSearchParams(window.location.search)
  const authStatus = urlParams.get('auth')
  const authError = urlParams.get('error')
  
  if (authStatus === 'success') {
    // OAuth successful, validate session
  } else if (authError) {
    // OAuth failed, show error
  }
}, [])
```

---

## Testing

### Step 1: Start Backend

```bash
cd backend
python -m uvicorn main:app --reload
```

Backend should be running on: `http://localhost:8000`

### Step 2: Start Frontend

```bash
cd frontend
npm run dev
```

Frontend should be running on: `http://localhost:5173`

### Step 3: Test Google OAuth Flow

1. Open browser: `http://localhost:5173/login`
2. Click **"Continue with Google"** button
3. You should be redirected to Google login page
4. Select your Google account (must be added as test user)
5. Grant permissions (email, profile)
6. You should be redirected back to: `http://localhost:5173/?auth=success`
7. You should be logged in and see the dashboard

### Step 4: Test Session Persistence

1. After logging in with Google, refresh the page
2. You should stay logged in (no redirect to login page)
3. Open a new tab: `http://localhost:5173`
4. You should be logged in automatically

### Step 5: Test Logout

1. Click **"Logout"** button
2. You should be redirected to login page
3. Refresh the page
4. You should stay on login page (session cleared)

---

## Production Deployment

### Step 1: Update Google Cloud Console

1. Go to **"APIs & Services"** → **"Credentials"**
2. Click on your OAuth 2.0 Client ID
3. Add production URLs:

**Authorized JavaScript origins:**
```
https://yourdomain.com
https://api.yourdomain.com
```

**Authorized redirect URIs:**
```
https://api.yourdomain.com/auth/google/callback
```

4. Click **"Save"**

### Step 2: Update Backend .env

```env
# Production Settings
GOOGLE_CLIENT_ID=YOUR_CLIENT_ID.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=YOUR_CLIENT_SECRET
GOOGLE_REDIRECT_URI=https://api.yourdomain.com/auth/google/callback
FRONTEND_URL=https://yourdomain.com

# Enable secure cookies
# In main.py, set: secure=True
```

### Step 3: Update Backend Code

File: `backend/main.py`

Change cookie settings for production:

```python
response.set_cookie(
    key="access_token",
    value=jwt_token,
    httponly=True,
    max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    samesite="lax",
    secure=True,  # ← Change to True for HTTPS
    domain=".yourdomain.com"  # ← Add domain for subdomain support
)
```

### Step 4: Update Frontend API URL

File: `frontend/src/services/api.js`

```javascript
const API_URL = process.env.VITE_API_URL || 'https://api.yourdomain.com'
```

### Step 5: Publish OAuth App

1. Go to **"OAuth consent screen"**
2. Click **"Publish App"**
3. Submit for verification (if needed)
4. Wait for Google approval (can take 1-7 days)

**Note:** Until published, only test users can login.

---

## Security Features

### 1. HTTP-Only Cookies
- Tokens stored in HTTP-only cookies
- Cannot be accessed by JavaScript
- Prevents XSS attacks

### 2. CSRF Protection
- SameSite=Lax cookie flag
- Prevents cross-site request forgery

### 3. Secure Token Exchange
- Authorization code flow (not implicit)
- Client secret never exposed to frontend
- Tokens exchanged server-side

### 4. Session Validation
- Every request validates JWT token
- Expired tokens automatically rejected
- User must re-authenticate

### 5. HTTPS in Production
- Secure flag on cookies
- All traffic encrypted
- Man-in-the-middle protection

---

## OAuth Flow Diagram

```
┌─────────┐                ┌──────────┐                ┌────────┐
│ Browser │                │ Backend  │                │ Google │
└────┬────┘                └────┬─────┘                └───┬────┘
     │                          │                          │
     │ 1. Click "Google Login"  │                          │
     ├─────────────────────────>│                          │
     │                          │                          │
     │ 2. Get OAuth URL         │                          │
     │<─────────────────────────┤                          │
     │                          │                          │
     │ 3. Redirect to Google    │                          │
     ├──────────────────────────┼─────────────────────────>│
     │                          │                          │
     │ 4. User logs in & grants │                          │
     │    permissions           │                          │
     │                          │                          │
     │ 5. Redirect with code    │                          │
     │<─────────────────────────┼──────────────────────────┤
     │                          │                          │
     │ 6. Send code to backend  │                          │
     ├─────────────────────────>│                          │
     │                          │                          │
     │                          │ 7. Exchange code for     │
     │                          │    access token          │
     │                          ├─────────────────────────>│
     │                          │                          │
     │                          │ 8. Return access token   │
     │                          │<─────────────────────────┤
     │                          │                          │
     │                          │ 9. Get user info         │
     │                          ├─────────────────────────>│
     │                          │                          │
     │                          │ 10. Return user data     │
     │                          │<─────────────────────────┤
     │                          │                          │
     │                          │ 11. Create/update user   │
     │                          │     in database          │
     │                          │                          │
     │ 12. Set cookie & redirect│                          │
     │<─────────────────────────┤                          │
     │                          │                          │
     │ 13. Logged in!           │                          │
     │                          │                          │
```

---

## Troubleshooting

### Issue: "redirect_uri_mismatch" Error

**Cause:** Redirect URI in Google Console doesn't match backend URI

**Solution:**
1. Check `backend/.env`: `GOOGLE_REDIRECT_URI`
2. Check Google Console: Authorized redirect URIs
3. They must match EXACTLY (including http/https, port, path)

### Issue: "invalid_client" Error

**Cause:** Client ID or Client Secret is incorrect

**Solution:**
1. Verify `GOOGLE_CLIENT_ID` in `.env`
2. Verify `GOOGLE_CLIENT_SECRET` in `.env`
3. Copy from Google Console credentials page

### Issue: "access_denied" Error

**Cause:** User denied permissions or not a test user

**Solution:**
1. Add user as test user in OAuth consent screen
2. User must grant all requested permissions
3. Check if app is published (for non-test users)

### Issue: Cookie Not Being Set

**Cause:** CORS or SameSite issues

**Solution:**
1. Verify `withCredentials: true` in axios config
2. Check CORS settings in backend allow credentials
3. Ensure frontend and backend on same domain (or proper CORS setup)

### Issue: Session Not Persisting

**Cause:** Cookie expiration or not being sent

**Solution:**
1. Check cookie in browser DevTools → Application → Cookies
2. Verify `max_age` is set correctly
3. Check `httponly` and `samesite` flags

### Issue: "User Not Found" After OAuth

**Cause:** Database connection issue

**Solution:**
1. Verify MongoDB is running
2. Check database connection in backend logs
3. Verify user was created in `users` collection

---

## API Endpoints Reference

### 1. Get Google OAuth URL
```http
GET /auth/google/login
```

**Response:**
```json
{
  "auth_url": "https://accounts.google.com/o/oauth2/v2/auth?client_id=..."
}
```

### 2. OAuth Callback (handled by Google)
```http
GET /auth/google/callback?code=xxx
```

**Response:** Redirect to frontend with cookie set

### 3. Validate Session
```http
GET /auth/me
Cookie: access_token=xxx
```

**Response:**
```json
{
  "email": "user@gmail.com",
  "name": "John Doe",
  "authenticated": true
}
```

### 4. Logout
```http
POST /auth/logout
Cookie: access_token=xxx
```

**Response:**
```json
{
  "message": "Logged out successfully"
}
```

---

## Database Schema

### Users Collection

```javascript
{
  "_id": ObjectId("..."),
  "email": "user@gmail.com",
  "name": "John Doe",
  "google_id": "1234567890",  // Google user ID
  "hashed_password": "",       // Empty for OAuth users
  "created_at": ISODate("..."),
  "updated_at": ISODate("...")
}
```

**Note:** OAuth users have empty `hashed_password` field.

---

## Environment Variables Reference

### Backend (.env)

```env
# Required
GOOGLE_CLIENT_ID=xxxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=xxxxx
GOOGLE_REDIRECT_URI=http://localhost:8000/auth/google/callback
FRONTEND_URL=http://localhost:5173

# Optional (with defaults)
MONGODB_URL=mongodb://localhost:27017
DATABASE_NAME=stock_analysis
JWT_SECRET_KEY=your-secret-key
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440
```

### Frontend (.env)

```env
VITE_API_URL=http://localhost:8000
```

---

## Testing Checklist

- [ ] Google Cloud project created
- [ ] OAuth consent screen configured
- [ ] OAuth credentials created
- [ ] Test users added
- [ ] Backend .env configured
- [ ] httpx installed
- [ ] Backend running on port 8000
- [ ] Frontend running on port 5173
- [ ] Click "Continue with Google" works
- [ ] Redirected to Google login
- [ ] Can select Google account
- [ ] Redirected back to app
- [ ] Logged in successfully
- [ ] Session persists on refresh
- [ ] Logout works
- [ ] Can login again

---

## Production Checklist

- [ ] Production URLs added to Google Console
- [ ] OAuth app published
- [ ] Backend .env updated with production URLs
- [ ] Cookie secure flag set to True
- [ ] HTTPS enabled
- [ ] Domain configured
- [ ] CORS configured for production
- [ ] Environment variables set on server
- [ ] Database connection secured
- [ ] Logs configured
- [ ] Error monitoring setup

---

## Support

### Google OAuth Documentation
- [OAuth 2.0 Overview](https://developers.google.com/identity/protocols/oauth2)
- [Web Server Applications](https://developers.google.com/identity/protocols/oauth2/web-server)
- [OAuth 2.0 Scopes](https://developers.google.com/identity/protocols/oauth2/scopes)

### FastAPI Documentation
- [Security](https://fastapi.tiangolo.com/tutorial/security/)
- [OAuth2](https://fastapi.tiangolo.com/tutorial/security/oauth2-jwt/)

### React Documentation
- [React Router](https://reactrouter.com/)
- [Axios](https://axios-http.com/)

---

## Conclusion

You now have a fully functional Google OAuth 2.0 authentication system with:

✅ Secure authorization code flow
✅ HTTP-only cookie sessions
✅ Session persistence across reloads
✅ Proper error handling
✅ Production-ready configuration
✅ Professional user experience

Users can now login with their Google accounts seamlessly!
