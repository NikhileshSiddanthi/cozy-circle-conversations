# QA → Production Pipeline Setup Guide

## Overview

This guide will help you set up a proper software development pipeline with separate QA and Production environments for both frontend and backend (Supabase).

## Architecture

```
develop branch → QA Environment → QA Supabase Project
     ↓ (PR + Approval)
main branch → Production Environment → Production Supabase Project
```

---

## Step-by-Step Setup

### Phase 1: Create QA Supabase Project (15 minutes)

#### 1.1 Create New Supabase Project
1. Go to https://supabase.com/dashboard
2. Click "New Project"
3. Configure:
   - **Name**: `cozi-qa` (or `your-app-qa`)
   - **Database Password**: Generate strong password (save it!)
   - **Region**: Same as production for consistency
   - **Pricing Plan**: Free tier is fine for QA
4. Click "Create new project"
5. Wait 2-3 minutes for provisioning

#### 1.2 Note Down QA Credentials
Once created, go to Project Settings → API:
- **Project URL**: `https://xxxxx.supabase.co`
- **Project ID**: `xxxxx` (from URL)
- **anon public key**: `eyJhbG...` (long JWT token)
- **service_role key**: `eyJhbG...` (keep this SECRET!)

**Save these in a secure password manager!**

#### 1.3 Set Up QA Database Schema
1. Go to your QA project SQL Editor
2. Run all migrations from `supabase/migrations/` folder in order
3. Or export your production schema:
   - In production Supabase: Go to Database → Schema Visualizer
   - Click "Generate SQL"
   - Copy and run in QA SQL editor

#### 1.4 Configure QA Authentication
1. Go to Authentication → Providers
2. Enable the same auth methods as production:
   - Email (if using)
   - Google OAuth (if using) - you'll need separate OAuth credentials for QA
3. Go to Authentication → URL Configuration:
   - Add your QA site URL (e.g., `https://cozi-qa.vercel.app`)

#### 1.5 Set Up QA Storage
1. Go to Storage
2. Create the same buckets as production:
   - `post-files` (public)
3. Apply the same RLS policies (copy from production)

#### 1.6 Deploy Edge Functions to QA
```bash
# Install Supabase CLI if you haven't
npm install -g supabase

# Login to Supabase
supabase login

# Link to your QA project
supabase link --project-ref YOUR_QA_PROJECT_ID

# Deploy all functions
supabase functions deploy --project-ref YOUR_QA_PROJECT_ID
```

#### 1.7 Set Edge Function Secrets in QA
Go to https://supabase.com/dashboard/project/YOUR_QA_PROJECT_ID/settings/functions

Add these secrets (use QA/test versions where applicable):
- `OPENAI_API_KEY` - Same as prod or separate test key
- `HUGGING_FACE_ACCESS_TOKEN` - Same as prod
- `NEWS_API_KEY` - Same as prod or test key
- `SUPABASE_URL` - Your QA Supabase URL
- `SUPABASE_ANON_KEY` - Your QA anon key
- `SUPABASE_SERVICE_ROLE_KEY` - Your QA service role key
- `SUPABASE_DB_URL` - Your QA database URL (from Settings → Database)

---

### Phase 2: Set Up GitHub Repository (10 minutes)

#### 2.1 Create Branch Strategy
```bash
# If you don't have a develop branch yet
git checkout -b develop
git push -u origin develop
```

#### 2.2 Set Branch Protection Rules
Go to your GitHub repo → Settings → Branches

**For `main` branch:**
1. Click "Add branch protection rule"
2. Branch name pattern: `main`
3. Enable:
   - ✅ Require pull request before merging
   - ✅ Require approvals (1)
   - ✅ Require status checks to pass before merging
   - ✅ Require branches to be up to date before merging
4. Save changes

**For `develop` branch:**
1. Add another rule for `develop`
2. Same settings but maybe fewer approvals needed

#### 2.3 Set Up GitHub Secrets
Go to your repo → Settings → Secrets and variables → Actions → New repository secret

Add these secrets:

