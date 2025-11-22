# Notification & Email Templating Checklist

## Phase 1: Update Translation Keys with Variables

### User/Auth Notifications (10 items)
- [x] 1. userInvitedTitle/Body - Add {{inviterName}}, {{userEmail}}
- [x] 2. userAcceptedInviteTitle/Body - Add {{userName}}, {{userEmail}}
- [x] 3. userDeletedTitle/Body - Add {{userEmail}}, {{deletedBy}}
- [x] 4. userRoleChangedTitle/Body - Add {{userName}}, {{userEmail}}, {{oldRole}}, {{newRole}}
- [x] 5. passwordChangedTitle/Body - Add {{userName}}, {{userEmail}}
- [x] 6. adminPasswordResetTitle/Body - Add {{adminName}}, {{targetUserEmail}}
- [x] 7. userSetupMFATitle/Body - Add {{userName}}, {{userEmail}}
- [x] 8. mfaDisabledTitle/Body - Add {{userName}}, {{userEmail}}
- [x] 9. userCreatedPasskeyTitle/Body - Add {{userName}}, {{passkeyName}}
- [x] 10. passkeyDeletedTitle/Body - Add {{userName}}, {{passkeyName}}

### Album/Content Notifications (4 items)
- [x] 11. albumCreatedTitle/Body - Add {{albumName}}, {{createdBy}}
- [x] 12. albumDeletedTitle/Body - Add {{albumName}}, {{deletedBy}}
- [x] 13. albumPublishedTitle/Body - Add {{albumName}}, {{publishedBy}}
- [x] 14. largePhotoUploadTitle/Body - Add {{photoCount}}, {{albumName}}, {{uploadedBy}}

### Share Link Notifications (3 items)
- [x] 15. shareLinkCreatedTitle/Body - Add {{albumName}}, {{createdBy}}
- [x] 16. shareLinkAccessedTitle/Body - Add {{albumName}}, {{accessedFrom}}
- [x] 17. shareLinkExpiredTitle/Body - Add {{albumName}}

### Config Notifications (4 items)
- [x] 18. configUpdatedTitle/Body - Add {{updatedBy}}
- [x] 19. smtpSettingsChangedTitle/Body - Add {{updatedBy}}
- [x] 20. openaiApiKeyUpdatedTitle/Body - Add {{updatedBy}}
- [x] 21. brandingUpdatedTitle/Body - Add {{updatedBy}}

### Processing Notifications (6 items)
- [x] 22. aiTitlesComplete - Add {{albumName}}, {{titlesGenerated}}
- [x] 23. aiTitlesFailed - Add {{albumName}}, {{error}}
- [x] 24. imageOptimizationComplete - Add {{imagesOptimized}}
- [x] 25. imageOptimizationFailed - Add {{error}}
- [x] 26. videoProcessingComplete - Add {{videoName}}, {{albumName}}
- [x] 27. videoProcessingFailed - Add {{videoName}}, {{error}}

### Other (2 items)
- [x] 28. testNotificationTitle/Body - Add {{userName}}
- [x] 29. failedLoginAttemptsTitle/Body - Add {{userEmail}}, {{attemptCount}}
- [x] 30. suspiciousActivityTitle/Body - Add {{userEmail}}, {{location}}, {{device}}

## Phase 2: Update Notification Calls

### auth-extended.ts (15 calls)
- [x] 31. POST /invite - userInvited
- [x] 32. POST /invite/:token/complete - userAcceptedInvite
- [x] 33. DELETE /users/:userId - userDeleted
- [x] 34. PATCH /users/:userId/role - userRoleChanged
- [x] 35. POST /change-password - passwordChanged
- [x] 36. POST /password-reset/:token/complete - passwordChanged
- [x] 37. POST /users/:userId/send-password-reset - adminPasswordReset
- [x] 38. POST /users/:userId/reset-mfa - mfaDisabled
- [x] 39. POST /mfa/verify-setup - userSetupMFA
- [x] 40. POST /mfa/disable - mfaDisabled
- [x] 41. POST /passkey/register-verify - userCreatedPasskey
- [x] 42. DELETE /passkey/:id - passkeyDeleted

### album-management.ts (3 calls - need to implement)
- [x] 43. POST /albums - albumCreated
- [x] 44. DELETE /albums - albumDeleted
- [x] 45. PUT /albums/:album/publish - albumPublished
- [ ] 46. POST /:album/upload - largePhotoUpload (if > 50 photos)

### share-links.ts (1 call)
- [x] 47. POST /share - shareLinkCreated

### config.ts (4 calls)
- [x] 48. PUT / - configUpdated (if smtpChanged)
- [x] 49. PUT / - smtpSettingsChanged
- [x] 50. PUT / - openaiApiKeyUpdated
- [x] 51. PUT / - brandingUpdated

### ai-titles.ts (2 calls)
- [x] 52. Job complete - aiTitlesComplete
- [x] 53. Job error - aiTitlesFailed

### image-optimization.ts (2 calls)
- [x] 54. Job complete - imageOptimizationComplete
- [x] 55. Job error - imageOptimizationFailed

### video-optimization.ts (4 calls)
- [x] 56. Process complete - videoProcessingComplete
- [x] 57. Process error - videoProcessingFailed
- [x] 58. Reprocess complete - videoReprocessingComplete
- [x] 59. Reprocess error - videoReprocessingFailed

### push-notifications.ts (1 call)
- [x] 60. POST /test - testNotification

## Phase 3: Final Steps
- [x] 61. Run sync-translation-keys.js to propagate to all languages
- [x] 62. Run auto-translate.js to translate all variables
- [x] 63. Rebuild backend
- [x] 64. Test in Japanese
- [x] 65. Commit and push

**Total: 65 items**
