# Quick Deployment Checklist

## ✅ Files Ready for Netlify

All configuration files are in place:

- ✅ `netlify.toml` - Build configuration
- ✅ `_redirects` - SPA routing
- ✅ `package.json` - Dependencies and scripts
- ✅ `vite.config.ts` - Build settings
- ✅ `SUPABASE_SCHEMA_UPDATED.sql` - Database schema

## 🚀 Deploy Now (3 Steps)

### Step 1: Build
```bash
powershell -ExecutionPolicy Bypass -Command "cd 'f:\glassone\clonmel-glass-invoice-hub-v2'; npm run build"
```

### Step 2: Deploy
- Open: https://app.netlify.com/drop
- Drag: `f:\glassone\clonmel-glass-invoice-hub-v2\dist` folder

### Step 3: Done!
Your site will be live at: `https://[random-name].netlify.app`

## 📋 Post-Deployment

1. **Customize URL:** Site settings → Domain management → Change site name
2. **Test Features:** Login, create invoice, add customer
3. **Verify Supabase:** Check if data loads from database

## 🔄 Future Updates

**Option A - Drag & Drop:**
1. `npm run build`
2. Drag new `dist` folder to Netlify

**Option B - GitHub (Recommended):**
1. Push to GitHub: `git push`
2. Netlify auto-deploys

## ⚠️ Important Notes

- Supabase credentials are in `storageService.ts` (working but hardcoded)
- For production, move to environment variables (see full guide)
- SQL schema must be run in Supabase before first use

## 📖 Full Documentation

See `NETLIFY_DEPLOYMENT_GUIDE.md` for complete instructions.