**QA Environment:**
- `QA_SUPABASE_URL` = Your QA Supabase URL
- `QA_SUPABASE_ANON_KEY` = Your QA anon key
- `QA_SUPABASE_PROJECT_ID` = Your QA project ID

**Production Environment:**
- `PROD_SUPABASE_URL` = Your production Supabase URL  
- `PROD_SUPABASE_ANON_KEY` = Your production anon key
- `PROD_SUPABASE_PROJECT_ID` = Your production project ID

**Supabase CLI (for both):**
- `SUPABASE_ACCESS_TOKEN` = Generate from https://supabase.com/dashboard/account/tokens

---

### Phase 3: Set Up Frontend Deployment (15 minutes)

We'll use **Vercel** (easiest) - you can also use Netlify or other platforms.

#### 3.1 Install Vercel CLI
```bash
npm install -g vercel
```

#### 3.2 Deploy QA Environment
```bash
# From your project root
vercel

# Follow prompts:
# - Link to existing project or create new? → Create new
# - Project name? → cozi-qa
# - Directory? → ./ (press enter)
# - Override settings? → No

# This creates a production deployment, we'll configure it for QA
```

#### 3.3 Configure Vercel for QA
1. Go to https://vercel.com/dashboard
2. Select your `cozi-qa` project
3. Go to Settings → Git
4. Set **Production Branch** to `develop` (not main!)
5. Go to Settings → Environment Variables
6. Add variables for **Production** environment:
   - `VITE_SUPABASE_PROJECT_ID` = Your QA project ID
   - `VITE_SUPABASE_PUBLISHABLE_KEY` = Your QA anon key
   - `VITE_SUPABASE_URL` = Your QA Supabase URL
7. Redeploy from the Deployments tab

#### 3.4 Deploy Production Environment
```bash
# Create a new Vercel project for production
vercel --prod

# Follow prompts, name it: cozi-production
```

1. Go to https://vercel.com/dashboard
2. Select your `cozi-production` project
3. Settings → Git → Set **Production Branch** to `main`
4. Settings → Environment Variables (Production):
   - `VITE_SUPABASE_PROJECT_ID` = Your production project ID
   - `VITE_SUPABASE_PUBLISHABLE_KEY` = Your production anon key
   - `VITE_SUPABASE_URL` = Your production Supabase URL

#### 3.5 Set Up Custom Domains (Optional)
**QA:**
- Settings → Domains → Add `qa.yourdomain.com`

**Production:**
- Settings → Domains → Add `yourdomain.com` or `www.yourdomain.com`

---

### Phase 4: Update Lovable Configuration (5 minutes)

#### 4.1 Connect Lovable to QA Branch
1. In Lovable, click GitHub button (top right)
2. If not connected, connect to GitHub
3. Go to Account Settings → Labs
4. Enable "GitHub Branch Switching" (experimental feature)
5. Switch to `develop` branch in Lovable
6. This makes all your Lovable changes go to the develop branch

#### 4.2 Update Lovable Supabase Connection
**Option A: Keep Lovable on QA**
- Disconnect current Supabase in Lovable
- Connect to your QA Supabase project
- Now all development happens in QA

**Option B: Use Lovable for Development Only**
- Keep Lovable on a separate development Supabase project
- Manually test in QA before merging to main

---

### Phase 5: Workflow Usage (Ongoing)

#### Daily Development Workflow

```bash
# 1. Make changes in Lovable or locally on develop branch
git checkout develop
# ... make changes ...
git add .
git commit -m "Add new feature"
git push origin develop

# 2. Automatic: GitHub Actions runs tests and deploys to QA
# 3. Automatic: Vercel deploys to https://cozi-qa.vercel.app
# 4. Automatic: Edge functions deploy to QA Supabase

# 5. Test in QA environment
# Visit https://cozi-qa.vercel.app and test thoroughly

# 6. When ready for production, create PR
git checkout develop
git pull origin develop
# Go to GitHub and create Pull Request: develop → main

# 7. Review PR, approve, and merge
# This triggers production deployment automatically

# 8. Verify production deployment
# Visit https://your-production-url.com
```

