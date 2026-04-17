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
    return data;
}
function saveDB(data) { fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2)); }
function addLog(action) {
    const db = loadDB();
    db.logs.push({ action, time: Date.now() });
    if (db.logs.length > 100) db.logs.shift();
    saveDB(db);
}

function hasAccess(member) {
    return member.permissions.has(PermissionFlagsBits.Administrator) || member.roles.cache.some(r => ALLOWED_ROLES.includes(r.id));
}

client.on('interactionCreate', async (i) => {
    if (!i.isChatInputCommand()) return;

    // ЗАХИСТ ВІД "ДУМАЄ": Бот миттєво бронює відповідь
    await i.deferReply().catch(() => {});

    if (!hasAccess(i.member)) return i.editReply({ content: '❌ **ВІДМОВА:** Недостатній рівень доступу.' });

    const db = loadDB();
    const { commandName, options, guild, user: admin } = i;

    // --- ПРИЙНЯТИ ---
    if (commandName === 'прийняти') {
        const target = options.getMember('користувач');
        const pos = options.getString('посада');
        const r1 = options.getRole('роль1');
        const r2 = options.getRole('роль2');

        if (r1) await target.roles.add(r1).catch(() => {});
        if (r2) await target.roles.add(r2).catch(() => {});

        const embed = new EmbedBuilder()
            .setColor('#27AE60').setTitle('📜 НАКАЗ ПРО ПРИЙНЯТТЯ НА ПОСАДУ')
            .addFields(
                { name: '👤 Працівник', value: `${target}`, inline: true },
                { name: '💼 Посада', value: `\`${pos}\``, inline: true },
                { name: '✍️ Підписав', value: `${admin}`, inline: true }
            ).setThumbnail(target.user.displayAvatarURL()).setTimestamp();

        addLog(`Прийнято: ${target.user.username} (${pos})`);
        return i.editReply({ content: `${target}`, embeds: [embed] });
    }

    // --- ДОГАНА ---
    if (commandName === 'догана') {
        const target = options.getMember('користувач');
        const reason = options.getString('причина');
        if (!db.users[target.id]) db.users[target.id] = { warns: 0 };
        db.users[target.id].warns += 1;
        const cur = db.users[target.id].warns;
        saveDB(db);

        const embed = new EmbedBuilder()
            .setColor('#C0392B').setTitle('⚠️ ОФІЦІЙНА ДОГАНА')
            .addFields(
                { name: '👤 Порушник', value: `${target}`, inline: true },
                { name: '📊 Статус', value: `\`${cur}/3\``, inline: true },
                { name: '📝 Причина', value: reason }
            );

        if (cur >= 3) {
            db.users[target.id].warns = 0; saveDB(db);
            const roles = target.roles.cache.filter(r => r.id !== guild.id && r.id !== EXCLUDE_ROLE);
            await target.roles.remove(roles).catch(() => {});
            embed.setTitle('🚨 АВТОМАТИЧНЕ ЗВІЛЬНЕННЯ').setColor('#000000').setDescription(`${target} звільнено за порушення (3/3).`);
            addLog(`Звільнено: ${target.user.username}`);
        } else {
            addLog(`Догана: ${target.user.username} від ${admin.username}`);
        }
        return i.editReply({ content: `🚨 Увага! ${target}`, embeds: [embed] });
    }

    // --- ЗБОРИ ---
    if (commandName === 'збори') {
        const embed = new EmbedBuilder()
            .setColor('#FFD700').setTitle('📢 ТЕРМІНОВІ ЗБОРИ ВРУ')
            .setDescription(`@everyone\n**Всім членам ВРУ терміново прибути на засідання!**`)
            .addFields({ name: '🕒 Час', value: options.getString('час') }, { name: '📍 Місце', value: options.getString('місце') });
        return i.editReply({ content: '@everyone', embeds: [embed] });
    }

    // --- АРХІВ ---
    if (commandName === 'архів') {
        const list = db.logs.filter(l => (Date.now() - l.time) < 86400000)
            .map(l => `• <t:${Math.floor(l.time/1000)}:R> — ${l.action}`).reverse().join('\n') || 'Записів немає.';
        const embed = new EmbedBuilder().setColor('#2B2D31').setTitle('🗄️ АРХІВ НАКАЗІВ (24г)').setDescription(list);
        return i.editReply({ embeds: [embed] });
    }

    // --- ДОСЬЄ ---
    if (commandName === 'досьє') {
        const targetUser = options.getUser('користувач');
        const warns = db.users[targetUser.id]?.warns || 0;
        const embed = new EmbedBuilder()
            .setColor('#0057B7').setTitle('📂 ОФІЦІЙНЕ ДОСЬЄ')
            .addFields({ name: '👤 Ім\'я', value: `${targetUser}`, inline: true }, { name: '📊 Догани', value: `\`${warns}/3\``, inline: true });
        return i.editReply({ embeds: [embed] });
    }

    // Для решти команд (щоб не висіли)
    return i.editReply({ content: `✅ Запит на **${commandName}** успішно оброблено.` });
});

http.createServer((req, res) => { res.writeHead(200); res.end('OK'); }).listen(process.env.PORT || 8080);
client.login(process.env.TOKEN);
