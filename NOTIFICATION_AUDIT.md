# Notification & Email Audit - Templating Plan

## Current Issues
- Notifications lack context (which user? which album?)
- All currently just use generic messages
- Need to add variable interpolation for all

## Notifications to Template

### Auth/User Events (auth-extended.ts)
1. **User Invited** - Add: `{{userEmail}}`, `{{inviterName}}`
2. **User Accepted Invite** - Add: `{{userName}}`, `{{userEmail}}`
3. **User Deleted** - Add: `{{userEmail}}`, `{{deletedBy}}`
4. **User Role Changed** - Add: `{{userName}}`, `{{userEmail}}`, `{{oldRole}}`, `{{newRole}}`
5. **Password Changed** - Add: `{{userName}}`, `{{userEmail}}`
6. **Admin Password Reset** - Add: `{{targetUserEmail}}`, `{{adminName}}`
7. **MFA Enabled** - Add: `{{userName}}`, `{{userEmail}}`
8. **MFA Disabled** - Add: `{{userName}}`, `{{userEmail}}`
9. **Passkey Created** - Add: `{{userName}}`, `{{passkeyName}}`
10. **Passkey Deleted** - Add: `{{userName}}`, `{{passkeyName}}`

### Album/Content Events (album-management.ts)
11. **Album Created** - Add: `{{albumName}}`, `{{createdBy}}`
12. **Album Deleted** - Add: `{{albumName}}`, `{{deletedBy}}`
13. **Album Published** - Add: `{{albumName}}`, `{{changedBy}}`
14. **Large Upload** - Add: `{{photoCount}}`, `{{albumName}}`, `{{uploadedBy}}`

### Share Link Events (share-links.ts)
15. **Share Link Created** - Add: `{{albumName}}`, `{{createdBy}}`, `{{expiresIn}}`
16. **Share Link Accessed** - Add: `{{albumName}}`, `{{accessedFrom}}`
17. **Share Link Expired** - Add: `{{albumName}}`

### Config Events (config.ts)
18. **Config Updated** - Add: `{{updatedBy}}`
19. **SMTP Settings Changed** - Add: `{{updatedBy}}`
20. **OpenAI API Key Updated** - Add: `{{updatedBy}}`
21. **Branding Updated** - Add: `{{updatedBy}}`

### Processing Events (ai-titles.ts, image-optimization.ts, video-optimization.ts)
22. **AI Title Generation Complete** - Add: `{{albumName}}`, `{{titlesGenerated}}`
23. **AI Title Generation Failed** - Add: `{{albumName}}`, `{{error}}`
24. **Image Optimization Complete** - Add: `{{imagesOptimized}}`
25. **Image Optimization Failed** - Add: `{{error}}`
26. **Video Processing Complete** - Add: `{{videoName}}`, `{{albumName}}`
27. **Video Processing Failed** - Add: `{{videoName}}`, `{{error}}`

### Test Notifications
28. **Test Notification** - Add: `{{userName}}`

## Emails to Verify

### Invitation Email (email.ts)
- ✅ Has: `{{siteName}}`, `{{inviterName}}`, `{{inviteUrl}}`
- Check translations in all 18 languages

### Password Reset Email (email.ts)
- ✅ Has: `{{siteName}}`, `{{userName}}`, `{{resetUrl}}`
- Check translations in all 18 languages

### Test Email (email.ts)
- ✅ Has: `{{siteName}}`, `{{timestamp}}`
- Check translations in all 18 languages

## Implementation Steps

1. **Update notifyAllAdmins helper** to support variable interpolation
2. **Update backend translation keys** with variable placeholders
3. **Update all notification calls** to pass context data
4. **Run sync-translation-keys.js** to propagate to all languages
5. **Run auto-translate.js** to translate new templated strings
6. **Test each notification type**

## Translation Helper Updates Needed

```typescript
// Current: Just translates key
const title = await translateNotificationForUser(userId, 'notifications.backend.userInvitedTitle');

// New: Translates with variables
const title = await translateNotificationForUser(userId, 'notifications.backend.userInvitedTitle', {
  userEmail: 'user@example.com',
  inviterName: 'Admin'
});
```
