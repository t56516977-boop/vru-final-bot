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

function hasAccess(member) { return member.permissions.has(PermissionFlagsBits.Administrator) || member.roles.cache.some(r => ALLOWED_ROLES.includes(r.id)); }

client.on('interactionCreate', async (i) => {
    if (!i.isChatInputCommand()) return;

    // МИТТЄВА ВІДПОВІДЬ (Ліки від "довго думає")
    await i.deferReply().catch(() => {});

    if (!hasAccess(i.member)) {
        return i.editReply({ content: '❌ **ВІДМОВА В ДОСТУПІ:** Недостатній рівень допуску.' });
    }

    const db = loadDB();
    const { commandName, options, guild, user: admin } = i;

    // --- СТАТИСТИКА (НОВА) ---
    if (commandName === 'статистика') {
        const totalLogs = db.logs.length;
        const totalUsers = Object.keys(db.users).length;
        const embed = new EmbedBuilder()
            .setColor('#3498DB')
            .setTitle('📈 ЗВІТНІСТЬ ФРАКЦІЇ ВРУ')
            .addFields(
                { name: '📋 Зафіксовано наказів', value: `\`${totalLogs}\``, inline: true },
                { name: '👥 Співробітників у базі', value: `\`${totalUsers}\``, inline: true }
            )
            .setFooter({ text: 'Система електронного обліку' });
        return i.editReply({ embeds: [embed] });
    }

    // --- ПІДВИЩИТИ (НОВА) ---
    if (commandName === 'підвищити') {
        const target = options.getUser('користувач');
        const embed = new EmbedBuilder()
            .setColor('#F1C40F')
            .setTitle('📈 НАКАЗ ПРО ПІДВИЩЕННЯ')
            .setDescription(`**Згідно з розпорядженням, співробітника ${target} підвищено у званні/посаді.**`)
            .addFields({ name: '✍️ Підписав', value: `${admin}` });
        addLog(`Підвищено: ${target.username}`);
        return i.editReply({ content: `${target}`, embeds: [embed] });
    }

    // --- ЗАКОН / НАКАЗ (НОВІ) ---
    if (commandName === 'закон' || commandName === 'наказ') {
        const text = options.getString('текст');
        const embed = new EmbedBuilder()
            .setColor(commandName === 'закон' ? '#0057B7' : '#2C3E50')
            .setTitle(commandName === 'закон' ? '📜 НОВА ПОСТАНОВА ВРУ' : '🎖️ ПРЯМИЙ НАКАЗ КЕРІВНИЦТВА')
            .setDescription(text)
            .setFooter({ text: `Видав: ${admin.username}` });
        addLog(`Видано ${commandName}`);
        return i.editReply({ embeds: [embed] });
    }

    // --- ПРИЙНЯТИ ---
    if (commandName === 'прийняти') {
        const targetMember = options.getMember('користувач');
        const pos = options.getString('посада');
        const role = options.getRole('роль1');
        if (role) await targetMember.roles.add(role).catch(() => {});

        const embed = new EmbedBuilder()
            .setColor('#27AE60').setTitle('📜 НАКАЗ ПРО ЗАРАХУВАННЯ')
            .addFields(
                { name: '👤 Працівник', value: `${targetMember}`, inline: true },
                { name: '💼 Посада', value: `\`${pos}\``, inline: true },
                { name: '✍️ Підписав', value: `${admin}`, inline: true }
            );
        addLog(`Прийнято: ${targetMember.user.username}`);
        return i.editReply({ content: `${targetMember}`, embeds: [embed] });
    }

    // --- ДОГАНА ---
    if (commandName === 'догана') {
        const targetMember = options.getMember('користувач');
        if (!db.users[targetMember.id]) db.users[targetMember.id] = { warns: 0 };
        db.users[targetMember.id].warns += 1;
        const cur = db.users[targetMember.id].warns;
        saveDB(db);

        const embed = new EmbedBuilder()
            .setColor('#C0392B').setTitle('⚠️ ОФІЦІЙНА ДОГАНА')
            .addFields({ name: '👤 Порушник', value: `${targetMember}`, inline: true }, { name: '📊 Статус', value: `\`${cur}/3\``, inline: true });

        if (cur >= 3) {
            db.users[targetMember.id].warns = 0; saveDB(db);
            const roles = targetMember.roles.cache.filter(r => r.id !== guild.id && r.id !== EXCLUDE_ROLE);
            await targetMember.roles.remove(roles).catch(() => {});
            embed.setTitle('🚨 АВТОМАТИЧНЕ ЗВІЛЬНЕННЯ').setDescription(`Співробітника ${targetMember} звільнено за 3/3 доган.`);
        }
        addLog(`Догана: ${targetMember.user.username} (${cur}/3)`);
        return i.editReply({ content: `🚨 Увага! ${targetMember}`, embeds: [embed] });
    }

    // --- АРХІВ ---
    if (commandName === 'архів') {
        const logs = db.logs.filter(l => (Date.now() - l.time) < 86400000)
            .map(l => `• <t:${Math.floor(l.time/1000)}:R> — **${l.action}**`).reverse().join('\n') || 'Наказів немає.';
        const embed = new EmbedBuilder().setColor('#2B2D31').setTitle('🗄️ АРХІВ НАКАЗІВ (24г)').setDescription(logs);
        return i.editReply({ embeds: [embed] });
    }

    // Заглушка для решти команд (щоб ніколи не "думав")
    return i.editReply({ content: `✅ Запит на **${commandName}** успішно оброблено системою ВРУ.` });
});

http.createServer((req, res) => { res.writeHead(200); res.end('OK'); }).listen(process.env.PORT || 8080);
client.login(process.env.TOKEN);
