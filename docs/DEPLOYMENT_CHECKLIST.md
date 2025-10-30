# Deployment Checklist

Use this checklist before deploying to production.

## Pre-Deployment (QA Environment)

### Code Quality
- [ ] All tests passing locally
- [ ] No console errors in browser
- [ ] No TypeScript errors (`bunx tsc --noEmit`)
- [ ] Linter passes (`bun run lint`)
- [ ] Code reviewed by at least one other person

### Functionality Testing
- [ ] User authentication works (login/logout)
- [ ] Post creation and editing works
- [ ] Image uploads work correctly
- [ ] Comments and reactions work
- [ ] Groups functionality works
- [ ] Search functionality works
- [ ] Profile pages load correctly
- [ ] Share functionality works (no heart symbol!)
- [ ] All forms validate properly

### Database
- [ ] All migrations applied to QA database
- [ ] RLS policies tested with different user roles
- [ ] No exposed sensitive data
- [ ] Database indexes are in place
- [ ] Foreign key constraints are correct

### Edge Functions
- [ ] All edge functions deployed to QA
- [ ] Edge function secrets configured
- [ ] Functions responding correctly
- [ ] Error handling works
- [ ] Rate limiting tested (if applicable)
- [ ] Check edge function logs for errors

### Performance
- [ ] Page load times < 3 seconds
- [ ] Images loading properly
- [ ] No memory leaks
- [ ] Network requests optimized
- [ ] Bundle size reasonable (<500KB initial)

### Security
- [ ] No hardcoded secrets in code
- [ ] API keys stored in environment variables
- [ ] RLS policies enabled on all tables
- [ ] CORS configured correctly
- [ ] Input sanitization working
- [ ] XSS protection in place

### Mobile/Responsive
- [ ] Works on mobile devices (iOS/Android)
- [ ] Works on tablets
- [ ] Touch interactions work
- [ ] Text is readable on small screens
- [ ] Navigation works on mobile

### Browser Compatibility
- [ ] Chrome/Edge (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Mobile Safari (iOS)
- [ ] Mobile Chrome (Android)

---

## Deployment to Production

### Pre-Deploy
- [ ] Create PR from `develop` to `main`
- [ ] PR approved by reviewer
- [ ] All CI checks passing
- [ ] QA testing completed successfully
- [ ] Stakeholders notified of deployment

### During Deploy
- [ ] Merge PR to `main`
- [ ] Monitor GitHub Actions workflow
- [ ] Verify edge functions deployed
- [ ] Check Vercel deployment logs
- [ ] Confirm build succeeded

### Post-Deploy Verification
- [ ] Production site loads correctly
- [ ] Test login/authentication
- [ ] Create a test post
- [ ] Check database is responding
- [ ] Verify edge functions working
- [ ] Check browser console for errors
- [ ] Test on mobile device
- [ ] Verify analytics tracking (if applicable)

### Database Migration (if needed)
- [ ] Backup production database first
- [ ] Run migration on production
- [ ] Verify migration succeeded
- [ ] Test affected functionality
- [ ] Rollback plan ready if needed

### Monitoring (First Hour)
- [ ] Check error logs every 15 minutes
- [ ] Monitor Supabase dashboard for errors
- [ ] Watch for user reports
- [ ] Check performance metrics
- [ ] Verify edge function invocations

---

## Rollback Procedure

If something goes wrong:

### Immediate Actions
1. **Frontend Rollback:**
   ```bash
   # In Vercel dashboard:
   # Go to Deployments → Find last working deployment → Promote to Production
   ```

2. **Database Rollback:**
   ```bash
   # Restore from backup
   # Contact Supabase support if needed
   ```

3. **Edge Functions Rollback:**
   ```bash
   # Re-deploy previous version
   git checkout <previous-commit>
   supabase functions deploy --project-ref YOUR_PROD_ID
   ```

### Communication
- [ ] Notify team in Slack/Discord
- [ ] Post status update if customer-facing
- [ ] Document what went wrong
- [ ] Create post-mortem after incident

---

## Post-Deployment

### Documentation
- [ ] Update CHANGELOG.md
- [ ] Document any manual steps taken
- [ ] Update API documentation if changed
- [ ] Note any configuration changes

### Team Communication
- [ ] Announce successful deployment
- [ ] Share what was deployed
- [ ] Note any known issues
- [ ] Thank contributors

### Monitoring (24 Hours)
- [ ] Check error rates
- [ ] Monitor user feedback
- [ ] Review performance metrics
- [ ] Check database performance
- [ ] Verify edge function costs

---

## Emergency Contacts

**Supabase Issues:**
- Dashboard: https://supabase.com/dashboard
- Support: https://supabase.com/support

**Vercel Issues:**
- Dashboard: https://vercel.com/dashboard
- Support: https://vercel.com/support

**GitHub Actions:**
- Actions tab: https://github.com/YOUR_ORG/YOUR_REPO/actions

---

## Notes

Date deployed: __________
Deployed by: __________
Issues encountered: __________
