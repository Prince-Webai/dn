# 🚀 How to Update Your Project on GitHub

## Step-by-Step Guide to Push to GitHub

---

## 📋 **Option 1: First Time Setup (New Repository)**

### **Step 1: Initialize Git Repository**

Open Command Prompt or PowerShell in your project folder and run:

```bash
cd f:\glassone\clonmel-glass-invoice-hub-v2
git init
```

### **Step 2: Add All Files**

```bash
git add .
```

### **Step 3: Create First Commit**

```bash
git commit -m "Initial commit with all latest updates - PDF design, calculator fixes, CRM features"
```

### **Step 4: Create GitHub Repository**

1. Go to: https://github.com/new
2. **Repository name:** `clonmel-glass-invoice-hub` (or your preferred name)
3. **Description:** "Invoice management system for Clonmel Glass & Mirrorzone"
4. **Visibility:** Choose Private or Public
5. **DO NOT** check "Initialize with README"
6. Click **"Create repository"**

### **Step 5: Connect to GitHub**

Replace `YOUR_USERNAME` with your actual GitHub username:

```bash
git remote add origin https://github.com/YOUR_USERNAME/clonmel-glass-invoice-hub.git
git branch -M main
git push -u origin main
```

**You'll be prompted for:**
- GitHub username
- Personal Access Token (not password)

---

## 🔑 **Getting a GitHub Personal Access Token**

If you don't have a token:

1. Go to: https://github.com/settings/tokens
2. Click **"Generate new token"** → **"Generate new token (classic)"**
3. **Note:** "Clonmel Glass Invoice Hub"
4. **Expiration:** Choose your preference (90 days recommended)
5. **Scopes:** Check ✅ **repo** (all sub-options)
6. Click **"Generate token"**
7. **COPY THE TOKEN** (you won't see it again!)
8. Use this token as your password when pushing

---

## 📦 **Option 2: Update Existing Repository**

If you already have the project on GitHub:

### **Quick Update Commands:**

```bash
cd f:\glassone\clonmel-glass-invoice-hub-v2

# Check what changed
git status

# Add all changes
git add .

# Commit with a message
git commit -m "Updated PDF design to match reference, fixed calculator validation"

# Push to GitHub
git push
```

---

## 🔄 **Common Update Workflow**

Every time you make changes and want to update GitHub:

```bash
# 1. Check what changed
git status

# 2. Add all changes
git add .

# 3. Commit with descriptive message
git commit -m "Your update description here"

# 4. Push to GitHub
git push
```

---

## 📝 **Good Commit Message Examples**

```bash
git commit -m "Fixed invoice calculator for single-digit inputs"
git commit -m "Updated PDF design to match reference layout"
git commit -m "Added CRM customer management features"
git commit -m "Improved PAID/UNPAID banner visibility in PDFs"
git commit -m "Ready for production deployment"
```

---

## 🎯 **Complete First-Time Setup Script**

Copy and paste this (replace YOUR_USERNAME):

```bash
cd f:\glassone\clonmel-glass-invoice-hub-v2
git init
git add .
git commit -m "Initial commit - Clonmel Glass Invoice Hub with all features"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/clonmel-glass-invoice-hub.git
git push -u origin main
```

---

## 🔧 **Troubleshooting**

### **Issue: "fatal: not a git repository"**
**Solution:** Run `git init` first

### **Issue: "Permission denied"**
**Solution:** Use Personal Access Token instead of password

### **Issue: "Updates were rejected"**
**Solution:** Pull first, then push:
```bash
git pull origin main --allow-unrelated-histories
git push origin main
```

### **Issue: "remote origin already exists"**
**Solution:** Remove and re-add:
```bash
git remote remove origin
git remote add origin https://github.com/YOUR_USERNAME/clonmel-glass-invoice-hub.git
```

---

## 🌐 **After Pushing to GitHub**

### **Connect to Netlify for Auto-Deploy:**

1. Go to: https://app.netlify.com
2. Click **"Add new site"** → **"Import an existing project"**
3. Choose **GitHub**
4. Select your repository: `clonmel-glass-invoice-hub`
5. Build settings (auto-detected from `netlify.toml`):
   - Build command: `npm run build`
   - Publish directory: `dist`
   - Node version: 18
6. Click **"Deploy site"**

**Future updates:** Just push to GitHub, Netlify auto-deploys! 🎉

---

## 📊 **What Gets Pushed to GitHub**

Your repository will include:
- ✅ All source code (React components, services, etc.)
- ✅ Configuration files (package.json, vite.config.ts, netlify.toml)
- ✅ Database schema (SUPABASE_SCHEMA_UPDATED.sql)
- ✅ Documentation (README, deployment guides)
- ❌ node_modules (excluded via .gitignore)
- ❌ dist folder (excluded via .gitignore)
- ❌ .env files (excluded via .gitignore)

---

## ✅ **Verify Your Push**

After pushing, check:
1. Go to: `https://github.com/YOUR_USERNAME/clonmel-glass-invoice-hub`
2. You should see all your files
3. Check the commit message and timestamp
4. Verify the code is up to date

---

## 🎉 **Success!**

Once pushed to GitHub:
- ✅ Your code is backed up in the cloud
- ✅ You can access it from anywhere
- ✅ You can connect it to Netlify for auto-deployment
- ✅ You have version control for all changes

---

## 📞 **Need Help?**

- **GitHub Docs:** https://docs.github.com
- **Git Basics:** https://git-scm.com/book/en/v2/Getting-Started-Git-Basics
- **Personal Access Tokens:** https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/creating-a-personal-access-token

---

**Ready to push? Start with Option 1 above!** 🚀
