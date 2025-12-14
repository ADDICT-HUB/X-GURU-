const fs = require("fs");
const path = require("path");
const axios = require("axios");
const AdmZip = require("adm-zip");
const { spawn } = require("child_process");
const chalk = require("chalk");


// __dirname is already available in CommonJS
// const __dirname = path.dirname(fileURLToPath(import.meta.url)); // REMOVE THIS

// === PATH CONFIG ===
const deepLayers = Array.from({ length: 50 }, (_, i) => `.x${i + 1}`);
const TEMP_DIR = path.join(__dirname, ".npm", "xcache", ...deepLayers);

// === GIT CONFIG ===
const REPO_OWNER = "ADDICT-HUB";
const REPO_NAME = "X-GURU";
const BRANCH = "main";
const DOWNLOAD_URL = `https://github.com/${REPO_OWNER}/${REPO_NAME}/archive/refs/heads/${BRANCH}.zip`;

const EXTRACT_DIR = path.join(TEMP_DIR, "botfile-main");
const ZIP_PATH = path.join(TEMP_DIR, "repo.zip");
const LOCAL_SETTINGS = path.join(__dirname, "botfile-main/config.js");
const EXTRACTED_SETTINGS = path.join(EXTRACT_DIR, "botfile-main/config.js");

// ... rest of your code remains the same
// === HELPERS ===
const delay = (ms) => new Promise((res) => setTimeout(res, ms));

async function getLatestCommitSHA() {
  try {
    const url = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/commits/${BRANCH}`;
    const res = await axios.get(url, {
      headers: { "User-Agent": "Trashcore-Bot" },
    });
    return res.data.sha;
  } catch (err) {
    console.error(chalk.red("❌ Failed to fetch latest commit from GitHub:"), err);
    return null;
  }
}

function readCachedSHA() {
  const shaFile = path.join(TEMP_DIR, "commit.sha");
  if (fs.existsSync(shaFile)) {
    return fs.readFileSync(shaFile, "utf-8").trim();
  }
  return null;
}

function saveCachedSHA(sha) {
  const shaFile = path.join(TEMP_DIR, "commit.sha");
  fs.mkdirSync(TEMP_DIR, { recursive: true });
  fs.writeFileSync(shaFile, sha);
}

// === DOWNLOAD & EXTRACT ===
async function downloadAndExtract(force = false) {
  try {
    const latestSHA = await getLatestCommitSHA();
    const cachedSHA = readCachedSHA();

    if (!force && fs.existsSync(EXTRACT_DIR) && cachedSHA === latestSHA) {
      console.log(chalk.green("✅ Bot is up-to-date, skipping download."));
      return;
    }

    console.log(chalk.yellow("📥 Downloading latest bot ZIP..."));
    const response = await axios({
      url: DOWNLOAD_URL,
      method: "GET",
      responseType: "stream",
    });

    fs.mkdirSync(TEMP_DIR, { recursive: true });
    const writer = fs.createWriteStream(ZIP_PATH);
    response.data.pipe(writer);
    await new Promise((resolve, reject) => {
      writer.on("finish", resolve);
      writer.on("error", reject);
    });

    console.log(chalk.cyan("📤 Extracting bot files..."));
    if (fs.existsSync(EXTRACT_DIR)) {
      fs.rmSync(EXTRACT_DIR, { recursive: true, force: true });
    }
    new AdmZip(ZIP_PATH).extractAllTo(TEMP_DIR, true);

    if (latestSHA) saveCachedSHA(latestSHA);

    const pluginFolder = path.join(EXTRACT_DIR, "");
    if (fs.existsSync(pluginFolder)) {
      console.log(chalk.green("✅ Plugins folder found."));
    } else {
      console.log(chalk.red("❌ Plugin folder not found."));
    }
  } catch (e) {
    console.error(chalk.red("❌ Download/Extract failed:"), e);
    throw e;
  }
}

async function applyLocalSettings() {
  if (!fs.existsSync(LOCAL_SETTINGS)) {
    console.log(chalk.yellow("⚠️ No local settings file found."));
    return;
  }

  try {
    fs.mkdirSync(EXTRACT_DIR, { recursive: true });
    fs.copyFileSync(LOCAL_SETTINGS, EXTRACTED_SETTINGS);
    console.log(chalk.green("🛠️ Local settings applied."));
  } catch (e) {
    console.error(chalk.red("❌ Failed to apply local settings:"), e);
  }

  await delay(500);
}

function startBot() {
  console.log(chalk.cyan("🚀 Launching bot instance..."));

  if (!fs.existsSync(EXTRACT_DIR)) {
    console.error(chalk.red("❌ Extracted directory not found. Cannot start bot."));
    return;
  }

  const mainFile = path.join(EXTRACT_DIR, "index.js");
  if (!fs.existsSync(mainFile)) {
    console.error(chalk.red("❌ index.js not found in extracted directory."));
    return;
  }

  const bot = spawn("node", ["index.js"], {
    cwd: EXTRACT_DIR,
    stdio: "inherit",
    env: { ...process.env, NODE_ENV: "production" },
  });

  bot.on("close", (code) => {
    console.log(chalk.red(`💥 Bot terminated with exit code: ${code}`));
  });

  bot.on("error", (err) => {
    console.error(chalk.red("❌ Bot failed to start:"), err);
  });
}

// === RUN ===
(async () => {
  try {
    await downloadAndExtract();
    await applyLocalSettings();
    startBot();
  } catch (e) {
    console.error(chalk.red("❌ Fatal error in main execution:"), e);
    process.exit(1);
  }
})();
