require('dotenv').config();
const fs = require('fs');
const http = require('http');
const { Client, GatewayIntentBits, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers] });
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
    if (db.logs.length > 50) db.logs.shift();
    saveDB(db);
}

function hasAccess(member) {
    return member.permissions.has(PermissionFlagsBits.Administrator) || 
           member.roles.cache.some(r => ALLOWED_ROLES.includes(r.id));
}

client.on('interactionCreate', async (i) => {
    if (!i.isChatInputCommand()) return;
    await i.deferReply().catch(() => {});

    if (!hasAccess(i.member)) return i.editReply({ content: '❌ **ВІДМОВА:** Недостатньо прав.' });

    const db = loadDB();
    const { commandName, options, guild, user: admin } = i;

    // --- ПРИЙНЯТИ (2 РОЛІ) ---
    if (commandName === 'прийняти') {
        const target = options.getMember('користувач');
        const pos = options.getString('посада');
        const r1 = options.getRole('роль1');
        const r2 = options.getRole('роль2');

        if (r1) await target.roles.add(r1).catch(() => {});
        if (r2) await target.roles.add(r2).catch(() => {});

        const embed = new EmbedBuilder()
            .setColor('#27AE60').setTitle('📜 НАКАЗ ПРО ПРИЙНЯТТЯ НА ПОСАДУ')
            .setDescription(`> **Верховна Рада України офіційно повідомляє**`)
            .setThumbnail(target.user.displayAvatarURL())
            .addFields(
                { name: '👤 Працівник', value: `${target}`, inline: true },
                { name: '💼 Посада', value: `\`${pos}\``, inline: true },
                { name: '✍️ Підписано', value: `${admin}`, inline: true }
            ).setFooter({ text: 'ВРУ • Кадровий відділ' }).setTimestamp();

        addLog(`Прийнято: ${target.user.username} на ${pos} (Видав: ${admin.username})`);
        return i.editReply({ content: `${target}`, embeds: [embed] });
    }

    // --- ДОГАНА (З АВТОРОМ) ---
    if (commandName === 'догана') {
        const target = options.getMember('користувач');
        if (!db.users[target.id]) db.users[target.id] = { warns: 0 };
        db.users[target.id].warns += 1;
        const cur = db.users[target.id].warns;
        saveDB(db);

        const embed = new EmbedBuilder()
            .setColor('#C0392B').setTitle('⚠️ ОФІЦІЙНА ДОГАНА')
            .addFields(
                { name: '👤 Порушник', value: `${target}`, inline: true },
                { name: '📊 Статус', value: `\`${cur}/3\``, inline: true },
                { name: '👮 Видав', value: `${admin}`, inline: true },
                { name: '📝 Причина', value: options.getString('причина') || 'Порушення' }
            );

        if (cur >= 3) {
            db.users[target.id].warns = 0; saveDB(db);
            const roles = target.roles.cache.filter(r => r.id !== guild.id && r.id !== EXCLUDE_ROLE);
            await target.roles.remove(roles).catch(() => {});
            embed.setTitle('🚨 АВТОМАТИЧНЕ ЗВІЛЬНЕННЯ').setColor('#000000').setDescription(`${target} звільнено за 3 догани.`);
        }
        addLog(`Догана: ${target.user.username} від ${admin.username}`);
        return i.editReply({ content: `${target}`, embeds: [embed] });
    }

    // --- ЗНЯТИ ДОГАНУ (ВИПРАВЛЕНО ЗАВИСАННЯ) ---
    if (commandName === 'зняти_догану') {
        const user = options.getUser('користувач');
        const count = options.getInteger('кількість') || 1;
        if (!db.users[user.id]) db.users[user.id] = { warns: 0 };
        db.users[user.id].warns = Math.max(0, db.users[user.id].warns - count);
        saveDB(db);

        const embed = new EmbedBuilder()
            .setColor('#2ECC71').setTitle('✅ АНУЛЮВАННЯ ДОГАНИ')
            .setDescription(`З працівника ${user} знято догани (${count} шт.)\nПоточний статус: \`${db.users[user.id].warns}/3\``)
            .addFields({ name: '✍️ Виконав', value: `${admin}` });

        addLog(`Знято догани з ${user.username} (Виконав: ${admin.username})`);
        return i.editReply({ embeds: [embed] });
    }

    // --- АРХІВ (З АВТОРАМИ) ---
    if (commandName === 'архів') {
        const list = db.logs.filter(l => (Date.now() - l.time) < 86400000)
            .map(l => `• <t:${Math.floor(l.time/1000)}:R> — ${l.action}`).reverse().join('\n') || 'Записів немає.';
        const embed = new EmbedBuilder().setColor('#2B2D31').setTitle('🗄️ АРХІВ (24г)').setDescription(list);
        return i.editReply({ embeds: [embed] });
    }
});

http.createServer((req, res) => { res.writeHead(200); res.end('OK'); }).listen(process.env.PORT || 8080);
client.login(process.env.TOKEN);
