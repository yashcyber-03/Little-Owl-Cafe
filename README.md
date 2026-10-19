# Little Owl Cafe: website, reservations and admin (Vercel)

Static site in `public/`, API in `api/[...path].js` (one serverless function), data in Upstash Redis. No npm dependencies.

## Deploy to Vercel
1. Push this folder to a GitHub repo, or run `npx vercel` inside it.
2. In Vercel, import the repo. Leave the framework preset as "Other" and the build command empty.
3. Project > Storage > add **Upstash Redis** from the Marketplace and connect it to the project. This sets the `KV_REST_API_URL` and `KV_REST_API_TOKEN` variables automatically.
4. Project > Settings > Environment Variables: add `ADMIN_PASSWORD` (a strong password) and optionally `SESSION_SECRET` (any long random text).
5. Redeploy. The site is at your Vercel URL, the owner dashboard at `/admin`. Add the cafe's own domain under Settings > Domains.

## Local preview
`npx vercel dev` (without Redis it uses temporary in-memory data, so bookings vanish on restart; set `ADMIN_PASSWORD` in `.env.local` to test the dashboard).

## What it does
- Live menu served from the database; owner adds or removes dishes in `/admin`.
- Reservation form with server-side validation and spam limiting; the owner confirms, cancels or deletes bookings in `/admin`.
- Admin sessions are signed tokens that expire after 8 hours.

## Before handover
Add real photos to `public/`, item prices and the cafe's opening time, and connect the customer's domain.
