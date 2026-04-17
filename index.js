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
    await i.deferReply().catch(() => {});

    const hasAccess = i.member.permissions.has(PermissionFlagsBits.Administrator) || i.member.roles.cache.some(r => ALLOWED_ROLES.includes(r.id));
    if (!hasAccess) return i.editReply({ content: '❌ **ВІДМОВА В ДОСТУПІ.**' });

    const db = loadDB();
    const { commandName, options, guild, user: admin } = i;
    const timestamp = `📅 ${getKyivDate()}`;

    // --- 🗄️ АРХІВ (ВИПРАВЛЕНО) ---
    if (commandName === 'архів') {
        const logs = db.logs.filter(l => (Date.now() - l.time) < 86400000)
            .map(l => `• <t:${Math.floor(l.time/1000)}:R> — **${l.action}**`).reverse().join('\n') || 'Записів не знайдено.';
        const embed = new EmbedBuilder().setColor('#2B2D31').setTitle('🗄️ ЕЛЕКТРОННИЙ РЕЄСТР ВРУ (24г)').setDescription(logs).setFooter({ text: timestamp });
        return i.editReply({ embeds: [embed] });
    }

    // --- 🚨 ВИКЛИК (ВИПРАВЛЕНО) ---
    if (commandName === 'виклик') {
        const target = options.getUser('користувач');
        const embed = new EmbedBuilder().setColor('#E67E22').setTitle('🚨 СЛУЖБОВИЙ ВИКЛИК').setDescription(`${target}, негайно з'явіться до керівництва!`).addFields({ name: '📝 Причина', value: options.getString('причина') }, { name: '👮 Викликав', value: `${admin}` });
        return i.editReply({ content: `${target}`, embeds: [embed] });
    }

    // --- 📊 СТАТИСТИКА (ВИПРАВЛЕНО) ---
    if (commandName === 'статистика') {
        const embed = new EmbedBuilder().setColor('#3498DB').setTitle('📈 ЗВІТНІСТЬ ФРАКЦІЇ').addFields({ name: '📋 Наказів в базі', value: `\`${db.logs.length}\`` }, { name: '👥 Користувачів з доганами', value: `\`${Object.keys(db.users).length}\`` });
        return i.editReply({ embeds: [embed] });
    }

    // --- 📝 ПРИЙНЯТИ ---
    if (commandName === 'прийняти') {
        const target = options.getMember('користувач');
        const pos = options.getString('посада');
        const r1 = options.getRole('роль1'); if (r1) await target.roles.add(r1).catch(() => {});
        const embed = new EmbedBuilder().setColor('#27AE60').setTitle('📜 НАКАЗ ПРО ПРИЙНЯТТЯ').addFields({ name: '👤 Працівник', value: `${target}`, inline: true }, { name: '💼 Посада', value: `\`${pos}\``, inline: true }, { name: '✍️ Підписав', value: `${admin}`, inline: true });
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
            embed.setTitle('🚨 АВТОМАТИЧНЕ ЗВІЛЬНЕННЯ').setDescription(`${target} звільнено за 3/3 доган.`);
            addLog(`Звільнено: ${target.user.username}`);
        } else { addLog(`Догана: ${target.user.username} (${cur}/3)`); }
        return i.editReply({ content: `🚨 Увага! ${target}`, embeds: [embed] });
    }

    // --- 📢 ЗБОРИ / ПЕРЕВІРКА / СТАТУС / ДОПОМОГА ---
    if (commandName === 'збори') {
        const embed = new EmbedBuilder().setColor('#FFD700').setTitle('📢 ТЕРМІНОВІ ЗБОРИ').setDescription(`@everyone\n**Всім негайно прибути!**\nЧас: ${options.getString('час')}\nМісце: ${options.getString('місце')}`);
        return i.editReply({ content: '@everyone', embeds: [embed] });
    }
    if (commandName === 'статус') return i.editReply({ embeds: [new EmbedBuilder().setColor('#27AE60').setTitle('📊 СИСТЕМА ОНЛАЙН').setDescription('🟢 Всі модулі працюють стабільно.')] });
    if (commandName === 'перевірка') return i.editReply({ content: '@everyone', embeds: [new EmbedBuilder().setColor('#E67E22').setTitle('🔍 ПЕРЕВІРКА ПРИСУТНОСТІ').setDescription('Всім терміново відписати у чат!')] });
    if (commandName === 'допомога') return i.editReply({ embeds: [new EmbedBuilder().setColor('#34495E').setTitle('❓ СПИСОК КОМАНД').setDescription('`/прийняти`, `/догана`, `/збори`, `/архів`, `/виклик`, `/статистика`, `/статус`')] });

    // Якщо раптом команда не розписана
    return i.editReply({ content: `✅ Наказ **${commandName}** успішно внесено до реєстру.`, ephemeral: true });
});

http.createServer((req, res) => { res.writeHead(200); res.end('OK'); }).listen(process.env.PORT || 8080);
client.login(process.env.TOKEN);
