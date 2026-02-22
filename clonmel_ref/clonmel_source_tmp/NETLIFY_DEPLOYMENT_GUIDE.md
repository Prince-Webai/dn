# 🚀 Netlify Deployment Guide - Clonmel Glass Invoice Hub

## ✅ Pre-Deployment Checklist

Your project is **ready to deploy** with the following configurations:

### Files Already Configured:
- ✅ `netlify.toml` - Build settings
- ✅ `_redirects` - SPA routing
- ✅ `package.json` - Build scripts
- ✅ `vite.config.ts` - Build configuration
- ✅ Supabase integration in `storageService.ts`

---

## 📦 Step 1: Build Your Project

### Option A: Using PowerShell Bypass (Recommended)
```powershell
powershell -ExecutionPolicy Bypass -Command "cd 'f:\glassone\clonmel-glass-invoice-hub-v2'; npm run build"
```

### Option B: Using Command Prompt
```cmd
cd f:\glassone\clonmel-glass-invoice-hub-v2
npm run build
```

### Expected Output:
After building, you should see a `dist` folder created with:
```
dist/
├── index.html
├── _redirects
├── assets/
│   ├── index-[hash].js
│   ├── index-[hash].css
│   └── [other assets]
```

---

## 🌐 Step 2: Deploy to Netlify

### **Method 1: Drag & Drop (Fastest - 2 minutes)**

1. **Go to Netlify Drop:**
   - Visit: https://app.netlify.com/drop
   
2. **Drag the `dist` folder:**
   - Locate: `f:\glassone\clonmel-glass-invoice-hub-v2\dist`
   - Drag the entire `dist` folder into the drop zone

3. **Wait for deployment:**
   - Netlify will upload and deploy automatically
   - You'll get a URL like: `https://[random-name].netlify.app`

4. **Customize your domain (Optional):**
   - Click "Site settings" → "Domain management"
   - Change site name to something like: `clonmel-glass-invoice-hub`
   - Your URL becomes: `https://clonmel-glass-invoice-hub.netlify.app`

---

### **Method 2: GitHub Integration (Best for Updates)**

1. **Initialize Git (if not already done):**
   ```bash
   git init
   git add .
   git commit -m "Initial deployment"
   ```

2. **Create GitHub Repository:**
   - Go to https://github.com/new
   - Create a new repository (e.g., "clonmel-glass-invoice-hub")
   - Don't initialize with README

3. **Push to GitHub:**
   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/clonmel-glass-invoice-hub.git
   git branch -M main
   git push -u origin main
   ```

4. **Connect to Netlify:**
   - Go to https://app.netlify.com
   - Click "Add new site" → "Import an existing project"
   - Choose GitHub and select your repository
   - Build settings (auto-detected from `netlify.toml`):
     - Build command: `npm run build`
     - Publish directory: `dist`
   - Click "Deploy site"

5. **Future Updates:**
   - Just push to GitHub: `git push`
   - Netlify auto-deploys on every push!

---

### **Method 3: Netlify CLI**

1. **Install Netlify CLI:**
   ```bash
   npm install -g netlify-cli
   ```

2. **Login:**
   ```bash
   netlify login
   ```

3. **Deploy:**
   ```bash
   cd f:\glassone\clonmel-glass-invoice-hub-v2
   npm run build
   netlify deploy --prod --dir=dist
   ```

---

## ⚙️ Step 3: Configure Environment Variables

**IMPORTANT:** Your Supabase credentials are currently hardcoded in `storageService.ts`. For security, you should move them to environment variables.

### Current Setup (Working but not recommended for production):
Your app currently has Supabase credentials directly in the code, so it will work immediately after deployment.

### Recommended: Use Environment Variables

1. **Update `storageService.ts`:**
   Replace the hardcoded values with:
   ```typescript
   const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://azyeptjbktvkqiigotbi.supabase.co';
   const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key-here';
   ```

2. **Add to Netlify:**
   - Go to Site settings → Environment variables
   - Add these variables:
     - `VITE_SUPABASE_URL` = `https://azyeptjbktvkqiigotbi.supabase.co`
     - `VITE_SUPABASE_ANON_KEY` = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (your key)

3. **Redeploy** after adding environment variables

---

## 🎯 Step 4: Verify Deployment

After deployment, test these features:

1. ✅ **Login Page** loads correctly
2. ✅ **Dashboard** displays after login
3. ✅ **Create Invoice** functionality works
4. ✅ **Customer CRM** page accessible
5. ✅ **Calendar View** renders properly
6. ✅ **Supabase connection** works (check if data loads)
7. ✅ **PDF Generation** works when downloading invoices
8. ✅ **All routes work** (refresh on any page should not show 404)

---

## 🔧 Troubleshooting

### Issue: "Page Not Found" on refresh
**Solution:** Ensure `_redirects` file is in the `dist` folder after build.

### Issue: Blank page after deployment
**Solution:** 
1. Check browser console for errors (F12)
2. Verify Supabase credentials are correct
3. Check Netlify deploy logs for build errors

### Issue: Supabase connection fails
**Solution:**
1. Verify your Supabase project is active
2. Check that RLS is disabled (as per your SQL schema)
3. Confirm the Supabase URL and key are correct

### Issue: Build fails on Netlify
**Solution:**
1. Check Node version is 18 (set in `netlify.toml`)
2. Verify all dependencies are in `package.json`
3. Review Netlify build logs for specific errors

---

## 📱 Custom Domain (Optional)

To use your own domain:

1. Go to Site settings → Domain management
2. Click "Add custom domain"
3. Enter your domain (e.g., `invoice.clonmelglass.com`)
4. Follow DNS configuration instructions
5. Netlify provides free SSL certificate automatically

---

## 🔄 Updating Your Deployed Site

### If using GitHub integration:
```bash
git add .
git commit -m "Update description"
git push
```
Netlify auto-deploys!

### If using drag & drop:
1. Run `npm run build`
2. Go to your Netlify site → Deploys
3. Drag the new `dist` folder to "Drag and drop your site output folder here"

### If using CLI:
```bash
npm run build
netlify deploy --prod --dir=dist
```

---

## 🎉 Success Indicators

Your deployment is successful when you see:

✅ Site is live at your Netlify URL
✅ Login page loads with Clonmel Glass branding
✅ Can log in with `admin@clonmel.com`
✅ Dashboard shows with all navigation working
✅ Can create invoices and customers
✅ Data persists in Supabase
✅ PDF downloads work correctly

---

## 📞 Support Resources

- **Netlify Docs:** https://docs.netlify.com
- **Supabase Docs:** https://supabase.com/docs
- **Vite Docs:** https://vitejs.dev/guide/

---

## 🚀 Quick Deploy Command Summary

```bash
# Build the project
powershell -ExecutionPolicy Bypass -Command "cd 'f:\glassone\clonmel-glass-invoice-hub-v2'; npm run build"

# Then drag f:\glassone\clonmel-glass-invoice-hub-v2\dist to https://app.netlify.com/drop
```

That's it! Your Clonmel Glass Invoice Hub will be live in minutes! 🎊
