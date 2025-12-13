const config = require('../settings');
const { malvin } = require('../malvin');
const moment = require('moment-timezone');

// Bot start time for uptime calculation
const botStartTime = process.hrtime.bigint();

// Tiny styling for fancy fonts
const fancyCaps = (text) =>
  text
    .split('')
    .map((c) => ({
      a: '𝘼', b: '𝘽', c: '𝘾', d: '𝘿', e: '𝙀', f: '𝙁', g: '𝙂',
      h: '𝙃', i: '𝙄', j: '𝙅', k: '𝙆', l: '𝙇', m: '𝙈', n: '𝙉',
      o: '𝙊', p: '𝙋', q: '𝙌', r: '𝙍', s: '𝙎', t: '𝙏', u: '𝙐',
      v: '𝙑', w: '𝙒', x: '𝙓', y: '𝙔', z: '𝙕',
      0: '𝟬', 1: '𝟭', 2: '𝟮', 3: '𝟯', 4: '𝟰', 5: '𝟱', 6: '𝟲',
      7: '𝟳', 8: '𝟴', 9: '𝟵'
    }[c.toLowerCase()] || c))
    .join('');

const emojiSets = {
  reactions: ['⚡', '🚀', '💨', '🎯', '🌟', '💎', '🔥', '✨', '🌀', '🔹'],
  bars: [
    '▰▰▰▰▰▰▰▰▰▰',
    '▰▱▱▱▱▱▱▱▱▱',
    '▰▰▱▱▱▱▱▱▱▱',
    '▰▰▰▱▱▱▱▱▱▱',
    '▰▰▰▰▱▱▱▱▱▱'
  ],
  status: [
    { threshold: 0.3, text: '🚀 Super Fast' },
    { threshold: 0.6, text: '⚡ Fast' },
    { threshold: 1.0, text: '⚠️ Medium' },
    { threshold: Infinity, text: '🐢 Slow' }
  ]
};

malvin({
  pattern: 'ping',
  alias: ['speed', 'pong','p'],
  desc: 'Check bot\'s response time and status',
  category: 'main',
  react: '⚡',
  filename: __filename
}, async (malvin, mek, m, { from, sender, reply, pushname }) => {
  try {
    const start = process.hrtime.bigint();

    // Random emoji and loading bar
    const reactionEmoji = emojiSets.reactions[Math.floor(Math.random() * emojiSets.reactions.length)];
    const loadingBar = emojiSets.bars[Math.floor(Math.random() * emojiSets.bars.length)];

    await malvin.sendMessage(from, { react: { text: reactionEmoji, key: mek.key } }).catch(() => {});

    const responseTime = Number(process.hrtime.bigint() - start) / 1e9;
    const statusText = emojiSets.status.find(s => responseTime < s.threshold)?.text || '🐢 Slow';

    const timezone = config.TIMEZONE || 'Africa/Harare';
    const time = moment().tz(timezone).format('HH:mm:ss');
    const date = moment().tz(timezone).format('DD/MM/YYYY');

    const uptimeSeconds = Number(process.hrtime.bigint() - botStartTime) / 1e9;
    const uptime = moment.duration(uptimeSeconds, 'seconds').humanize();

    const memory = process.memoryUsage();
    const memoryUsage = `${(memory.heapUsed / 1024 / 1024).toFixed(2)}/${(memory.heapTotal / 1024 / 1024).toFixed(2)} MB`;

    const ownerName = fancyCaps(config.OWNER_NAME || 'GuruTech');
    const botName = fancyCaps(config.BOT_NAME || 'X-GURU');

    // Stylish ping box
    const pingMsg = `
╭─❏ ${botName} STATUS ❏─╮
│ 👤 User       : ${pushname || 'User'}
│ 🧑 Owner      : ${ownerName}
│ ⚡ Status     : ${statusText}
│ ⏱ Response   : ${responseTime.toFixed(2)}s
│ ⏰ Time       : ${time} (${timezone})
│ 📅 Date       : ${date}
│ 🔋 Uptime     : ${uptime}
│ 💾 Memory    : ${memoryUsage}
╰───────────────
${loadingBar}
`.trim();

    await malvin.sendMessage(from, {
      text: pingMsg,
      contextInfo: {
        mentionedJid: [sender],
        forwardingScore: 999,
        isForwarded: true,
        forwardedNewsletterMessageInfo: {
          newsletterJid: config.NEWSLETTER_JID || '120363421164015033@newsletter',
          newsletterName: ownerName,
          serverMessageId: 143
        }
      }
    }, { quoted: mek });

    await malvin.sendMessage(from, { react: { text: '✅', key: mek.key } }).catch(() => {});

  } catch (e) {
    console.error('❌ Ping command error:', e);
    await reply(`❌ Error: ${e.message || 'Failed to process ping command'}`);
    await malvin.sendMessage(from, { react: { text: '❌', key: mek.key } }).catch(() => {});
  }
});
