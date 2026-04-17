require('dotenv').config();
const fs = require('fs');
const http = require('http');
const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers] });
const DB_PATH = './database.json';
const EXCLUDE_ROLE = '1447718423390847178'; 
const ALLOWED_ROLES = ['1447679308050071623', '1476850285950402590', '1383809507251191830', '1383809217701613588', '1448618012176416872', '1448586089840377897', '1383809053813379103'];

if (!fs.existsSync(DB_PATH)) fs.writeFileSync(DB_PATH, JSON.stringify({ users: {}, logs: [] }));

client.on('interactionCreate', async (i) => {
    if (!i.isChatInputCommand()) return;

    await i.deferReply().catch(() => {}); // Миттєва бронь відповіді

    const hasRole = i.member.roles.cache.some(r => ALLOWED_ROLES.includes(r.id)) || i.member.permissions.has('Administrator');
    if (!hasRole) return i.editReply('❌ **ВІДМОВА В ДОСТУПІ.**');

    const db = JSON.parse(fs.readFileSync(DB_PATH));
    const { commandName, options, guild, user: admin } = i;

    // --- 🚨 ВИКЛИК ---
    if (commandName === 'виклик') {
        const target = options.getUser('користувач');
        const reason = options.getString('причина');
        const embed = new EmbedBuilder().setColor('#C0392B').setTitle('🚨 СЛУЖБОВИЙ ВИКЛИК').setDescription(`${target}, терміново прибудьте до керівництва!`).addFields({ name: '📝 Причина', value: reason }, { name: '👮 Викликав', value: `${admin}` });
        return i.editReply({ content: `${target}`, embeds: [embed] });
    }

    // --- 📢 ЗБОРИ ---
    if (commandName === 'збори') {
        const embed = new EmbedBuilder().setColor('#FFD700').setTitle('📢 ТЕРМІНОВІ ЗБОРИ ВРУ').setDescription(`@everyone\n**Всім негайно прибути на засідання!**`).addFields({ name: '🕒 Час', value: options.getString('час') }, { name: '📍 Місце', value: options.getString('місце') });
        return i.editReply({ content: '@everyone', embeds: [embed] });
    }

    // --- 📜 ЗАКОН / НАКАЗ ---
    if (commandName === 'закон' || commandName === 'наказ') {
        const embed = new EmbedBuilder().setColor('#0057B7').setTitle(commandName === 'закон' ? '📜 ПОСТАНОВА ВРУ' : '🎖️ ПРЯМИЙ НАКАЗ').setDescription(options.getString('текст')).addFields({ name: '✍️ Підписав', value: `${admin}` });
        return i.editReply({ embeds: [embed] });
    }

    // --- 📝 ПРИЙНЯТИ ---
    if (commandName === 'прийняти') {
        const member = options.getMember('користувач');
        const role = options.getRole('роль1');
        if (role) await member.roles.add(role).catch(() => {});
        const embed = new EmbedBuilder().setColor('#27AE60').setTitle('📜 НАКАЗ ПРО ПРИЙНЯТТЯ').setDescription(`Співробітника ${member} прийнято на посаду: **${options.getString('посада')}**`);
        db.logs.push({ action: `Прийнято: ${member.user.username}`, time: Date.now() });
        fs.writeFileSync(DB_PATH, JSON.stringify(db));
        return i.editReply({ content: `${member}`, embeds: [embed] });
    }

    // --- ⚠️ ДОГАНА ---
    if (commandName === 'догана') {
        const member = options.getMember('користувач');
        if (!db.users[member.id]) db.users[member.id] = { warns: 0 };
        db.users[member.id].warns += 1;
        const cur = db.users[member.id].warns;
        const embed = new EmbedBuilder().setColor('#C0392B').setTitle('⚠️ ОФІЦІЙНА ДОГАНА').addFields({ name: '👤 Порушник', value: `${member}`, inline: true }, { name: '📊 Статус', value: `\`${cur}/3\``, inline: true });
        if (cur >= 3) {
            db.users[member.id].warns = 0;
            const roles = member.roles.cache.filter(r => r.id !== guild.id && r.id !== EXCLUDE_ROLE);
            await member.roles.remove(roles).catch(() => {});
            embed.setTitle('🚨 ЗВІЛЬНЕННЯ (3/3)').setDescription(`${member} звільнено.`);
        }
        fs.writeFileSync(DB_PATH, JSON.stringify(db));
        return i.editReply({ content: `🚨 ${member}`, embeds: [embed] });
    }

    // --- 📂 ДОСЬЄ ---
    if (commandName === 'досьє') {
        const target = options.getUser('користувач');
        const warns = db.users[target.id]?.warns || 0;
        const embed = new EmbedBuilder().setColor('#0057B7').setTitle('📂 ДОСЬЄ').setThumbnail(target.displayAvatarURL()).addFields({ name: '👤 Співробітник', value: `${target}`, inline: true }, { name: '📊 Догани', value: `\`${warns}/3\``, inline: true });
        return i.editReply({ embeds: [embed] });
    }

    // --- ✅ ЗНЯТИ ДОГАНУ ---
    if (commandName === 'зняти_догану') {
        const target = options.getUser('користувач');
        const count = options.getInteger('кількість');
        if (!db.users[target.id]) db.users[target.id] = { warns: 0 };
        db.users[target.id].warns = Math.max(0, db.users[target.id].warns - count);
        fs.writeFileSync(DB_PATH, JSON.stringify(db));
        return i.editReply(`✅ З ${target} знято догани. Статус: \`${db.users[target.id].warns}/3\``);
    }

    // --- 🗄️ АРХІВ ---
    if (commandName === 'архів') {
        const logs = db.logs.slice(-15).reverse().map(l => `• ${l.action}`).join('\n') || 'Наказів немає.';
        return i.editReply({ embeds: [new EmbedBuilder().setColor('#2B2D31').setTitle('🗄️ АРХІВ').setDescription(logs)] });
    }

    // --- 📊 СТАТИСТИКА ---
    if (commandName === 'статистика') {
        return i.editReply({ embeds: [new EmbedBuilder().setColor('#3498DB').setTitle('📊 СТАТИСТИКА').setDescription(`Всього наказів: \`${db.logs.length}\``)] });
    }

    // --- 🔍 ПЕРЕВІРКА ---
    if (commandName === 'перевірка') {
        return i.editReply({ content: '@everyone', embeds: [new EmbedBuilder().setColor('#E67E22').setTitle('🔍 ПЕРЕВІРКА').setDescription('Всім терміново відписати у чат!')] });
    }

    // --- 📊 СТАТУС ---
    if (commandName === 'статус') return i.editReply('📊 **СИСТЕМА ОНЛАЙН.**');

    // --- ❓ ДОПОМОГА ---
    if (commandName === 'допомога') return i.editReply('**Команди:** `/прийняти`, `/догана`, `/збори`, `/виклик`, `/архів`, `/досьє`, `/зняти_догану`');

    return i.editReply('✅ Команда виконана.');
});

http.createServer((req, res) => { res.writeHead(200); res.end('OK'); }).listen(process.env.PORT || 8080);
client.login(process.env.TOKEN);
