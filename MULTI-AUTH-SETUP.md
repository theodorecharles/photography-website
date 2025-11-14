# Multi-Auth System - Setup Complete ✅

## Overview

Your photography website now supports multiple authentication methods:
- **Google OAuth** (existing, still works)
- **Username + Password** (credentials)
- **Two-Factor Authentication (MFA)** via TOTP
- **Passkeys (WebAuthn)** for biometric/hardware key authentication

## Architecture

**We kept your existing Passport.js + Google OAuth setup** and added new authentication methods alongside it. This means:
- ✅ Your existing Google OAuth login works exactly as before
- ✅ New username/password login available at `/api/auth-extended/login`
- ✅ MFA, passkeys, and user management APIs ready to use
- ✅ Single authentication middleware supports both auth methods

## Quick Start

### 1. Your Existing Google OAuth Still Works

Navigate to `http://localhost:3000/login` or `/admin` and sign in with Google - works exactly as before!

### 2. Access the New Login Page

Go to: `http://localhost:3000/login`

You'll see three tabs:
- **Google** - Your existing OAuth
- **Password** - New username/password auth
- **Passkey** - WebAuthn biometric auth

### 3. Create a Test User with Password

Open a Node.js REPL:

```bash
node
```

Then run:

```javascript
import('./backend/src/database-users.js').then(({ createUser }) => {
  const user = createUser({
    email: 'test@example.com',
    username: 'testuser',
    password: 'SecurePassword123!',
    auth_methods: ['credentials'],
    name: 'Test User',
    email_verified: true,
  });
  console.log('✅ User created:', user.email);
  process.exit(0);
});
```

Then test login:
1. Go to `http://localhost:3000/login`
2. Click "Password" tab
3. Enter username: `testuser`
4. Enter password: `SecurePassword123!`
5. Should redirect to admin panel!

## What Was Implemented

### Backend (Complete)

✅ **Database Schema**
- `users` table with support for multiple auth methods
- `auth_sessions` table for session tracking
- `mfa_attempts` table for rate limiting
- Migrated existing authorized emails to users table

✅ **Authentication Methods**
- Google OAuth (Passport.js - existing)
- Username/Password (bcrypt hashing, 12 rounds)
- TOTP-based MFA (Google Authenticator compatible)
- WebAuthn passkeys (biometric/security keys)

✅ **API Endpoints** (`/api/auth-extended/...`)
- `POST /login` - Credential login with optional MFA
- `POST /register` - Register new user
- `POST /change-password` - Change password
- `POST /mfa/setup` - Start MFA setup (get QR code)
- `POST /mfa/verify-setup` - Complete MFA setup
- `POST /mfa/disable` - Disable MFA
- `POST /mfa/backup-codes` - Generate new backup codes
- `POST /passkey/register-options` - Start passkey registration
- `POST /passkey/register-verify` - Complete passkey registration
- `POST /passkey/auth-options` - Get passkey auth options
- `POST /passkey/auth-verify` - Verify passkey authentication
- `GET /passkey/list` - List user's passkeys
- `DELETE /passkey/:id` - Remove passkey
- `GET /user/methods` - Get enabled auth methods

✅ **Security Features**
- Bcrypt password hashing (12 rounds)
- TOTP-based MFA with backup codes
- WebAuthn/FIDO2 standard passkeys
- Rate limiting on MFA attempts (5 attempts / 15 min)
- Session management for both auth types

### Frontend (Complete)

✅ **Login Page** (`/login`)
- Multi-tab interface (Google / Password / Passkey)
- Google OAuth button
- Username/password form
- MFA token verification UI
- Passkey authentication support
- Responsive design
- Error handling

## Testing Instructions

### Test 1: Google OAuth (Existing)

```bash
# Navigate to login page
http://localhost:3000/login

# Click "Google" tab
# Sign in with your authorized Google account
# Should redirect to /admin
```

✅ **Expected**: Works exactly as before

### Test 2: Username/Password Login

```bash
# 1. Create test user (see Quick Start #3 above)

# 2. Go to login page
http://localhost:3000/login

# 3. Click "Password" tab
# Enter credentials and sign in
```

✅ **Expected**: Redirects to /admin, authenticated successfully

### Test 3: MFA Setup

```javascript
// 1. Login as a user
// 2. Call MFA setup endpoint via browser console or API client

fetch('http://localhost:3001/api/auth-extended/mfa/setup', {
  method: 'POST',
  credentials: 'include',
  headers: { 'Content-Type': 'application/json' }
})
.then(r => r.json())
.then(data => {
  console.log('🔑 Setup token:', data.setupToken);
  console.log('💾 Backup codes:', data.backupCodes);
  console.log('📱 QR code:', data.qrCode);
  
  // Open QR code in new tab
  window.open(data.qrCode);
  
  // After scanning with Google Authenticator:
  const token = prompt('Enter 6-digit code from authenticator app:');
  
  return fetch('http://localhost:3001/api/auth-extended/mfa/verify-setup', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      setupToken: data.setupToken,
      token: token,
      backupCodes: data.backupCodes
    })
  });
})
.then(r => r.json())
.then(data => console.log('✅ MFA enabled:', data));
```

