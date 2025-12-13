const config = require('../settings');
const { malvin } = require('../malvin');
const moment = require('moment-timezone');

// Bot start time for uptime calculation
const botStartTime = process.hrtime.bigint();

// Cache for timezone formatting
const formatCache = new Map();

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
}, async (malvin, mek, m, { from, sender, reply }) => {
    try {
        const prefix = config.PREFIX || '.';
        const ownerName = config.OWNER_NAME || 'GuruTech';
        const botName = config.BOT_NAME || 'X-GURU';
        const repoLink = config.REPO || 'https://github.com/ADDICT-HUB/X-GURU';
        const timezone = config.TIMEZONE || 'Africa/Harare';

        // High-resolution start time
        const start = process.hrtime.bigint();

        // Animate "alive" loading bar for live feel
        const loadingFrames = ['▰▱▱▱▱▱▱▱▱▱','▰▰▱▱▱▱▱▱▱▱','▰▰▰▱▱▱▱▱▱▱','▰▰▰▰▱▱▱▱▱▱','▰▰▰▰▰▱▱▱▱▱'];
        let frameIndex = 0;

        // React with emoji (with retry)
        const reactionEmoji = emojiSets.reactions[Math.floor(Math.random() * emojiSets.reactions.length)];
        let attempts = 0;
        const maxAttempts = 2;
        while (attempts < maxAttempts) {
            try {
                await malvin.sendMessage(from, { react: { text: reactionEmoji, key: mek.key } });
                break;
            } catch (reactError) {
                attempts++;
                if (attempts === maxAttempts) throw new Error('Failed to send reaction');
            }
        }

        // Animate 3 frames to make speed/time feel alive
        let finalMessageId;
        for (let i = 0; i < 3; i++) {
            const loadingBar = loadingFrames[frameIndex % loadingFrames.length];
            frameIndex++;

            // Time info (cache formatting for performance)
            const cacheKey = `${timezone}:${moment().format('YYYY-MM-DD HH:mm:ss')}`;
            let time, date;
            if (formatCache.has(cacheKey)) {
                ({ time, date } = formatCache.get(cacheKey));
            } else {
                time = moment().tz(timezone).format('HH:mm:ss');
                date = moment().tz(timezone).format('DD/MM/YYYY');
                formatCache.set(cacheKey, { time, date });
                if (formatCache.size > 100) formatCache.clear();
            }

            // Calculate response time
            const responseTime = Number(process.hrtime.bigint() - start) / 1e9;
            const statusText = emojiSets.status.find(s => responseTime < s.threshold)?.text || '🐢 Slow';

            // Uptime
            const uptimeSeconds = Number(process.hrtime.bigint() - botStartTime) / 1e9;
            const uptime = moment.duration(uptimeSeconds, 'seconds').humanize();

            // Memory usage
            const memory = process.memoryUsage();
            const memoryUsage = `${(memory.heapUsed / 1024 / 1024).toFixed(2)}/${(memory.heapTotal / 1024 / 1024).toFixed(2)} MB`;

            const pingMsg = `
*${statusText}*

⚡ \`Response Time:\` ${responseTime.toFixed(2)}s
⏰ \`Time:\` ${time} (${timezone})
📅 \`Date:\` ${date}
⏱️ \`Uptime:\` ${uptime}
💾 \`Memory Usage:\` ${memoryUsage}
🖥️ \`Node Version:\` ${process.version}

💻 \`Developer:\` ${ownerName}
🤖 \`Bot Name:\` ${botName}

🌟 Don't forget to *star* & *fork* the repo!
🔗 ${repoLink}

Loading: ${loadingBar}
`.trim();

            if (!finalMessageId) {
                const sent = await malvin.sendMessage(from, {
                    text: pingMsg,
                    contextInfo: {
                        mentionedJid: [sender],
                        forwardingScore: 999,
                        isForwarded: true,
                        forwardedNewsletterMessageInfo: {
                            newsletterJid: '120363421164015033@newsletter',
                            newsletterName: ownerName,
                            serverMessageId: 143
                        }
                    }
                }, { quoted: mek });
                finalMessageId = sent.key;
            } else {
                await malvin.editMessage(from, finalMessageId, { text: pingMsg });
            }

            await new Promise(res => setTimeout(res, 800));
        }

        // Success reaction
        await malvin.sendMessage(from, { react: { text: '✅', key: mek.key } });

    } catch (e) {
        console.error('❌ Ping command error:', e);
        await reply(`❌ Error: ${e.message || 'Failed to process ping command'}`);
        await malvin.sendMessage(from, { react: { text: '❌', key: mek.key } });
    }
});
