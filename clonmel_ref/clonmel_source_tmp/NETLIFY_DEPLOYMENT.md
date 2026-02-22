# Netlify Deployment Guide for Clonmel Glass Invoice Hub

## ✅ Fixed Issues

The following issues have been resolved to make the app work on Netlify:

1. **Added `netlify.toml`** - Proper build configuration
2. **Added `_redirects`** - SPA routing support
3. **Created `index.css`** - Missing stylesheet
4. **Fixed `index.html`** - Removed duplicate script tags
5. **Build tested** - Successfully builds to `dist/` folder

## 🚀 Deployment Steps

### Option 1: Deploy via Netlify UI (Recommended)

1. **Login to Netlify**: Go to [netlify.com](https://netlify.com) and sign in
2. **New Site**: Click "Add new site" → "Import an existing project"
3. **Connect Git**: 
   - If your code is on GitHub/GitLab/Bitbucket, connect your repository
   - Or use "Deploy manually" and drag the `dist` folder
4. **Build Settings** (if using Git):
   - Build command: `npm run build`
   - Publish directory: `dist`
   - Node version: 18
5. **Environment Variables**: Add in Site Settings → Environment Variables:
   - `GEMINI_API_KEY` = your Google Gemini API key
6. **Deploy**: Click "Deploy site"

### Option 2: Deploy via Netlify CLI

```bash
# Install Netlify CLI globally
npm install -g netlify-cli

# Login to Netlify
netlify login

# Build the project
npm run build

# Deploy to Netlify
netlify deploy --prod --dir=dist
```

### Option 3: Manual Drag & Drop

1. Build the project locally: `npm run build`
2. Go to [app.netlify.com/drop](https://app.netlify.com/drop)
3. Drag and drop the `dist` folder
4. Add environment variables in Site Settings after deployment

## 🔑 Environment Variables

Make sure to set these in Netlify:

- **GEMINI_API_KEY**: Your Google Gemini API key (required for AI features)

To add environment variables:
1. Go to Site Settings → Environment Variables
2. Click "Add a variable"
3. Add `GEMINI_API_KEY` with your API key value
4. Redeploy the site

## 📝 Important Notes

- The `_redirects` file is automatically copied to the `dist` folder during build
- The app uses client-side routing, so the redirects file ensures all routes work correctly
- The build output is in the `dist` folder (not `build`)
- Make sure your Gemini API key is valid and has the necessary permissions

## 🧪 Testing Locally Before Deploy

```bash
# Build the project
npm run build

# Preview the production build
npm run preview
```

This will start a local server serving the production build, so you can test before deploying.

## 🔧 Troubleshooting

### Issue: "Page Not Found" on refresh
**Solution**: The `_redirects` file should be in the `dist` folder. Run the build again.

### Issue: API errors
**Solution**: Make sure `GEMINI_API_KEY` is set in Netlify environment variables.

### Issue: Blank page
**Solution**: Check the browser console for errors. Ensure all environment variables are set.

### Issue: Build fails on Netlify
**Solution**: 
- Check that Node version is set to 18 in build settings
- Verify `package.json` has all required dependencies
- Check build logs for specific errors

## 📦 Build Output

After running `npm run build`, you should see:
```
dist/
├── index.html
├── _redirects
├── assets/
│   ├── index-[hash].js
│   ├── index-[hash].css
│   └── [other assets]
```

## 🎉 Success!

Once deployed, your app will be available at:
- `https://[your-site-name].netlify.app`

You can customize the domain in Netlify Site Settings → Domain Management.
