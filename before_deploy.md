# Permanent Project Requirement: Shadow Shop Production Quality Gate

Establish an automated verification system for every production release.

## A. Before Deployment

- Run frontend linting.
- Run frontend unit tests.
- Run Django tests.
- Check for undefined variables and runtime errors.
- Check API integration.
- Check environment variables.
- Check for exposed secrets.
- Build the production frontend.
- Verify the build completes successfully.

## B. Browser Automation

Use Playwright to test:

1. Homepage loads.
2. Shop page loads.
3. Product details open.
4. Search and filters work.
5. Login and registration work.
6. Customer profile loads.
7. Cart and checkout work.
8. Order creation works.
9. Payment sandbox integration works.
10. Admin dashboard loads.
11. Inventory and stock updates work.
12. No unexpected JavaScript console errors.
13. No failed critical network requests.
14. Mobile and desktop layouts work.

## C. Production Verification

After deployment:

- Open the actual production domain.
- Verify HTTP status and page loading.
- Check browser console errors.
- Check critical API endpoints.
- Check asset loading and cache behavior.
- Verify authentication and essential business workflows.
- Confirm frontend and backend versions are compatible.

## D. Deployment Safety

- Never deploy automatically if mandatory tests fail.
- Never run destructive database migrations without review and backup.
- Never use production payment credentials during automated test purchases.
- Never modify real customer orders during tests.
- Keep a deployment log.
- Provide a clear pass/fail report.
- Support rollback to the previous working release.

## E. Final Report

Report:
- Build status
- Test results
- Browser errors
- API failures
- Security findings
- Deployment status
- Rollback availability

A successful build alone does not mean the application is production-ready.