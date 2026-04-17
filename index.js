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

function hasAccess(member) { return member.permissions.has(PermissionFlagsBits.Administrator) || member.roles.cache.some(r => ALLOWED_ROLES.includes(r.id)); }

client.on('interactionCreate', async (i) => {
    if (!i.isChatInputCommand()) return;

    // МИТТЄВА РЕАКЦІЯ: Бот каже Discord, що він працює
    await i.deferReply().catch(() => {});

    if (!hasAccess(i.member)) return i.editReply({ content: '❌ **ВІДМОВА В ДОСТУПІ.**', ephemeral: true });

    const db = loadDB();
    const { commandName, options, user: admin } = i;
    const dateNow = new Date().toLocaleString('uk-UA', { timeZone: 'Europe/Kyiv' });

    // --- 1. ЗНЯТИ ДОГАНУ (ВИПРАВЛЕНО ШВИДКІСТЬ ТА ДИЗАЙН) ---
    if (commandName === 'зняти_догану') {
        const targetUser = options.getUser('користувач');
        const count = options.getInteger('кількість') || 1;
        
        if (!db.users[targetUser.id]) db.users[targetUser.id] = { warns: 0 };
        
        db.users[targetUser.id].warns = Math.max(0, db.users[targetUser.id].warns - count);
        const curWarns = db.users[targetUser.id].warns;
        saveDB(db);

        const embed = new EmbedBuilder()
            .setColor('#2ECC71')
            .setTitle('✅ АНУЛЮВАННЯ ДИСЦИПЛІНАРНОГО СТЯГНЕННЯ')
            .setDescription(`**Згідно з розпорядженням керівництва, з працівника ${targetUser} знято догани.**`)
            .addFields(
                { name: '📉 Кількість знятих', value: `\`${count} шт.\``, inline: true },
                { name: '📊 Поточний статус', value: `\`${curWarns}/3\``, inline: true },
                { name: '📅 Дата анулювання', value: `\`${dateNow}\``, inline: false },
                { name: '👤 Відповідальний', value: `${admin}`, inline: false }
            )
            .setFooter({ text: 'Канцелярія ВРУ • Дисциплінарний відділ' });

        addLog(`Знято догани (${count}) з ${targetUser.username} (Виконав: ${admin.username})`);
        return i.editReply({ embeds: [embed] });
    }

    // --- 2. ПРИЙНЯТИ ---
    if (commandName === 'прийняти') {
        const targetMember = options.getMember('користувач');
        const pos = options.getString('посада');
        const r1 = options.getRole('роль1');
        if (r1) await targetMember.roles.add(r1).catch(() => {});

        const embed = new EmbedBuilder()
            .setColor('#27AE60').setTitle('📜 НАКАЗ ПРО ПРИЙНЯТТЯ НА СЛУЖБУ')
            .setThumbnail(targetMember.user.displayAvatarURL())
            .addFields(
                { name: '👤 Працівник', value: `${targetMember}`, inline: true },
                { name: '💼 Посада', value: `\`${pos}\``, inline: true },
                { name: '📅 Дата', value: `\`${dateNow}\``, inline: true },
                { name: '✍️ Підписав', value: `${admin}`, inline: false }
            );

        addLog(`Прийнято: ${targetMember.user.username} (Посада: ${pos})`);
        return i.editReply({ content: `${targetMember}`, embeds: [embed] });
    }

    // --- 3. ДОГАНА ---
    if (commandName === 'догана') {
        const targetMember = options.getMember('користувач');
        if (!db.users[targetMember.id]) db.users[targetMember.id] = { warns: 0 };
        db.users[targetMember.id].warns += 1;
        const cur = db.users[targetMember.id].warns;
        saveDB(db);

        const embed = new EmbedBuilder()
            .setColor('#C0392B').setTitle('⚠️ ОФІЦІЙНА ДОГАНА ВРУ')
            .addFields(
                { name: '👤 Порушник', value: `${targetMember}`, inline: true },
                { name: '📊 Статус', value: `\`${cur}/3\``, inline: true },
                { name: '📅 Дата', value: `\`${dateNow}\``, inline: true },
                { name: '👮 Видав наказ', value: `${admin}`, inline: false },
                { name: '📝 Причина', value: options.getString('причина') || 'Порушення регламенту' }
            );

        if (cur >= 3) {
            db.users[targetMember.id].warns = 0; saveDB(db);
            const roles = targetMember.roles.cache.filter(r => r.id !== i.guild.id && r.id !== EXCLUDE_ROLE);
            await targetMember.roles.remove(roles).catch(() => {});
            embed.setTitle('🚨 АВТОМАТИЧНЕ ЗВІЛЬНЕННЯ').setColor('#000000').setDescription(`${targetMember} звільнено за 3/3 доган.`);
        }
        addLog(`Догана: ${targetMember.user.username} (${cur}/3)`);
        return i.editReply({ content: `🚨 Увага! ${targetMember}`, embeds: [embed] });
    }

    // --- 4. СТАТУС ---
    if (commandName === 'статус') {
        const embed = new EmbedBuilder().setColor('#27AE60').setTitle('📊 СТАН СИСТЕМИ ВРУ').addFields({ name: '🌐 Зв’язок', value: '🟢 Стабільний' }, { name: '📅 Поточний час', value: `\`${dateNow}\`` });
        return i.editReply({ embeds: [embed] });
    }

    // БАЗОВА ВІДПОВІДЬ ДЛЯ РЕШТИ
    if (!i.replied && !i.deferred) await i.editReply({ content: `✅ Операція **${commandName}** виконана.` });
});

http.createServer((req, res) => { res.writeHead(200); res.end('OK'); }).listen(process.env.PORT || 8080);
client.login(process.env.TOKEN);
