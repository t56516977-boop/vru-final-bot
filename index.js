require('dotenv').config();
const fs = require('fs');
const http = require('http');
const { Client, GatewayIntentBits, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildMessages] });
const DB_PATH = './database.json';
const EXCLUDE_ROLE = '1447718423390847178'; 
const ALLOWED_ROLES = ['1447679308050071623', '1476850285950402590', '1383809507251191830', '1383809217701613588', '1448618012176416872', '1448586089840377897', '1383809053813379103'];

function loadDB() {
    if (!fs.existsSync(DB_PATH)) fs.writeFileSync(DB_PATH, JSON.stringify({ users: {}, logs: [] }, null, 2));
    let data = JSON.parse(fs.readFileSync(DB_PATH));
    if (!data.logs) data.logs = [];
    if (!data.users) data.users = {};
    return data;
}
function saveDB(data) { fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2)); }
function addLog(action) {
    const db = loadDB();
    db.logs.push({ action, time: Date.now() });
    if (db.logs.length > 100) db.logs.shift();
    saveDB(db);
}

const getKyivDate = () => new Date().toLocaleString('uk-UA', { timeZone: 'Europe/Kyiv' });

client.on('interactionCreate', async (i) => {
    if (!i.isChatInputCommand()) return;

    // 1. ПЕРЕВІРКА ПРАВ ОДРАЗУ
    const hasAccess = i.member.permissions.has(PermissionFlagsBits.Administrator) || i.member.roles.cache.some(r => ALLOWED_ROLES.includes(r.id));
    if (!hasAccess) return i.reply({ content: '❌ **ВІДМОВА В ДОСТУПІ.**', ephemeral: true });

    // 2. БРОНЮЄМО ВІДПОВІДЬ (Ліки від помилки InteractionNotReplied)
    await i.deferReply().catch(() => {});

    const db = loadDB();
    const { commandName, options, guild, user: admin } = i;
    const timestamp = `📅 ${getKyivDate()}`;

    // --- 🗳️ ГОЛОСУВАННЯ ---
    if (commandName === 'голосування') {
        const q = options.getString('питання');
        const embed = new EmbedBuilder().setColor('#3498DB').setTitle('🗳️ ОФІЦІЙНЕ ГОЛОСУВАННЯ ВРУ').setDescription(`**Питання на порядку денному:**\n> ${q}`).addFields({ name: '👤 Ініціатор', value: `${admin}` }).setFooter({ text: timestamp });
        const msg = await i.editReply({ embeds: [embed] });
        await msg.react('✅'); await msg.react('❌');
        return;
    }

    // --- 📂 ДОСЬЄ ---
    if (commandName === 'досьє') {
        const target = options.getUser('користувач');
        const warns = db.users[target.id]?.warns || 0;
        const embed = new EmbedBuilder().setColor('#0057B7').setTitle('📂 ОФІЦІЙНЕ ДОСЬЄ').setThumbnail(target.displayAvatarURL()).addFields({ name: '👤 Працівник', value: `${target}`, inline: true }, { name: '⚠️ Догани', value: `\`${warns}/3\``, inline: true }).setFooter({ text: 'База даних ВРУ' });
        return i.editReply({ embeds: [embed] });
    }

    // --- 📜 ЗАКОН / НАКАЗ ---
    if (commandName === 'закон' || commandName === 'наказ') {
        const text = options.getString('текст');
        const isLaw = commandName === 'закон';
        const embed = new EmbedBuilder().setColor(isLaw ? '#0057B7' : '#2C3E50').setTitle(isLaw ? '📜 НОВА ПОСТАНОВА ВРУ' : '🎖️ ПРЯМИЙ НАКАЗ КЕРІВНИЦТВА').setDescription(`**Зміст документу:**\n\n${text}`).addFields({ name: '✍️ Підписав', value: `${admin}` }).setFooter({ text: timestamp });
        addLog(`Видано ${commandName}: ${text.substring(0, 20)}...`);
        return i.editReply({ embeds: [embed] });
    }

    // --- ❌ ЗВІЛЬНИТИ ---
    if (commandName === 'звільнити') {
        const target = options.getMember('користувач');
        const rolesToRemove = target.roles.cache.filter(r => r.id !== guild.id && r.id !== EXCLUDE_ROLE);
        await target.roles.remove(rolesToRemove).catch(() => {});
        const embed = new EmbedBuilder().setColor('#000000').setTitle('📑 НАКАЗ ПРО ЗВІЛЬНЕННЯ').setDescription(`Співробітника ${target} звільнено з посади.`).addFields({ name: '✍️ Підписав', value: `${admin}` });
        addLog(`Звільнено: ${target.user.username}`);
        return i.editReply({ content: `${target}`, embeds: [embed] });
    }

    // --- ✅ ЗНЯТИ ДОГАНУ ---
    if (commandName === 'зняти_догану') {
        const targetUser = options.getUser('користувач');
        const count = options.getInteger('кількість') || 1;
        if (!db.users[targetUser.id]) db.users[targetUser.id] = { warns: 0 };
        db.users[targetUser.id].warns = Math.max(0, db.users[targetUser.id].warns - count);
        saveDB(db);
        const embed = new EmbedBuilder().setColor('#2ECC71').setTitle('✅ АНУЛЮВАННЯ ДОГАНИ').setDescription(`З працівника ${targetUser} знято догани (${count} шт.).\nПоточний статус: \`${db.users[targetUser.id].warns}/3\``);
        return i.editReply({ embeds: [embed] });
    }

    // --- 📝 ПРИЙНЯТИ ---
    if (commandName === 'прийняти') {
        const target = options.getMember('користувач');
        const pos = options.getString('посада');
        const r1 = options.getRole('роль1'); if (r1) await target.roles.add(r1).catch(() => {});
        const embed = new EmbedBuilder().setColor('#27AE60').setTitle('📜 НАКАЗ ПРО ПРИЙНЯТТЯ').addFields({ name: '👤 Працівник', value: `${target}`, inline: true }, { name: '💼 Посада', value: `\`${pos}\``, inline: true }, { name: '✍️ Підписав', value: `${admin}` });
        addLog(`Прийнято: ${target.user.username} на ${pos}`);
        return i.editReply({ content: `${target}`, embeds: [embed] });
    }

    // --- ⚠️ ДОГАНА ---
    if (commandName === 'догана') {
        const target = options.getMember('користувач');
        if (!db.users[target.id]) db.users[target.id] = { warns: 0 };
        db.users[target.id].warns += 1;
        const cur = db.users[target.id].warns; saveDB(db);
        const embed = new EmbedBuilder().setColor('#C0392B').setTitle('⚠️ ОФІЦІЙНА ДОГАНА').addFields({ name: '👤 Порушник', value: `${target}`, inline: true }, { name: '📊 Статус', value: `\`${cur}/3\``, inline: true }, { name: '📝 Причина', value: options.getString('причина') });
        if (cur >= 3) {
            db.users[target.id].warns = 0; saveDB(db);
            const roles = target.roles.cache.filter(r => r.id !== guild.id && r.id !== EXCLUDE_ROLE);
            await target.roles.remove(roles).catch(() => {});
            embed.setTitle('🚨 АВТОМАТИЧНЕ ЗВІЛЬНЕННЯ').setColor('#000000').setDescription(`${target} звільнено за 3 догани.`);
        }
        return i.editReply({ content: `🚨 Увага! ${target}`, embeds: [embed] });
    }

    // --- 📢 ЗБОРИ ---
    if (commandName === 'збори') {
        const embed = new EmbedBuilder().setColor('#FFD700').setTitle('📢 ТЕРМІНОВІ ЗБОРИ').setDescription(`@everyone\n**Всім негайно прибути!**\nЧас: ${options.getString('час')}\nМісце: ${options.getString('місце')}`);
        return i.editReply({ content: '@everyone', embeds: [embed] });
    }

    // --- 🗄️ АРХІВ ---
    if (commandName === 'архів') {
        const logs = db.logs.filter(l => (Date.now() - l.time) < 86400000).map(l => `• <t:${Math.floor(l.time/1000)}:R> — **${l.action}**`).reverse().join('\n') || 'Наказів немає.';
        const embed = new EmbedBuilder().setColor('#2B2D31').setTitle('🗄️ РЕЄСТР НАКАЗІВ (24г)').setDescription(logs);
        return i.editReply({ embeds: [embed] });
    }

    // --- 📊 СТАТУС ---
    if (commandName === 'статус') {
        const embed = new EmbedBuilder().setColor('#27AE60').setTitle('📊 СИСТЕМА ОНЛАЙН').setDescription('🟢 Всі модулі працюють стабільно.');
        return i.editReply({ embeds: [embed] });
    }

    // УНІВЕРСАЛЬНА ВІДПОВІДЬ ДЛЯ ВСЬОГО ІНШОГО
    if (i.deferred || i.replied) {
        return i.editReply({ content: `✅ Наказ **${commandName}** успішно внесено до реєстру.` }).catch(() => {});
    }
});

http.createServer((req, res) => { res.writeHead(200); res.end('OK'); }).listen(process.env.PORT || 8080);
client.login(process.env.TOKEN);
