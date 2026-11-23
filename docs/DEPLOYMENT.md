# Deploy Mini Ajintara

Use one Atlas replica set, one Render web service and one Vercel project. The repository contains both the API and frontend. You will need access to the repository from each hosting account. The [environment table](../README.md#deployment) lists which values belong on each host.

## 1. Create the Atlas database

1. Create an Atlas project and a cluster, choosing a region near Singapore when available. Wait for the cluster to finish provisioning.
2. Under **Database Access**, create a password-authenticated *database user*. Generate a strong, unique password and give the user `readWrite` on the `ajintara` database. This account is used by the application. [Atlas database users](https://www.mongodb.com/docs/atlas/security-add-mongodb-users/)
3. Under **Network Access**, configure the IP access list. The demo setup uses `0.0.0.0/0` (any IPv4 address), so protecting the database credential is especially important. For a narrower list, add your workstation IP for seeding and the service’s shared regional CIDRs from **Render → service → Connect → Outbound** once the service exists. [Atlas network access](https://www.mongodb.com/docs/atlas/security/ip-access-list/) · [Render outbound ranges](https://render.com/docs/outbound-ip-addresses)
4. Open **Connect → Drivers**, select Node.js and copy the SRV connection string into a password manager. Replace the username and password placeholders, percent-encode special characters in the credentials, and set the database name between the hostname and query string. The shape is `mongodb+srv://<user>:<encoded-password>@<cluster>/ajintara?retryWrites=true&w=majority`. Keep the actual URI private.

## 2. Create the Render API

1. Make the repository and the deployment commits available in your Git provider account. In Render choose **New → Blueprint**, connect the repository and select the intended branch and root-level `render.yaml`. Review the preview for a single service named `ajintara-api`, Node 20, free plan, Singapore, root directory `backend`, build `npm ci`, start `npm start` and health path `/api/health`. [Render Blueprint reference](https://render.com/docs/blueprint-spec)
2. Enter `MONGO_URI` from Atlas. Generate a unique random signing key of at least 32 characters in a password manager and set `JWT_SECRET`. The blueprint sets `JWT_EXPIRES_IN=1d` and `NODE_ENV=production`. Render supplies `PORT`.
3. Set `FRONTEND_URL` to the HTTPS origin you control for the frontend, with no path or trailing slash. If Vercel has yet to assign a domain, use `https://pending.invalid` during bootstrap and replace it after the Vercel build. Additional frontend origins must each be explicit. Preview URLs need their own entries.
4. The `RAZORPAY_*` inputs reserve credentials for future payment work. They are optional for this version. Keep private keys in Render’s environment settings. Render prompts for `sync: false` variables on initial Blueprint creation. Later updates to those values go through the service’s **Environment** settings. [Render secret inputs](https://render.com/docs/blueprint-spec#prompting-for-secret-values)
5. Apply the Blueprint and wait for the service to become live. Copy its actual public URL from the dashboard. Open `https://<service>.onrender.com/api/health`. Expect HTTP 200 with `status: "ok"`, an ISO time, numeric `uptimeSeconds` and `db: "connected"`. The service checks for a replica set before listening. If startup fails, check the environment variable named in the error, database credentials, database name and Atlas access list.
6. Auto-deploy is enabled on the linked branch. GitHub Actions runs checks only. A free service sleeps after inactivity, which pauses the inventory cron. Waking the service can take around a minute, and startup fills missing inventory at the end of the window. [Render free services](https://render.com/docs/free)

## 3. Build the Vercel frontend

1. In Vercel choose **Add New → Project** and import the same Git repository. Set the root directory to `frontend`, framework preset to **Vite**, install command to `npm ci`, build command to `npm run build` and output directory to `dist`. [Vite on Vercel](https://vercel.com/docs/frameworks/frontend/vite)
2. Under **Environment Variables**, set the **Production** value for `VITE_API_URL` to the actual Render service URL **including the `/api` suffix**. If using Cloudinary uploads, add the cloud name and unsigned preset from the README table. Every `VITE_*` value is visible to the browser.
3. Deploy, then copy the stable Vercel production origin. Update `FRONTEND_URL` in Render to match exactly, for example `https://<project>.vercel.app`. Save and redeploy the API with the new environment. Changes to `VITE_API_URL` require a new Vercel build.
4. Visit `/login` directly and reload it. It should render the login page. Visiting `/partner` while logged out should take you to login. Vercel serves the built assets and rewrites SPA routes to the entry point.

## 4. Seed the production database once

1. On a trusted workstation, use Node 20.19+ and open the `backend` directory in the checked-out repository. Run `npm ci --omit=dev`. The seed commands use the production dependencies.
2. Supply the production `MONGO_URI`, `JWT_SECRET`, `NODE_ENV=production` and `FRONTEND_URL` to that local process using a private shell environment or an untracked `backend/.env`. Set a strong `SEED_PASSWORD` **before** creating the demo accounts. Keep it for the smoke test.
3. Run `npm run seed:data -- --yes`. The `--yes` flag authorizes the remote target. Verify the database host and name, then the summary of 14 properties (11 approved, 2 pending and 1 rejected). Running the command again preserves existing seed account passwords.
4. For admin access, set `ADMIN_NAME`, `ADMIN_EMAIL` and a separate strong `ADMIN_PASSWORD` in the same private environment. Choose an unused email and run `npm run seed:admin`. Existing accounts keep their current role.
5. Sign in on the Vercel site as `partner1@ajintara.test` and open a property. Verify a month of nightly inventory loads. Clear production credentials from the local seed environment when finished.

## 5. Run the live smoke test

From `backend`, export `API_URL` (the Render URL, optionally ending in `/api`), `FRONTEND_URL` (one exact Vercel origin) and `SMOKE_PASSWORD` (the current password shared by the two demo accounts). The script reads shell environment variables. This Bash example reads the password without echoing it or putting it in command history.

```bash
export API_URL='https://<service>.onrender.com/api'
export FRONTEND_URL='https://<project>.vercel.app'
read -rs -p 'Demo account password: ' SMOKE_PASSWORD && echo
export SMOKE_PASSWORD
npm run smoke
# Check the command's exit status before continuing.
unset SMOKE_PASSWORD
```

The script waits up to 90 seconds for health, then checks the 404 contract, the JSON size limit, both CORS preflights, both demo logins and profiles, partner-route access and security headers. Each check prints PASS or FAIL. A successful run exits 0. The script only reads data and authenticates existing accounts.

If the CORS step fails, compare the exact Vercel origin with Render’s allow-list, including the scheme. If login fails, verify the production seed target and the accounts’ original password. Signup and login share a rate limit, so repeated failed checks can return 429 until the window resets.

## 6. Rotate the JWT signing key

1. Generate a new random key of at least 32 characters and save it in your password manager.
2. Change `JWT_SECRET` under the Render service’s **Environment** settings, save and redeploy. Update any private seed environment holding the old key.
3. After the new process is serving, tokens signed with the previous key receive HTTP 401. Users sign in again to replace the token stored in localStorage. Run the smoke test with the existing demo password to verify fresh logins.
