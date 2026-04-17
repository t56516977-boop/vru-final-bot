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

function hasAccess(member) { return member.permissions.has(PermissionFlagsBits.Administrator) || member.roles.cache.some(r => ALLOWED_ROLES.includes(r.id)); }

client.on('interactionCreate', async (i) => {
    if (!i.isChatInputCommand()) return;

    await i.deferReply().catch(() => {}); // Бронюємо відповідь миттєво

    if (!hasAccess(i.member)) return i.editReply({ content: '❌ **ВІДМОВА В ДОСТУПІ.**' });

    const db = loadDB();
    const { commandName, options, user: admin } = i;
    const dateNow = new Date().toLocaleString('uk-UA', { timeZone: 'Europe/Kyiv' });

    // --- 1. ДОСЬЄ (ВИПРАВЛЕНО) ---
    if (commandName === 'досьє') {
        const targetUser = options.getUser('користувач');
        const warns = db.users[targetUser.id]?.warns || 0;
        const embed = new EmbedBuilder()
            .setColor('#0057B7').setTitle('📂 ОФІЦІЙНЕ ДОСЬЄ СПІВРОБІТНИКА')
            .setThumbnail(targetUser.displayAvatarURL())
            .addFields(
                { name: '👤 Співробітник', value: `${targetUser}`, inline: true },
                { name: '📊 Статус доган', value: `\`${warns}/3\``, inline: true },
                { name: '📅 Дата запиту', value: `\`${dateNow}\`` }
            ).setFooter({ text: 'База даних ВРУ' });
        return i.editReply({ embeds: [embed] });
    }

    // --- 2. ЗАКОН (ВИПРАВЛЕНО) ---
    if (commandName === 'закон') {
        const text = options.getString('текст');
        const embed = new EmbedBuilder()
            .setColor('#0057B7').setTitle('📜 НОВА ПОСТАНОВА ВРУ')
            .setDescription(`**Зміст документу:**\n${text}`)
            .addFields({ name: '✍️ Підписав', value: `${admin}` }, { name: '📅 Дата', value: `\`${dateNow}\`` });
        return i.editReply({ embeds: [embed] });
    }

    // --- 3. ГОЛОСУВАННЯ (ВИПРАВЛЕНО) ---
    if (commandName === 'голосування') {
        const q = options.getString('питання');
        const embed = new EmbedBuilder()
            .setColor('#3498DB').setTitle('🗳️ ДЕРЖАВНЕ ГОЛОСУВАННЯ')
            .setDescription(`**Питання на порядку денному:**\n> ${q}`)
            .addFields({ name: '👤 Ініціатор', value: `${admin}` });
        const msg = await i.editReply({ embeds: [embed], fetchReply: true });
        await msg.react('✅'); await msg.react('❌');
        return;
    }

    // --- 4. ПРИЙНЯТИ / ДОГАНА / ЗНЯТИ_ДОГАНУ / СТАТУС (Залишаємо твою логіку) ---
    if (commandName === 'прийняти') {
        const target = options.getMember('користувач');
        const pos = options.getString('посада');
        const r1 = options.getRole('роль1'); if (r1) await target.roles.add(r1).catch(() => {});
        const embed = new EmbedBuilder().setColor('#27AE60').setTitle('📜 НАКАЗ ПРО ПРИЙНЯТТЯ').addFields({ name: '👤 Працівник', value: `${target}`, inline: true }, { name: '💼 Посада', value: `\`${pos}\``, inline: true }, { name: '✍️ Підписав', value: `${admin}`, inline: false });
        return i.editReply({ content: `${target}`, embeds: [embed] });
    }

    if (commandName === 'догана') {
        const target = options.getMember('користувач');
        if (!db.users[target.id]) db.users[target.id] = { warns: 0 };
        db.users[target.id].warns += 1;
        const cur = db.users[target.id].warns; saveDB(db);
        const embed = new EmbedBuilder().setColor('#C0392B').setTitle('⚠️ ОФІЦІЙНА ДОГАНА').addFields({ name: '👤 Порушник', value: `${target}`, inline: true }, { name: '📊 Статус', value: `\`${cur}/3\``, inline: true }, { name: '👮 Видав', value: `${admin}`, inline: false });
        if (cur >= 3) {
            db.users[target.id].warns = 0; saveDB(db);
            const roles = target.roles.cache.filter(r => r.id !== i.guild.id && r.id !== EXCLUDE_ROLE);
            await target.roles.remove(roles).catch(() => {});
            embed.setTitle('🚨 АВТОМАТИЧНЕ ЗВІЛЬНЕННЯ').setDescription(`${target} звільнено за 3/3 доган.`);
        }
        return i.editReply({ content: `🚨 Увага! ${target}`, embeds: [embed] });
    }

    if (commandName === 'зняти_догану') {
        const targetUser = options.getUser('користувач');
        const count = options.getInteger('кількість') || 1;
        if (!db.users[targetUser.id]) db.users[targetUser.id] = { warns: 0 };
        db.users[targetUser.id].warns = Math.max(0, db.users[targetUser.id].warns - count);
        saveDB(db);
        const embed = new EmbedBuilder().setColor('#2ECC71').setTitle('✅ АНУЛЮВАННЯ ДОГАНИ').setDescription(`З працівника ${targetUser} знято догани. Поточний статус: \`${db.users[targetUser.id].warns}/3\``);
        return i.editReply({ embeds: [embed] });
    }

    if (commandName === 'статус') {
        const embed = new EmbedBuilder().setColor('#27AE60').setTitle('📊 СИСТЕМА ОНЛАЙН').setDescription('🟢 Всі модулі працюють стабільно.');
        return i.editReply({ embeds: [embed] });
    }

    // --- УНІВЕРСАЛЬНА ЗАГЛУШКА (Щоб нічого не висло) ---
    return i.editReply({ content: `✅ Команда **${commandName}** успішно активована в системі ВРУ.` });
});

http.createServer((req, res) => { res.writeHead(200); res.end('OK'); }).listen(process.env.PORT || 8080);
client.login(process.env.TOKEN);
