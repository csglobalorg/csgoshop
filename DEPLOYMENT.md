# 🚀 CSGO SHOP — Automated Deployment Guide (GitHub Actions → Namecheap cPanel)

This document outlines the setup, secrets configuration, deployment workflow, and maintenance for **CSGO SHOP**.

---

## 📌 Architecture Overview

Whenever you push commits to the `main` branch on GitHub (or trigger the workflow manually), GitHub Actions will automatically:

```
+-------------------------------------------------------------+
| 1. Code pushed to GitHub (main branch)                      |
+-------------------------------------------------------------+
                               |
                               v
+-------------------------------------------------------------+
| 2. GitHub Actions runner spins up (Ubuntu + Node.js 20)     |
+-------------------------------------------------------------+
                               |
                               v
+-------------------------------------------------------------+
| 3. Clean dependency install (`npm ci`)                      |
+-------------------------------------------------------------+
                               |
                               v
+-------------------------------------------------------------+
| 4. Production build compiled (`npm run build` -> `dist/`)   |
+-------------------------------------------------------------+
                               |
                               v
+-------------------------------------------------------------+
| 5. Automated FTP/FTPS deployment to Namecheap cPanel        |
|    Target: public_html/                                     |
+-------------------------------------------------------------+
                               |
                               v
+-------------------------------------------------------------+
| 6. Live CSGO SHOP website updated automatically 🎉          |
+-------------------------------------------------------------+
```

---

## 🔐 Step 1: Configure GitHub Repository Secrets

To allow GitHub Actions to safely connect to your Namecheap cPanel without exposing passwords, add the following secrets to your GitHub repository:

1. Open your GitHub Repository Secrets page directly:
   👉 **[https://github.com/csglobalorg/csgoshop/settings/secrets/actions](https://github.com/csglobalorg/csgoshop/settings/secrets/actions)**
2. Click **New repository secret** for each of the following:

| Secret Name | Description | Example / Typical Value |
| :--- | :--- | :--- |
| `CPANEL_HOST` | FTP Server Hostname or Server IP | `ftp.yourdomain.com` or `premiumXXX.web-hosting.com` or server IP |
| `CPANEL_USERNAME` | cPanel or FTP Username | `yourcpaneluser` or `deployer@yourdomain.com` |
| `CPANEL_PASSWORD` | cPanel or FTP Password | Your strong cPanel/FTP password |
| `CPANEL_PORT` *(optional)* | FTP Port (Default is 21) | `21` |
| `CPANEL_DIR` *(optional)* | Destination Directory on Host | `public_html/` |
| `CPANEL_PROTOCOL` *(optional)* | Transfer protocol (`ftps` or `ftp`) | `ftps` |

> ⚠️ **Important:** If your FTP account is created specifically with its home directory set directly to `public_html/`, set `CPANEL_DIR` to `/` or leave the default `public_html/` if using the main cPanel account.

---

## 🛠️ Step 2: Namecheap cPanel Configuration

### Option A: Use Primary cPanel Credentials (Easiest)
- **Hostname (`CPANEL_HOST`)**: Look at your Namecheap Hosting Welcome Email for the **Server Hostname** (e.g., `premium245.web-hosting.com`) or use your server IP / domain (`ftp.yourdomain.com`).
- **Username (`CPANEL_USERNAME`)**: Your main cPanel username.
- **Password (`CPANEL_PASSWORD`)**: Your main cPanel password.
- **Target Dir (`CPANEL_DIR`)**: `public_html/`

### Option B: Create a Dedicated FTP Account (Recommended for Security)
1. Log into your **cPanel**.
2. Under the **Files** section, click **FTP Accounts**.
3. Fill in:
   - **Log in**: `github-deploy`
   - **Domain**: Choose your domain
   - **Password**: Generate a strong password
   - **Directory**: Set to `public_html` (Make sure it points to `public_html`, not `public_html/github-deploy`)
4. Click **Create FTP Account**.
5. When using a dedicated FTP account:
   - `CPANEL_USERNAME`: `github-deploy@yourdomain.com`
   - `CPANEL_PASSWORD`: The password you generated
   - `CPANEL_DIR`: `/` (since the FTP account root is already `public_html`)

---

## 🚀 Step 3: Triggering Your First Deployment

### Via Git Push:
Run the following commands in your terminal:
```bash
git add .
git commit -m "Configure automated CI/CD pipeline for Namecheap cPanel"
git push origin main
```

### Via GitHub Actions Manual Trigger:
1. Go to the **Actions** tab in your GitHub repository.
2. Select the **Deploy CSGO SHOP to Namecheap cPanel** workflow on the left sidebar.
3. Click the **Run workflow** dropdown button, select branch `main`, and click **Run workflow**.

---

## 🔍 Step 4: Monitoring and Checking Status

1. Go to **Actions** tab in GitHub.
2. Click on the running workflow run.
3. You can expand the logs for each step:
   - `Set up Node.js`
   - `Install dependencies`
   - `Build production package`
   - `Verify build artifacts`
   - `Deploy to Namecheap cPanel via FTPS / FTP`
4. When finished, a green checkmark indicating **Success** will appear.

---

## 🌐 SPA Routing & Apache Rewrite Rules

Single Page Application (SPA) routing is handled by `public/.htaccess` (automatically copied to `dist/.htaccess` during build).

This ensures that:
- Direct visits to URLs like `/products`, `/product/123`, `/cart`, `/account`, `/orders` load the SPA properly without 404 errors.
- Existing physical assets (`.js`, `.css`, `.png`, `.webp`, `.svg`, `favicon.png`, `robots.txt`, `sitemap.xml`) and `api.php` load directly without interference.
- Gzip compression and browser caching headers are enabled for fast load times.

---

## 🔄 Rollback Procedure

If a bug is pushed to production, you can instantly roll back to any previous stable commit:

```bash
# 1. View your commit history
git log --oneline -n 5

# 2. Revert the problematic commit (replace <commit-hash> with the commit id)
git revert <commit-hash>

# 3. Push to main to trigger an automatic rebuild and redeployment of the stable version
git push origin main
```

---

## ❓ Troubleshooting

### 1. `530 Login incorrect` or `FTP connection refused`
- Double check `CPANEL_HOST`, `CPANEL_USERNAME`, and `CPANEL_PASSWORD` in GitHub Secrets.
- If using `ftp.yourdomain.com` fails, use your Namecheap server hostname (e.g. `premiumXXX.web-hosting.com`) or server IP found in cPanel on the right sidebar under **General Information** > **Shared IP Address**.
- If FTPS fails due to self-signed TLS certificates on cPanel, set `CPANEL_PROTOCOL` secret to `ftp`.

### 2. Website shows old content after deployment
- Clear your browser cache or perform a hard refresh (`Ctrl + F5` or `Cmd + Shift + R`).
- If you use Cloudflare or Namecheap CDN, purge the cache from your CDN dashboard.

### 3. `404 Not Found` on sub-routes
- Ensure `.htaccess` exists in `public_html/`. In cPanel File Manager, click **Settings** (top right) and ensure **Show Hidden Files (dotfiles)** is enabled.
