# Cloudflare R2 Storage & CORS Setup

Hobby Tracker uses Cloudflare R2 for storing miniature photos and backups. Direct client-to-R2 uploads (using S3 presigned URLs) allow uploading high-resolution photos without hitting serverless function payload limits (e.g. Vercel's 4.5MB limit).

For direct browser uploads to work, **CORS must be enabled on your Cloudflare R2 bucket**.

---

## The Error: `Preflight response is not successful. Status code: 403`

When the browser uploads directly to R2 via `PUT`, it first sends an HTTP `OPTIONS` preflight request. If CORS is not enabled on the bucket, Cloudflare R2 returns:
```xml
<Error>
  <Code>Unauthorized</Code>
  <Message>CORS not configured for this bucket</Message>
</Error>
```

---

## How to Configure CORS on Cloudflare R2

### Option 1: Cloudflare Dashboard (Recommended — 1 minute)

1. Go to the [Cloudflare Dashboard](https://dash.cloudflare.com/).
2. On the left sidebar, navigate to **R2** (or **Storage & Databases** → **R2**).
3. Under **Buckets**, select `hobby-tracker-photos` (or your configured bucket name).
4. Click the **Settings** tab.
5. Scroll down to the **CORS Policy** section and click **Add CORS policy** (or Edit).
6. Paste the following JSON:

```json
[
  {
    "AllowedOrigins": [
      "*"
    ],
    "AllowedMethods": [
      "GET",
      "PUT",
      "POST",
      "DELETE",
      "HEAD"
    ],
    "AllowedHeaders": [
      "*"
    ],
    "ExposeHeaders": [
      "ETag"
    ],
    "MaxAgeSeconds": 3600
  }
]
```

> **Note on Origins**: You can keep `"*"` or restrict it to your production domain (e.g. `https://your-domain.com`, `https://*.vercel.app`, and `http://localhost:3000`).

7. Click **Save**. CORS changes take effect immediately.

---

### Option 2: Wrangler CLI

If you have Wrangler with an account token:

```bash
npx wrangler r2 bucket cors set hobby-tracker-photos ./r2-cors.json
```