#### Database Migration Workflow

When you need to change the database schema:

```bash
# 1. Create migration in QA first
# Use Supabase dashboard SQL editor or Lovable migration tool

# 2. Export the migration SQL
# Save to supabase/migrations/YYYYMMDDHHMMSS_description.sql

# 3. Test in QA
# Verify the migration works in QA environment

# 4. Commit the migration file
git add supabase/migrations/
git commit -m "Add migration: description"
git push origin develop

# 5. After PR approval and merge to main
# Run migration in production Supabase:
supabase db push --project-ref YOUR_PROD_PROJECT_ID
```

---

## Verification Checklist

### QA Environment ✓
- [ ] QA Supabase project created
- [ ] Database schema matches production
- [ ] Edge functions deployed to QA
- [ ] All secrets configured in QA
- [ ] Storage buckets created with RLS
- [ ] Auth providers configured
- [ ] Vercel QA project deployed
- [ ] QA site accessible and working
- [ ] GitHub Actions workflow runs on develop

### Production Environment ✓
- [ ] Production Supabase project (existing)
- [ ] Vercel production project deployed
- [ ] Production deploys only from main branch
- [ ] All secrets configured in GitHub
- [ ] Branch protection rules active
- [ ] Custom domain configured (optional)

### Workflow ✓
- [ ] Lovable connected to develop branch
- [ ] Can push to develop and see QA deployment
- [ ] Can create PR from develop to main
- [ ] PR requires approval before merge
- [ ] Merging to main triggers production deployment
- [ ] Production deployment successful

---

## Troubleshooting

### Edge Functions Not Deploying
```bash
# Check Supabase CLI is logged in
supabase login

# Verify project link
supabase projects list

# Deploy manually
supabase functions deploy --project-ref YOUR_PROJECT_ID
```

### Environment Variables Not Working
- Verify variables are set in Vercel dashboard
- Variable names must match exactly (case-sensitive)
- After adding variables, trigger a new deployment
- Check build logs in Vercel for errors

### Database Schema Out of Sync
```bash
# Export production schema
supabase db dump --project-ref YOUR_PROD_ID > prod_schema.sql

# Apply to QA
supabase db reset --project-ref YOUR_QA_ID
psql YOUR_QA_DB_URL < prod_schema.sql
```

### GitHub Actions Failing
- Check secrets are set correctly in GitHub repo settings
- Verify workflow file syntax (YAML indentation matters!)
- Check Actions tab for detailed error logs
- Ensure Supabase access token has correct permissions

---

## Cost Considerations

**QA Environment:**
- Supabase: Free tier (up to 500MB database, 1GB storage)
- Vercel: Free tier (100GB bandwidth/month)
- Total: $0/month for QA

**Production Environment:**
- Current setup (no changes to cost)

**Optional Upgrades:**
- Supabase Pro ($25/mo): For QA if you need more resources
- Vercel Pro ($20/mo): If you exceed free tier bandwidth

---

## Security Best Practices

1. **Never commit secrets to git**
   - Use environment variables only
   - Keep `.env` in `.gitignore`

2. **Use different API keys for QA/Prod**
   - Especially for payment providers
   - Use test/sandbox modes in QA

3. **Limit QA access**
   - Don't expose QA publicly if possible
   - Use Vercel password protection for QA site

4. **Regular security audits**
   - Review Supabase RLS policies
   - Check for exposed edge function logs
   - Monitor for unusual activity

---

## Next Steps

1. Complete Phase 1 (Create QA Supabase)
2. Complete Phase 2 (GitHub setup)
3. Complete Phase 3 (Vercel setup)
4. Complete Phase 4 (Lovable config)
5. Test the full workflow with a small change
6. Document any customizations for your team

## Support Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Vercel Documentation](https://vercel.com/docs)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Lovable Documentation](https://docs.lovable.dev)

---

**Questions or issues?** Feel free to ask for help with any specific step!
