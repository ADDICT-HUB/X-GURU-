const config = require('../settings');
const { malvin } = require('../malvin');
const moment = require('moment-timezone');
const os = require('os');

const botStartTime = process.hrtime.bigint();

malvin({
    pattern: 'ping',
    alias: ['speed', 'pong', 'p'],
    desc: 'Check bot\'s real-time response and status',
    category: 'main',
    react: '⚡',
    filename: __filename
}, async (malvin, mek, m, { from, sender, reply, pushname }) => {
    try {
        const ownerName = config.OWNER_NAME || 'GuruTech';
        const botName = config.BOT_NAME || 'X-GURU';
        const timezone = config.TIMEZONE || 'Africa/Harare';
        const newsletterJid = config.NEWSLETTER_JID || '120363421164015033@newsletter';

        // Start time
        const startTime = process.hrtime.bigint();

        // Uptime
        const uptimeSeconds = Number(process.hrtime.bigint() - botStartTime) / 1e9;
        const uptime = moment.duration(uptimeSeconds, 'seconds').humanize();

        // Current time & date
        const currentTime = moment().tz(timezone).format('HH:mm:ss');
        const currentDate = moment().tz(timezone).format('dddd, MMMM Do YYYY');

        // Memory usage
        const memory = process.memoryUsage();
        const memoryUsage = `${(memory.heapUsed / 1024 / 1024).toFixed(2)}/${(memory.heapTotal / 1024 / 1024).toFixed(2)} MB`;

        // Response time
        const responseTime = Number(process.hrtime.bigint() - startTime) / 1e9;

        // Status text
        let statusText;
        if (responseTime < 0.3) statusText = 'Super Fast';
        else if (responseTime < 0.6) statusText = 'Fast';
        else if (responseTime < 1) statusText = 'Medium';
        else statusText = 'Slow';

        // Compose message
        const pingMsg = `
╭───〔 ${botName} Status 〕───
│ User         : ${pushname || 'User'}
│ Owner        : ${ownerName}
│ Status       : ${statusText}
│ Response     : ${responseTime.toFixed(2)}s
│ Time         : ${currentTime} (${timezone})
│ Date         : ${currentDate}
│ Uptime       : ${uptime}
│ Memory Usage : ${memoryUsage}
╰───────────────────────
> Everything is live and real-time!
        `.trim();

        // Send message with newsletter design
        await malvin.sendMessage(from, {
            text: pingMsg,
            contextInfo: {
                mentionedJid: [sender],
                forwardingScore: 999,
                isForwarded: true,
                forwardedNewsletterMessageInfo: {
                    newsletterJid,
                    newsletterName: ownerName,
                    serverMessageId: 143
                }
            }
        }, { quoted: mek });

    } catch (err) {
        console.error('❌ Ping command error:', err);
        await reply(`❌ Error: ${err.message || 'Failed to process ping command'}`);
    }
});
