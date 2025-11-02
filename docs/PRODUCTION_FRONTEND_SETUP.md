# Production Frontend Deployment Setup Guide

This guide walks you through setting up a complete QA and Production deployment pipeline for your frontend application.

## Prerequisites

- GitHub repository connected to Lovable
- Vercel account (or other deployment platform)
- Production Supabase project (already set up)
- QA Supabase project (already set up)

## Part 1: GitHub Branch Setup

### 1.1 Create the Develop Branch

**Option A: Through GitHub UI**
1. Go to your GitHub repository
2. Click the branch dropdown (currently showing "main")
3. Type "develop" in the search box
4. Click "Create branch: develop from main"

**Option B: Through Git CLI**
```bash
git checkout -b develop
git push origin develop
```

### 1.2 Set Default Branch (Optional)
If you want `develop` to be the default branch for Lovable development:
1. Go to repository Settings → Branches
2. Change default branch to `develop`

### 1.3 Configure Branch Protection Rules

**Protect Main Branch:**
1. Go to Settings → Branches → Add rule
2. Branch name pattern: `main`
3. Enable:
   - ✅ Require pull request before merging
   - ✅ Require status checks to pass (select CI tests)
   - ✅ Require branches to be up to date before merging
4. Save changes

**Protect Develop Branch (Optional):**
1. Same as above but for `develop` branch
2. Less strict rules for faster QA iteration

## Part 2: GitHub Secrets Configuration

### 2.1 Add Production Secrets

1. Go to your GitHub repository
2. Click Settings → Secrets and variables → Actions
3. Click "New repository secret" for each:

**Required Secrets:**

| Secret Name | Value | Where to Find |
|------------|-------|---------------|
| `PROD_SUPABASE_URL` | `https://zsquagqhilzjumfjxusk.supabase.co` | Your production Supabase project |
| `PROD_SUPABASE_ANON_KEY` | Your production anon key | Supabase Dashboard → Project Settings → API |
| `PROD_SUPABASE_PROJECT_ID` | `zsquagqhilzjumfjxusk` | Your production Supabase project |
| `SUPABASE_ACCESS_TOKEN` | Your personal access token | Supabase Dashboard → Account → Access Tokens |

### 2.2 Add QA Secrets

| Secret Name | Value | Where to Find |
|------------|-------|---------------|
| `QA_SUPABASE_URL` | Your QA Supabase URL | Your QA Supabase project |
| `QA_SUPABASE_ANON_KEY` | Your QA anon key | QA Supabase Dashboard → Project Settings → API |
| `QA_SUPABASE_PROJECT_ID` | Your QA project ID | Your QA Supabase project |

**To get Supabase Access Token:**
1. Go to https://supabase.com/dashboard/account/tokens
2. Click "Generate new token"
3. Name it (e.g., "GitHub Actions")
4. Copy and save as `SUPABASE_ACCESS_TOKEN`

## Part 3: Vercel Frontend Deployment

### 3.1 Create QA Environment

1. **Import Project to Vercel:**
   - Go to https://vercel.com/new
   - Import your GitHub repository
   - Name it: `your-app-name-qa`

2. **Configure Build Settings:**
   - Framework Preset: Vite
   - Build Command: `npm run build` (or `bun run build`)
   - Output Directory: `dist`
   - Install Command: `npm install` (or `bun install`)

3. **Set Environment Variables:**
   ```
   VITE_SUPABASE_URL = [Your QA Supabase URL]
   VITE_SUPABASE_ANON_KEY = [Your QA Anon Key]
   ```

4. **Configure Git Branch:**
   - Go to Project Settings → Git
   - Set Production Branch to: `develop`
   - This ensures QA deploys from develop branch

5. **Deploy:**
   - Click "Deploy"
   - Wait for deployment to complete
   - Save your QA URL (e.g., `your-app-qa.vercel.app`)

### 3.2 Create Production Environment

1. **Import Project Again:**
   - Go to https://vercel.com/new
   - Import the same GitHub repository
   - Name it: `your-app-name` (production)

2. **Configure Build Settings:**
   - Same as QA above

3. **Set Environment Variables:**
   ```
   VITE_SUPABASE_URL = https://zsquagqhilzjumfjxusk.supabase.co
   VITE_SUPABASE_ANON_KEY = [Your Production Anon Key]
   ```

4. **Configure Git Branch:**
   - Go to Project Settings → Git
   - Set Production Branch to: `main`
   - This ensures production deploys from main branch

5. **Deploy:**
   - Click "Deploy"
   - Wait for deployment to complete
   - Save your Production URL

### 3.3 Configure Custom Domains (Optional)

**For Production:**
1. Go to Production project → Settings → Domains
2. Add your custom domain (e.g., `yourdomain.com`)
3. Follow DNS configuration instructions

**For QA:**
1. Go to QA project → Settings → Domains
2. Add subdomain (e.g., `qa.yourdomain.com`)
3. Follow DNS configuration instructions

## Part 4: Update Supabase URL Configuration

### 4.1 Production Supabase

1. Go to your Production Supabase Dashboard
2. Navigate to Authentication → URL Configuration
3. Add your production URLs:
   - Site URL: `https://yourdomain.com` (or Vercel URL)
   - Redirect URLs: Add both:
     - `https://yourdomain.com/**`
     - `https://your-app.vercel.app/**`

