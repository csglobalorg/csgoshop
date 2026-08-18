import * as ftp from 'basic-ftp';
import dotenv from 'dotenv';
import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = resolve(__dirname, '..');

// Load environment variables from .env or .env.local
dotenv.config({ path: resolve(projectRoot, '.env') });
dotenv.config({ path: resolve(projectRoot, '.env.local') });

const host = process.env.CPANEL_HOST;
const user = process.env.CPANEL_USERNAME;
const password = process.env.CPANEL_PASSWORD;
const port = parseInt(process.env.CPANEL_PORT || '21', 10);
const remoteDir = process.env.CPANEL_DIR || 'public_html';
const secure = process.env.CPANEL_SECURE === 'true' || process.env.CPANEL_SECURE === undefined; // default true (FTPS)

async function deploy() {
  console.log('\n========================================');
  console.log('🚀 CSGO SHOP — 1-Click Deployment Script');
  console.log('========================================\n');

  if (!host || !user || !password) {
    console.error('❌ Missing credentials in .env file!');
    console.error('\nPlease create or edit your .env file with the following:');
    console.error('----------------------------------------');
    console.error('CPANEL_HOST=your-server-hostname-or-ip');
    console.error('CPANEL_USERNAME=your-cpanel-or-ftp-username');
    console.error('CPANEL_PASSWORD=your-cpanel-or-ftp-password');
    console.error('CPANEL_DIR=public_html');
    console.error('----------------------------------------\n');
    process.exit(1);
  }

  // 1. Build project
  console.log('📦 Step 1: Building production bundle (npm run build)...');
  try {
    execSync('npm run build', { cwd: projectRoot, stdio: 'inherit' });
  } catch (err) {
    console.error('\n❌ Build failed. Aborting deployment.');
    process.exit(1);
  }

  const distDir = resolve(projectRoot, 'dist');
  if (!existsSync(distDir)) {
    console.error('\n❌ dist directory does not exist! Aborting deployment.');
    process.exit(1);
  }

  // 2. Connect & Upload
  const client = new ftp.Client();
  client.ftp.verbose = true;

  try {
    console.log(`\n🔌 Step 2: Connecting to Namecheap cPanel FTP (${host})...`);
    
    try {
      await client.access({
        host: host,
        user: user,
        password: password,
        port: port,
        secure: secure,
        secureOptions: { rejectUnauthorized: false }
      });
    } catch (ftpsErr) {
      if (secure) {
        console.warn('⚠️ FTPS connection failed, falling back to standard FTP...');
        await client.access({
          host: host,
          user: user,
          password: password,
          port: port,
          secure: false
        });
      } else {
        throw ftpsErr;
      }
    }

    console.log(`\n📤 Step 3: Uploading dist/ files to Namecheap ${remoteDir}/ ...`);
    await client.ensureDir(remoteDir);
    await client.clearWorkingDir();
    await client.uploadFromDir(distDir);

    console.log('\n========================================');
    console.log('🎉 SUCCESS! CSGO SHOP has been deployed to Namecheap cPanel!');
    console.log('🌐 Visit your live website to see the changes.');
    console.log('========================================\n');
  } catch (err) {
    console.error('\n❌ Deployment failed:', err.message);
  } finally {
    client.close();
  }
}

deploy();