✅ **Expected**: MFA enabled, next login requires token

### Test 4: Login with MFA

After enabling MFA:
1. Go to `/login`
2. Click "Password" tab
3. Enter username + password
4. UI shows MFA token input
5. Enter 6-digit code from Google Authenticator
6. Successfully logs in

✅ **Expected**: Two-step authentication works

### Test 5: Passkeys (Requires HTTPS)

**Note**: Passkeys only work on HTTPS (except localhost)

**For Production** (with HTTPS):

Set environment variables:
```bash
export RP_ID=tedcharles.net
export RP_NAME="Photography Portfolio"
export ORIGIN=https://www.tedcharles.net
```

Then:
1. Navigate to `/login`
2. Click "Passkey" tab
3. (Optional) Enter email
4. Click "Sign in with Passkey"
5. Follow browser biometric prompts

✅ **Expected**: Authenticates using Face ID / Touch ID / Windows Hello

## Configuration

### No Config Changes Needed!

The system uses your existing configuration:
- `config.auth.sessionSecret` - Already configured
- `config.auth.google.*` - Already configured  
- `config.auth.authorizedEmails` - Migrated to users table

### Optional: Passkey Environment Variables

For production passkey support, set these:

```bash
# In your server environment
export RP_ID=yourdomain.com
export RP_NAME="Your Site Name"  
export ORIGIN=https://www.yourdomain.com
```

Or in your Node.js startup:

```javascript
process.env.RP_ID = 'yourdomain.com';
process.env.RP_NAME = 'Your Site Name';
process.env.ORIGIN = 'https://www.yourdomain.com';
```

## Security Features

### Password Security
- **Hashing**: bcrypt with 12 rounds (industry standard)
- **Validation**: Minimum 8 characters (can be customized)
- **Storage**: Never stored in plain text

### MFA Security
- **Standard**: TOTP (RFC 6238) - compatible with Google Authenticator, Authy, 1Password, etc.
- **Backup Codes**: 10 one-time-use codes (bcrypt hashed)
- **Rate Limiting**: 5 failed attempts per 15 minutes
- **Time Window**: 2-step tolerance (60 seconds)

### Passkey Security  
- **Standard**: WebAuthn/FIDO2 (W3C standard)
- **Storage**: Private keys never leave device
- **Verification**: Cryptographic challenge-response
- **Counter**: Replay attack prevention

### Session Security
- **Storage**: Express session with existing sessionSecret
- **Expiry**: 24 hours (configurable in server.ts)
- **Cookies**: httpOnly, secure (production), SameSite
- **Scope**: Shared across both auth methods

## API Endpoints

### Public Endpoints

#### POST `/api/auth-extended/login`
Login with username/password (with optional MFA)

**Request**:
```json
{
  "username": "user@example.com",
  "password": "SecurePassword123!",
  "mfaToken": "123456"  // Optional, required if MFA enabled
}
```

**Response** (Success):
```json
{
  "success": true,
  "user": {
    "id": 1,
    "email": "user@example.com",
    "name": "User Name"
  }
}
```

**Response** (MFA Required):
```json
{
  "requiresMFA": true,
  "sessionId": "uuid",
  "message": "MFA verification required"
}
```

#### POST `/api/auth-extended/register`
Register new user with username/password

**Request**:
```json
{
  "email": "user@example.com",
  "username": "username",
  "password": "SecurePassword123!",
  "name": "User Name"
}
```

### Authenticated Endpoints

All require valid session (either Google OAuth or credentials).

#### POST `/api/auth-extended/change-password`
Change user password

#### POST `/api/auth-extended/mfa/setup`
Start MFA setup, get QR code

**Response**:
```json
{
  "setupToken": "random-token",
  "qrCode": "data:image/png;base64,...",
  "secret": "BASE32SECRET",
  "backupCodes": ["XXXX-XXXX", "YYYY-YYYY", ...]
}
```

#### POST `/api/auth-extended/mfa/verify-setup`
Complete MFA setup by verifying first token

#### GET `/api/auth-extended/user/methods`
Get user's enabled auth methods

**Response**:
```json
{
  "authMethods": ["google", "credentials"],
  "mfaEnabled": false,
  "passkeyCount": 0,
  "hasPassword": true,
  "hasGoogleLinked": true
}
```

See `backend/src/routes/auth-extended.ts` for full API documentation.

## Files Created/Modified

### New Files

**Backend**:
- `backend/src/auth/middleware.ts` - Auth middleware
- `backend/src/auth/mfa.ts` - MFA/TOTP helpers
- `backend/src/auth/passkeys.ts` - WebAuthn helpers  
- `backend/src/database-users.ts` - User database functions
- `backend/src/routes/auth-extended.ts` - New auth API routes
- `migrate-add-users-auth.js` - Database migration

**Frontend**:
- `frontend/src/components/Login/Login.tsx` - Multi-auth login page
- `frontend/src/components/Login/Login.css` - Login styles
- `frontend/src/components/Login/index.ts` - Barrel export

### Modified Files

