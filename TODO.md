# Remove Serverless Functions and Payment API

## Tasks
- [ ] Remove serverless function files: api/admin.js, api/chat.js, api/payments.js, api/auth.js, api/projects.js
- [ ] Update vercel.json to remove functions configuration
- [ ] Verify that only database APIs remain (api/auth/ and api/projects/ directories)

## Files to Keep
- api/auth/login.js
- api/auth/register.js
- api/auth/me.js
- api/auth/profile.js
- api/auth/change-password.js
- api/projects/index.js
- api/projects/[id].js
- my-mongodb-app/ (separate Next.js app)
