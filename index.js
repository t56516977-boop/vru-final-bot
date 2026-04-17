require('dotenv').config();
const fs = require('fs');
const http = require('http');
const { Client, GatewayIntentBits, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildMessages] });

// Конфігурація
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

client.once('ready', () => { console.log(`🏛️ СИСТЕМА ВРУ ОНЛАЙН: ${client.user.tag}`); });

client.on('interactionCreate', async (i) => {
    if (!i.isChatInputCommand()) return;

    // МИТТЄВА ВІДПОВІДЬ (Захист від "думає")
    await i.deferReply().catch(() => {});

    const hasAccess = i.member.permissions.has(PermissionFlagsBits.Administrator) || i.member.roles.cache.some(r => ALLOWED_ROLES.includes(r.id));
    if (!hasAccess) return i.editReply({ content: '❌ **ВІДМОВА В ДОСТУПІ:** Недостатній рівень допуску.' });

    const db = loadDB();
    const { commandName, options, guild, user: admin } = i;
    const timestamp = `📅 ${getKyivDate()}`;

    // --- 📝 ПРИЙНЯТИ ---
    if (commandName === 'прийняти') {
        const target = options.getMember('користувач');
        const pos = options.getString('посада');
        const role = options.getRole('роль1');
        if (role) await target.roles.add(role).catch(() => {});
        const embed = new EmbedBuilder().setColor('#27AE60').setTitle('📜 НАКАЗ ПРО ПРИЙНЯТТЯ НА ПОСАДУ').setThumbnail(target.user.displayAvatarURL()).addFields({ name: '👤 Працівник', value: `${target}`, inline: true }, { name: '💼 Посада', value: `\`${pos}\``, inline: true }, { name: '✍️ Підписав', value: `${admin}` }).setFooter({ text: timestamp });
        addLog(`Прийнято: ${target.user.username} (${pos})`);
        return i.editReply({ content: `${target}`, embeds: [embed] });
    }

    // --- ❌ ЗВІЛЬНИТИ ---
    if (commandName === 'звільнити') {
        const target = options.getMember('користувач');
        const roles = target.roles.cache.filter(r => r.id !== guild.id && r.id !== EXCLUDE_ROLE);
        await target.roles.remove(roles).catch(() => {});
        const embed = new EmbedBuilder().setColor('#000000').setTitle('📑 НАКАЗ ПРО ЗВІЛЬНЕННЯ').setDescription(`Працівника ${target} звільнено з займаної посади.`).addFields({ name: '✍️ Підписав', value: `${admin}` }).setFooter({ text: timestamp });
        addLog(`Звільнено: ${target.user.username}`);
        return i.editReply({ content: `${target}`, embeds: [embed] });
    }

    // --- ⚠️ ДОГАНА ---
    if (commandName === 'догана') {
        const target = options.getMember('користувач');
        if (!db.users[target.id]) db.users[target.id] = { warns: 0 };
        db.users[target.id].warns += 1;
        const cur = db.users[target.id].warns; saveDB(db);
        const embed = new EmbedBuilder().setColor('#C0392B').setTitle('🚨 ОФІЦІЙНА ДОГАНА').addFields({ name: '👤 Порушник', value: `${target}`, inline: true }, { name: '📊 Статус', value: `\`${cur}/3\``, inline: true }, { name: '📝 Причина', value: options.getString('причина') });
        if (cur >= 3) {
            db.users[target.id].warns = 0; saveDB(db);
            const roles = target.roles.cache.filter(r => r.id !== guild.id && r.id !== EXCLUDE_ROLE);
            await target.roles.remove(roles).catch(() => {});
            embed.setTitle('🔔 АВТОМАТИЧНЕ ЗВІЛЬНЕННЯ (3/3)').setColor('#000000').setDescription(`${target} звільнено за систематичні порушення.`);
        }
        return i.editReply({ content: `🚨 Увага! ${target}`, embeds: [embed] });
    }

    // --- 🗳️ ГОЛОСУВАННЯ ---
    if (commandName === 'голосування') {
        const q = options.getString('питання');
        const embed = new EmbedBuilder().setColor('#3498DB').setTitle('🗳️ ДЕРЖАВНЕ ГОЛОСУВАННЯ').setDescription(`**Питання:**\n> ${q}`).addFields({ name: '👤 Ініціатор', value: `${admin}` });
        const msg = await i.editReply({ embeds: [embed] });
        await msg.react('✅'); await msg.react('❌');
        return;
    }

    // --- 📢 ЗБОРИ ---
    if (commandName === 'збори') {
        const embed = new EmbedBuilder().setColor('#FFD700').setTitle('📢 ТЕРМІНОВІ ЗБОРИ ВРУ').setDescription(`@everyone\n**Всім негайно прибути!**`).addFields({ name: '🕒 Час', value: options.getString('час'), inline: true }, { name: '📍 Місце', value: options.getString('місце'), inline: true });
        return i.editReply({ content: '@everyone', embeds: [embed] });
    }

    // --- 📜 ЗАКОН / НАКАЗ ---
    if (commandName === 'закон' || commandName === 'наказ') {
        const text = options.getString('текст');
        const embed = new EmbedBuilder().setColor('#0057B7').setTitle(commandName === 'закон' ? '📜 ПОСТАНОВА ВРУ' : '🎖️ ПРЯМИЙ НАКАЗ').setDescription(text).addFields({ name: '✍️ Підписав', value: `${admin}` }).setFooter({ text: timestamp });
        return i.editReply({ embeds: [embed] });
    }

    // --- 📂 ДОСЬЄ ---
    if (commandName === 'досьє') {
        const target = options.getUser('користувач');
        const warns = db.users[target.id]?.warns || 0;
        const embed = new EmbedBuilder().setColor('#0057B7').setTitle('📂 ОФІЦІЙНЕ ДОСЬЄ').setThumbnail(target.displayAvatarURL()).addFields({ name: '👤 Співробітник', value: `${target}`, inline: true }, { name: '📊 Догани', value: `\`${warns}/3\``, inline: true });
        return i.editReply({ embeds: [embed] });
    }

    // --- 📉 ЗНЯТИ ДОГАНУ ---
    if (commandName === 'зняти_догану') {
        const target = options.getUser('користувач');
        const count = options.getInteger('кількість');
        if (!db.users[target.id]) db.users[target.id] = { warns: 0 };
        db.users[target.id].warns = Math.max(0, db.users[target.id].warns - count);
        saveDB(db);
        const embed = new EmbedBuilder().setColor('#2ECC71').setTitle('✅ АНУЛЮВАННЯ ДОГАНИ').setDescription(`З працівника ${target} знято догани.\nПоточний статус: \`${db.users[target.id].warns}/3\``);
        return i.editReply({ embeds: [embed] });
    }

    // --- 📊 СТАТИСТИКА / СТАТУС / ПЕРЕВІРКА ---
    if (commandName === 'статистика') return i.editReply({ embeds: [new EmbedBuilder().setColor('#9B59B6').setTitle('📈 СТАТИСТИКА').addFields({ name: 'Наказів в архіві', value: `\`${db.logs.length}\`` })] });
    if (commandName === 'статус') return i.editReply({ embeds: [new EmbedBuilder().setColor('#27AE60').setTitle('📊 СТАН СИСТЕМИ').setDescription('🟢 Всі модулі активні.')] });
    if (commandName === 'перевірка') return i.editReply({ content: '@everyone', embeds: [new EmbedBuilder().setColor('#E67E22').setTitle('🔍 ПЕРЕВІРКА ПРИСУТНОСТІ').setDescription('Всім негайно відписати у чат!')] });

    await i.editReply({ content: `✅ Наказ **${commandName}** успішно внесено до реєстру.` });
});

http.createServer((req, res) => { res.writeHead(200); res.end('OK'); }).listen(process.env.PORT || 8080);
client.login(process.env.TOKEN);