**Backend**:
- `backend/src/server.ts` - Added Passport initialization, auth-extended routes
- `backend/src/routes/external-links.ts` - Updated auth import
- `backend/src/routes/branding.ts` - Updated auth import
- `backend/src/routes/metrics.ts` - Updated auth import

**Frontend**:
- `frontend/src/App.tsx` - Added /login route

## Recommended Next Steps

### 1. Create Security Settings UI (Recommended)

Add a new admin panel section where users can:
- View enabled auth methods
- Enable/disable MFA (with QR code display)
- View/regenerate backup codes
- Register/list/remove passkeys
- Change password
- Link Google account to existing account

**Suggested location**: `frontend/src/components/AdminPortal/SecuritySettings.tsx`

### 2. User Management UI (Optional)

If you want multiple admins:
- List all users
- Create/disable users
- Reset passwords
- Manage permissions

### 3. Account Linking (Optional)

Allow users to link multiple auth methods:
- Add password to Google-only account
- Link Google to username/password account
- Add MFA to any account
- Register multiple passkeys

### 4. Session Management UI (Optional)

- View active sessions (IP, device, last active)
- Revoke specific sessions
- "Sign out all devices" button

## Troubleshooting

### Issue: Login page doesn't load

**Check**:
```bash
# Frontend running?
pm2 logs frontend --lines 20

# Backend running?
pm2 logs backend --lines 20

# Navigate to http://localhost:3000/login
```

### Issue: "Invalid credentials" on valid login

**Debug**:
```bash
# Check user exists in database
node
```
```javascript
import('./backend/src/database-users.js').then(({ getUserByUsername, getUserByEmail }) => {
  console.log('By username:', getUserByUsername('testuser'));
  console.log('By email:', getUserByEmail('test@example.com'));
  process.exit(0);
});
```

### Issue: MFA setup QR code doesn't scan

**Check**:
1. QR code displays correctly (data URL)
2. Using compatible authenticator (Google Authenticator, Authy, 1Password)
3. Clock is synced (TOTP is time-based)

**Manual setup**:
- Copy the `secret` from setup response
- Manually enter into authenticator app

### Issue: Passkeys don't work

**Requirements**:
- ✅ HTTPS (except localhost)
- ✅ Modern browser (Chrome 67+, Safari 16+, Firefox 60+)
- ✅ Device supports WebAuthn
- ✅ RP_ID, RP_NAME, ORIGIN env vars set correctly

**Test WebAuthn support**:
```javascript
// In browser console
console.log('WebAuthn supported:', !!navigator.credentials);
```

### Issue: Session not persisting

**Check**:
1. Session secret configured: `config.auth.sessionSecret`
2. Cookies enabled in browser
3. CORS credentials: `credentials: 'include'` in fetch
4. Cookie domain matches: `.yourdomain.com`

### Issue: Rate limiting on MFA

If you get "Too many failed attempts":
- Wait 15 minutes
- Use a backup code instead
- Contact admin to reset (needs UI)

## Migration Notes

### From Google-Only to Multi-Auth

Your existing setup:
- ✅ Google OAuth users automatically migrated
- ✅ Sessions continue working
- ✅ No downtime required
- ✅ Backwards compatible

Migration ran on: **Nov 14, 2025**

Migrated 1 user: `me@tedcharles.net`

### Rollback Plan (If Needed)

If you need to rollback:

1. **Stop services**:
```bash
pm2 stop all
```

2. **Revert database migration**:
```bash
# Remove users tables
sqlite3 data/gallery.db "DROP TABLE IF EXISTS users;"
sqlite3 data/gallery.db "DROP TABLE IF EXISTS auth_sessions;"
sqlite3 data/gallery.db "DROP TABLE IF EXISTS mfa_attempts;"
```

3. **Checkout previous commit**:
```bash
git stash
git checkout <previous-commit>
npm install
cd backend && npm install && npm run build
cd ../frontend && npm install && npm run build
pm2 restart all
```

## Support

### Documentation
- **WebAuthn Guide**: https://webauthn.guide/
- **TOTP RFC**: https://tools.ietf.org/html/rfc6238
- **Bcrypt**: https://github.com/kelektiv/node.bcrypt.js

### Debugging

Enable debug logging:
```javascript
// In backend/src/routes/auth-extended.ts
console.log('Login attempt:', { username, mfaRequired: user.mfa_enabled });
```

Check database:
```bash
sqlite3 data/gallery.db
> SELECT id, email, username, auth_methods, mfa_enabled FROM users;
> .quit
```

---

## Summary

✅ **Status**: Fully functional multi-auth system
✅ **Google OAuth**: Still works exactly as before  
✅ **Credentials**: Username/password login ready
✅ **MFA**: TOTP setup and verification ready
✅ **Passkeys**: WebAuthn registration and auth ready
✅ **Sessions**: Unified session management
✅ **Security**: Industry-standard bcrypt, TOTP, WebAuthn
✅ **Migration**: Existing users migrated automatically

**You're ready to use multiple authentication methods!** 🎉

The backend is 100% complete. For the best user experience, consider adding a Security Settings UI in your admin panel to manage MFA, passkeys, and passwords without using API calls directly.
