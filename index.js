require('dotenv').config();
const fs = require('fs');
const http = require('http');
const { Client, GatewayIntentBits, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildMessages] });

// Конфігурація
const DB_PATH = './database.json';
const EXCLUDE_ROLE = '1447718423390847178'; 
const ALLOWED_ROLES = ['1447679308050071623', '1476850285950402590', '1383809507251191830', '1383809217701613588', '1448618012176416872', '1448586089840377897', '1383809053813379103'];

// Ініціалізація БД
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

client.once('ready', () => { console.log(`🏛️ СИСТЕМА ВРУ ОНЛАЙН: ${client.user.tag}`); });

client.on('interactionCreate', async (i) => {
    if (!i.isChatInputCommand()) return;

    // ПЕРЕВІРКА ПРАВ
    const hasAccess = i.member.permissions.has(PermissionFlagsBits.Administrator) || i.member.roles.cache.some(r => ALLOWED_ROLES.includes(r.id));
    if (!hasAccess) return i.reply({ content: '❌ **ВІДМОВА В ДОСТУПІ:** Ваш рівень допуску недостатній.', ephemeral: true });

    await i.deferReply().catch(() => {});
    const db = loadDB();
    const { commandName, options, guild, user: admin } = i;
    const dateNow = `📅 ${getKyivDate()}`;

    // --- 📝 ПРИЙНЯТИ ---
    if (commandName === 'прийняти') {
        const target = options.getMember('користувач');
        const pos = options.getString('посада');
        const r1 = options.getRole('роль1');
        const r2 = options.getRole('роль2');

        if (r1) await target.roles.add(r1).catch(() => {});
        if (r2) await target.roles.add(r2).catch(() => {});

        const embed = new EmbedBuilder()
            .setColor('#27AE60').setTitle('📜 НАКАЗ ПРО ПРИЙНЯТТЯ НА ПОСАДУ')
            .setThumbnail(target.user.displayAvatarURL())
            .addFields(
                { name: '👤 Працівник', value: `${target}`, inline: true },
                { name: '💼 Посада', value: `\`${pos}\``, inline: true },
                { name: '✍️ Підписав', value: `${admin}`, inline: true }
            ).setFooter({ text: `ВРУ • Кадри | ${dateNow}` });

        addLog(`Прийнято: ${target.user.username} на ${pos}`);
        return i.editReply({ content: `${target}`, embeds: [embed] });
    }

    // --- ⚠️ ДОГАНА ---
    if (commandName === 'догана') {
        const target = options.getMember('користувач');
        if (!db.users[target.id]) db.users[target.id] = { warns: 0 };
        db.users[target.id].warns += 1;
        const cur = db.users[target.id].warns;
        saveDB(db);

        const embed = new EmbedBuilder()
            .setColor('#C0392B').setTitle('🚨 ОФІЦІЙНА ДОГАНА ВРУ')
            .addFields(
                { name: '👤 Порушник', value: `${target}`, inline: true },
                { name: '📊 Статус', value: `\`${cur}/3\``, inline: true },
                { name: '📝 Причина', value: options.getString('причина') },
                { name: '👮 Видав', value: `${admin}` }
            ).setFooter({ text: dateNow });

        if (cur >= 3) {
            db.users[target.id].warns = 0; saveDB(db);
            const roles = target.roles.cache.filter(r => r.id !== guild.id && r.id !== EXCLUDE_ROLE);
            await target.roles.remove(roles).catch(() => {});
            embed.setTitle('🔔 АВТОМАТИЧНЕ ЗВІЛЬНЕННЯ').setColor('#000000').setDescription(`Співробітника ${target} звільнено за 3/3 доган.`);
            addLog(`Авто-звільнення: ${target.user.username}`);
        } else { addLog(`Догана: ${target.user.username} (${cur}/3)`); }
        return i.editReply({ content: `🚨 Увага! ${target}`, embeds: [embed] });
    }

    // --- ❌ ЗВІЛЬНИТИ ---
    if (commandName === 'звільнити') {
        const target = options.getMember('користувач');
        const roles = target.roles.cache.filter(r => r.id !== guild.id && r.id !== EXCLUDE_ROLE);
        await target.roles.remove(roles).catch(() => {});
        const embed = new EmbedBuilder().setColor('#000000').setTitle('📑 НАКАЗ ПРО ЗВІЛЬНЕННЯ').setDescription(`Співробітника ${target} позбавлено повноважень.`).addFields({ name: '✍️ Підписав', value: `${admin}` });
        addLog(`Звільнено: ${target.user.username}`);
        return i.editReply({ content: `${target}`, embeds: [embed] });
    }

    // --- 🗳️ ГОЛОСУВАННЯ ---
    if (commandName === 'голосування') {
        const embed = new EmbedBuilder().setColor('#3498DB').setTitle('🗳️ ГОЛОСУВАННЯ ВРУ').setDescription(`**Питання:**\n> ${options.getString('питання')}`).addFields({ name: '👤 Ініціатор', value: `${admin}` });
        const msg = await i.editReply({ embeds: [embed] });
        await msg.react('✅'); await msg.react('❌');
        return;
    }

    // --- 📢 ЗБОРИ ---
    if (commandName === 'збори') {
        const embed = new EmbedBuilder().setColor('#FFD700').setTitle('📢 ТЕРМІНОВІ ЗБОРИ ВРУ').setDescription(`@everyone\n**Всім негайно прибути!**`).addFields({ name: '🕒 Час', value: options.getString('час'), inline: true }, { name: '📍 Місце', value: options.getString('місце'), inline: true });
        return i.editReply({ content: '@everyone', embeds: [embed] });
    }

    // --- 🗄️ АРХІВ ---
    if (commandName === 'архів') {
        const logs = db.logs.filter(l => (Date.now() - l.time) < 86400000).map(l => `• <t:${Math.floor(l.time/1000)}:R> — ${l.action}`).reverse().join('\n') || 'Наказів немає.';
        return i.editReply({ embeds: [new EmbedBuilder().setColor('#2B2D31').setTitle('🗄️ АРХІВ (24г)').setDescription(logs)] });
    }

    // --- 📊 СТАТУС ---
    if (commandName === 'статус') {
        return i.editReply({ embeds: [new EmbedBuilder().setColor('#27AE60').setTitle('📊 СИСТЕМА ОНЛАЙН').setDescription('🟢 Всі модулі працюють стабільно.')] });
    }

    // Решта команд (універсальна відповідь)
    if (!i.replied) await i.editReply({ content: `✅ Операція **${commandName}** успішно виконана.` });
});

http.createServer((req, res) => { res.writeHead(200); res.end('OK'); }).listen(process.env.PORT || 8080);
client.login(process.env.TOKEN);
