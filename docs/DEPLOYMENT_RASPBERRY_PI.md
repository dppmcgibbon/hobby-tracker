# Deploying Hobby Tracker to a Raspberry Pi

This guide covers deploying the **Next.js app** to a Raspberry Pi while using **Supabase Cloud** for the database (recommended). The app runs on the Pi; the database stays in Supabase.

---

## Prerequisites

### Raspberry Pi

- **Model:** Raspberry Pi 4 (2GB minimum, **4GB+ recommended**) or Raspberry Pi 5
- **OS:** Raspberry Pi OS (64-bit) — Bookworm or later
- **Network:** Pi connected to your network and reachable (e.g. `raspberrypi.local` or a static IP)
- **Optional:** Domain and SSL if you want HTTPS (e.g. Caddy with Let’s Encrypt)

### Supabase

- A [Supabase](https://supabase.com) project (free tier is fine)
- **Project URL** and **anon key** from: Supabase Dashboard → Project Settings → API
- **Service role key** from the same page (keep secret; used for admin/server actions)

### On your development machine (for Option B)

- Same repo, build artifacts, and a way to copy files to the Pi (e.g. `scp`, `rsync`, or USB)

---

## 1. Prepare the Pi

### 1.1 Update the system

```bash
sudo apt update && sudo apt upgrade -y
```

### 1.2 Install Node.js 18+ (LTS)

Using NodeSource (recommended for a recent LTS):

```bash
# One-time setup for NodeSource
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verify
node -v   # e.g. v20.x.x
npm -v    # e.g. 10.x.x
```

Or install from Raspberry Pi OS packages (may be older):

```bash
sudo apt install -y nodejs npm
```

### 1.3 Create an app user (recommended)

Running as a dedicated user keeps things tidy and secure:

```bash
sudo useradd -m -s /bin/bash hobbytracker
sudo usermod -aG sudo hobbytracker   # optional, for sudo during setup
```

Switch to that user for the rest of the setup (or use `sudo -u hobbytracker`):

```bash
sudo su - hobbytracker
```

---

## 2. Get the app onto the Pi

Choose **Option A** (build on the Pi) or **Option B** (build elsewhere and copy). Option B is faster and less demanding on the Pi.

### Option A: Clone and build on the Pi

```bash
cd ~
git clone https://github.com/YOUR_USER/hobby-tracker.git
cd hobby-tracker

npm ci
npm run build
```

- Replace the clone URL with your repo (HTTPS or SSH).
- First build can take several minutes on a Pi; later builds are quicker.

### Option B: Build elsewhere and copy to the Pi

**On your development machine:**

```bash
# In your hobby-tracker repo
npm ci
npm run build
```

Then copy the whole project to the Pi (replace `pi` and path with your Pi user and directory):

```bash
rsync -avz --exclude 'node_modules' --exclude '.git' \
  ./ hobbytracker@raspberrypi.local:/home/hobbytracker/hobby-tracker/
```

**On the Pi:**

```bash
cd /home/hobbytracker/hobby-tracker
npm ci --omit=dev
```

- `--omit=dev` installs only production dependencies (smaller, faster).
- Do **not** run `npm run build` again if you already copied the `.next` folder.

---

## 3. Environment configuration

Create the production env file on the Pi. Use your **Supabase Cloud** values (not local dev).

```bash
cd /home/hobbytracker/hobby-tracker
nano .env.local
```

Paste and fill in (no quotes around values):

```env
# Supabase (from Supabase Dashboard → Project Settings → API)
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJ...your_anon_key
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJ...your_service_role_key

# App URL (how users reach the app)
NEXT_PUBLIC_APP_URL=http://raspberrypi.local:3000
```

- **NEXT_PUBLIC_SUPABASE_URL:** Project URL (e.g. `https://abcdefgh.supabase.co`).
- **NEXT_PUBLIC_SUPABASE_ANON_KEY:** `anon` public key.
- **SUPABASE_SERVICE_ROLE_KEY:** `service_role` key (secret; never expose to the browser).
- **NEXT_PUBLIC_APP_URL:** Base URL of the app. Examples:
  - Same Pi, port 3000: `http://raspberrypi.local:3000` or `http://192.168.1.100:3000`
  - Behind a reverse proxy with a hostname: `https://hobby.yourdomain.com`

Save and exit (`Ctrl+O`, `Enter`, `Ctrl+X`). Restrict permissions:

```bash
chmod 600 .env.local
```

---

## 4. Run the app with systemd

Running under systemd keeps the app up after reboot and allows clean start/stop/logs.

### 4.1 Create the service file

```bash
sudo nano /etc/systemd/system/hobby-tracker.service
```

Paste (adjust `User`, `WorkingDirectory`, and `ExecStart` if your paths differ):

```ini
[Unit]
Description=Hobby Tracker Next.js App
After=network.target

[Service]
Type=simple
User=hobbytracker
WorkingDirectory=/home/hobbytracker/hobby-tracker
ExecStart=/usr/bin/node node_modules/next/dist/bin/next start -H 0.0.0.0 -p 3000
Restart=on-failure
RestartSec=10
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

- `-H 0.0.0.0` binds to all interfaces so the app is reachable from other devices.
- If Node is installed via nvm or elsewhere, use the full path from `which node`.

Save and exit.

### 4.2 Enable and start the service

```bash
sudo systemctl daemon-reload
sudo systemctl enable hobby-tracker
sudo systemctl start hobby-tracker
sudo systemctl status hobby-tracker
```

You should see `active (running)`. Open `http://raspberrypi.local:3000` (or your Pi’s IP) in a browser.

### 4.3 Useful commands

```bash
sudo systemctl stop hobby-tracker    # stop
sudo systemctl start hobby-tracker   # start
sudo systemctl restart hobby-tracker # restart after code/env changes
sudo journalctl -u hobby-tracker -f   # follow logs
```

---

## 5. Reverse proxy (optional but recommended)

A reverse proxy in front of the app lets you:

- Use a hostname (e.g. `hobby.local` or `hobby.yourdomain.com`)
- Add HTTPS with Let’s Encrypt (e.g. with Caddy)
- Run the app on a non-privileged port and proxy from 80/443

### 5.1 Using Caddy (simple HTTPS)

Install Caddy:

```bash
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update
sudo apt install caddy

sudo systemctl enable caddy
sudo systemctl start caddy
```

**Local hostname only (no SSL):** create a Caddyfile:

```bash
sudo nano /etc/caddy/Caddyfile
```

Example (replace with your hostname or IP):

```
http://hobby.local, http://raspberrypi.local {
    reverse_proxy localhost:3000
}
```

Then:

```bash
sudo systemctl reload caddy
```

**Public hostname with HTTPS:** point a DNS A record to your Pi’s IP, then:

```
hobby.yourdomain.com {
    reverse_proxy localhost:3000
}
```

Reload Caddy; it will obtain and renew a certificate automatically.

### 5.2 Using Nginx (no automatic HTTPS)

```bash
sudo apt install -y nginx
sudo nano /etc/nginx/sites-available/hobby-tracker
```

Example:

```nginx
server {
    listen 80;
    server_name hobby.local raspberrypi.local;
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable and reload:

```bash
sudo ln -s /etc/nginx/sites-available/hobby-tracker /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

If you use a reverse proxy, set **NEXT_PUBLIC_APP_URL** in `.env.local` to the public URL (e.g. `https://hobby.yourdomain.com` or `http://hobby.local`) and restart the app:

```bash
sudo systemctl restart hobby-tracker
```

---

## 6. Deploying updates

After pulling new code or copying a new build:

**If you build on the Pi:**

```bash
cd /home/hobbytracker/hobby-tracker
git pull
npm ci
npm run build
sudo systemctl restart hobby-tracker
```

**If you build elsewhere:**

On your machine: build, then sync (excluding `node_modules` and `.git`). On the Pi:

```bash
cd /home/hobbytracker/hobby-tracker
npm ci --omit=dev
sudo systemctl restart hobby-tracker
```

---

## 7. Troubleshooting

### App won’t start

- Check logs: `sudo journalctl -u hobby-tracker -n 100 --no-pager`
- Confirm `.env.local` exists and has the correct Supabase URL and keys.
- Confirm Node version: `node -v` (18.17+ required).

### “Cannot find module” or build errors

- Run `npm ci` (or `npm ci --omit=dev` if you only run the built app).
- If you use Option B, ensure the `.next` folder was copied.

### Can’t reach the app from another device

- App must listen on `0.0.0.0` (see `-H 0.0.0.0` in the systemd unit).
- Check firewall: `sudo ufw status`; if enabled, allow port 3000 (and 80/443 if using a proxy).

### Supabase errors (auth, RLS, or API)

- Confirm Supabase project is running and URL/keys match the project.
- In Supabase Dashboard, check Authentication → URL Configuration: add your app URL (e.g. `http://raspberrypi.local:3000` or your domain) to “Site URL” and “Redirect URLs” if you use email magic links or OAuth.

---

## 8. Optional: Run with Docker on the Pi

If you prefer to run the app in a container on the Pi:

1. Install Docker on the Pi:  
   https://docs.docker.com/engine/install/debian/#install-using-the-convenience-script  

2. Add a `Dockerfile` in the repo root (multi-stage, so the image stays smaller):

```dockerfile
# Build stage
FROM node:20-bookworm-slim AS builder
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci
COPY . .
RUN npm run build

# Run stage
FROM node:20-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
EXPOSE 3000
CMD ["node", "node_modules/next/dist/bin/next", "start", "-H", "0.0.0.0", "-p", "3000"]
```

3. Build and run (mount env file so you don’t bake secrets into the image):

```bash
cd /home/hobbytracker/hobby-tracker
docker build -t hobby-tracker .
docker run -d --name hobby-tracker -p 3000:3000 --env-file .env.local --restart unless-stopped hobby-tracker
```

Use your **Supabase Cloud** values in `.env.local` as in step 3. The database stays in Supabase; only the app runs in Docker on the Pi.

---

## Summary

| Step | Action |
|------|--------|
| 1 | Pi: install Node 18+, optional app user |
| 2 | Get app on Pi: clone + build (A) or build elsewhere + rsync (B) |
| 3 | Create `.env.local` with Supabase Cloud URL and keys, set `NEXT_PUBLIC_APP_URL` |
| 4 | Install systemd unit, enable and start `hobby-tracker` |
| 5 | Optional: Caddy or Nginx reverse proxy, then set `NEXT_PUBLIC_APP_URL` to the public URL |
| 6 | Updates: pull/build or rsync, then `systemctl restart hobby-tracker` |

Database: use **Supabase Cloud** only; no database is installed or run on the Pi.