### 4.2 QA Supabase

1. Go to your QA Supabase Dashboard
2. Navigate to Authentication → URL Configuration
3. Add your QA URLs:
   - Site URL: `https://qa.yourdomain.com` (or QA Vercel URL)
   - Redirect URLs: Add:
     - `https://qa.yourdomain.com/**`
     - `https://your-app-qa.vercel.app/**`

## Part 5: Configure Lovable

### 5.1 Connect to Develop Branch

1. Open your project in Lovable
2. Click GitHub icon → Settings
3. Enable "GitHub Branch Switching" if not already enabled
4. Switch to `develop` branch
5. All Lovable changes will now push to develop

### 5.2 Update Lovable Supabase Connection

**Option 1: Use QA Supabase (Recommended)**
1. In Lovable, go to Project Settings → Integrations
2. Update Supabase connection to your QA project
3. This ensures development doesn't affect production data

**Option 2: Use Separate Dev Supabase**
1. Create a third Supabase project for development
2. Connect Lovable to this dev project
3. Keeps both QA and Production isolated

## Part 6: Development Workflow

### 6.1 Daily Development

```
1. Make changes in Lovable
   ↓
2. Lovable pushes to `develop` branch
   ↓
3. GitHub Actions runs tests
   ↓
4. Vercel auto-deploys to QA
   ↓
5. Test at: https://your-app-qa.vercel.app
```

### 6.2 Deploying to Production

```
1. Test thoroughly in QA environment
   ↓
2. Create Pull Request: develop → main
   ↓
3. Review changes in PR
   ↓
4. Wait for CI checks to pass
   ↓
5. Merge PR to main
   ↓
6. GitHub Actions deploys edge functions
   ↓
7. Vercel auto-deploys to Production
   ↓
8. Live at: https://yourdomain.com
```

### 6.3 Handling Database Migrations

**Important:** Database changes require special care:

```
1. Test migration in QA Supabase first
   ↓
2. Document the migration SQL
   ↓
3. Create PR with migration notes
   ↓
4. Before merging to main:
   - Run migration on Production Supabase manually
   - Verify migration succeeded
   ↓
5. Merge PR (code expecting new schema)
   ↓
6. Deploy completes
```

## Part 7: Verification Checklist

### ✅ GitHub Setup
- [ ] Develop branch created
- [ ] Main branch protected
- [ ] All secrets configured
- [ ] Both workflow files present

### ✅ Vercel QA
- [ ] Project created and deployed
- [ ] Environment variables set
- [ ] Deploys from `develop` branch
- [ ] QA URL accessible

### ✅ Vercel Production
- [ ] Project created and deployed
- [ ] Environment variables set
- [ ] Deploys from `main` branch
- [ ] Production URL accessible
- [ ] Custom domain configured (if applicable)

### ✅ Supabase Configuration
- [ ] Production URLs added to auth config
- [ ] QA URLs added to auth config
- [ ] Edge functions deployed to both
- [ ] Storage buckets exist in both

### ✅ Lovable Configuration
- [ ] Connected to `develop` branch
- [ ] Using QA Supabase connection
- [ ] Test push works correctly

### ✅ Workflow Testing
- [ ] Push to develop triggers QA deploy
- [ ] PR from develop to main works
- [ ] Merge to main triggers production deploy
- [ ] Edge functions deploy correctly

## Part 8: Monitoring and Maintenance

### 8.1 Monitor Deployments

**Vercel:**
- Dashboard shows all deployments
- Check deployment logs for errors
- Monitor build times

**GitHub Actions:**
- Check Actions tab for workflow runs
- Review logs for failed deployments

**Supabase:**
- Monitor Edge Function logs
- Check database performance
- Review auth metrics

### 8.2 Common Issues

**Issue: Environment variables not updating**
- Solution: Redeploy in Vercel after changing env vars

**Issue: Edge functions not deployed**
- Solution: Check `SUPABASE_ACCESS_TOKEN` is valid
- Verify project IDs are correct

**Issue: Auth redirect failing**
- Solution: Verify URLs in Supabase auth config
- Check redirect URLs include wildcards

**Issue: Build failing in Vercel**
- Solution: Check build logs
- Verify all dependencies are in package.json
- Test build locally first

## Part 9: Rollback Procedures

### 9.1 Frontend Rollback

**In Vercel:**
1. Go to Deployments tab
2. Find last working deployment
3. Click "..." → "Promote to Production"

### 9.2 Database Rollback

**If migration fails:**
1. Have backup SQL ready
2. Run rollback migration in Supabase SQL Editor
3. Rollback frontend if needed

### 9.3 Edge Functions Rollback

**Manual rollback:**
1. Find previous version in git
2. Copy previous edge function code
3. Deploy via Supabase CLI or dashboard

## Resources

- **Vercel Docs:** https://vercel.com/docs
- **Supabase Docs:** https://supabase.com/docs
- **GitHub Actions:** https://docs.github.com/actions
- **Lovable Docs:** https://docs.lovable.dev

## Support

If you encounter issues:
1. Check the troubleshooting section
2. Review deployment logs
3. Verify all configuration steps
4. Ask in Lovable Discord for help
