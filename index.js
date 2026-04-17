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

    await i.deferReply().catch(() => {});

    const hasRole = i.member.roles.cache.some(r => ALLOWED_ROLES.includes(r.id)) || i.member.permissions.has('Administrator');
    if (!hasRole) return i.editReply('❌ **ВІДМОВА В ДОСТУПІ.**');

    const db = JSON.parse(fs.readFileSync(DB_PATH));
    const { commandName, options, guild, user: admin } = i;

    // --- 📈 ПІДВИЩИТИ ---
    if (commandName === 'підвищити') {
        const target = options.getUser('користувач');
        const embed = new EmbedBuilder().setColor('#F1C40F').setTitle('📈 НАКАЗ ПРО ПІДВИЩЕННЯ').setDescription(`За особливі заслуги перед державою, працівника ${target} підвищено у званні/посаді!`).addFields({ name: '✍️ Підписав', value: `${admin}` });
        db.logs.push({ action: `Підвищено: ${target.username}`, time: Date.now() });
        fs.writeFileSync(DB_PATH, JSON.stringify(db));
        return i.editReply({ content: `${target}`, embeds: [embed] });
    }

    // --- ❌ ЗВІЛЬНИТИ ---
    if (commandName === 'звільнити') {
        const targetMember = options.getMember('користувач');
        const rolesToRemove = targetMember.roles.cache.filter(r => r.id !== guild.id && r.id !== EXCLUDE_ROLE);
        await targetMember.roles.remove(rolesToRemove).catch(() => {});
        const embed = new EmbedBuilder().setColor('#000000').setTitle('📑 НАКАЗ ПРО ЗВІЛЬНЕННЯ').setDescription(`Співробітника ${targetMember} звільнено з займаної посади та позбавлено повноважень.`).addFields({ name: '✍️ Підписав', value: `${admin}` });
        db.logs.push({ action: `Звільнено: ${targetMember.user.username}`, time: Date.now() });
        fs.writeFileSync(DB_PATH, JSON.stringify(db));
        return i.editReply({ content: `${targetMember}`, embeds: [embed] });
    }

    // --- 📊 СТАТИСТИКА ---
    if (commandName === 'статистика') {
        const totalLogs = db.logs.length;
        const totalUsers = Object.keys(db.users).length;
        const embed = new EmbedBuilder().setColor('#3498DB').setTitle('📊 ЗВІТНІСТЬ ФРАКЦІЇ').addFields({ name: '📋 Наказів в архіві', value: `\`${totalLogs}\``, inline: true }, { name: '👥 Користувачів з доганами', value: `\`${totalUsers}\``, inline: true });
        return i.editReply({ embeds: [embed] });
    }

    // --- 🗳️ ГОЛОСУВАННЯ ---
    if (commandName === 'голосування') {
        const q = options.getString('питання');
        const embed = new EmbedBuilder().setColor('#3498DB').setTitle('🗳️ ДЕРЖАВНЕ ГОЛОСУВАННЯ').setDescription(`**Питання на порядку денному:**\n> ${q}`).addFields({ name: '👤 Ініціатор', value: `${admin}` });
        const msg = await i.editReply({ embeds: [embed], fetchReply: true });
        await msg.react('✅'); await msg.react('❌');
        return;
    }

    // --- ❓ ДОПОМОГА ---
    if (commandName === 'допомога') {
        const embed = new EmbedBuilder().setColor('#34495E').setTitle('❓ ДОВІДНИК КОМАНД ВРУ').setDescription('**Кадри:** `/прийняти`, `/звільнити`, `/підвищити`, `/досьє`\n**Контроль:** `/догана`, `/зняти_догану`, `/виклик`, `/перевірка`\n**Інше:** `/збори`, `/архів`, `/статистика`, `/статус`');
        return i.editReply({ embeds: [embed] });
    }

    // --- 🔍 ПЕРЕВІРКА ---
    if (commandName === 'перевірка') {
        const embed = new EmbedBuilder().setColor('#E67E22').setTitle('🔍 ПЕРЕВІРКА ПРИСУТНОСТІ').setDescription(`@everyone\n**Проводиться службова перевірка! Всім негайно відписати в чат!**`).addFields({ name: '👮 Перевіряючий', value: `${admin}` });
        return i.editReply({ content: '@everyone', embeds: [embed] });
    }

    // --- 🚨 ВИКЛИК ---
    if (commandName === 'виклик') {
        const target = options.getUser('користувач');
        const embed = new EmbedBuilder().setColor('#E67E22').setTitle('🚨 ВИКЛИК ДО КЕРІВНИЦТВА').setDescription(`${target}, вам наказано негайно з'явитися до залу засідань!`).addFields({ name: '📝 Причина', value: options.getString('причина') }, { name: '👮 Викликав', value: `${admin}` });
        return i.editReply({ content: `${target}`, embeds: [embed] });
    }

    // --- 📢 ЗБОРИ ---
    if (commandName === 'збори') {
        const embed = new EmbedBuilder().setColor('#FFD700').setTitle('📢 ТЕРМІНОВІ ЗБОРИ ВРУ').setDescription(`@everyone\n**Всім членам ВРУ терміново прибути на засідання!**`).addFields({ name: '🕒 Час', value: options.getString('час'), inline: true }, { name: '📍 Місце', value: options.getString('місце'), inline: true });
        return i.editReply({ content: '@everyone', embeds: [embed] });
    }

    // --- 📜 ЗАКОН / НАКАЗ ---
    if (commandName === 'закон' || commandName === 'наказ') {
        const text = options.getString('текст');
        const embed = new EmbedBuilder().setColor('#0057B7').setTitle(commandName === 'закон' ? '📜 ПОСТАНОВА ВРУ' : '🎖️ ПРЯМИЙ НАКАЗ').setDescription(text).addFields({ name: '✍️ Підписав', value: `${admin}` });
        addLog(`Видано ${commandName}`);
        return i.editReply({ embeds: [embed] });
    }

    // --- 📝 ПРИЙНЯТИ ---
    if (commandName === 'прийняти') {
        const member = options.getMember('користувач');
        const pos = options.getString('посада');
        const role = options.getRole('роль1');
        if (role) await member.roles.add(role).catch(() => {});
        const embed = new EmbedBuilder().setColor('#27AE60').setTitle('📜 НАКАЗ ПРО ПРИЙНЯТТЯ').setDescription(`Співробітника ${member} зараховано на посаду: **${pos}**`).addFields({ name: '✍️ Підписав', value: `${admin}` });
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
        const embed = new EmbedBuilder().setColor('#C0392B').setTitle('⚠️ ОФІЦІЙНА ДОГАНА').addFields({ name: '👤 Порушник', value: `${member}`, inline: true }, { name: '📊 Статус', value: `\`${cur}/3\``, inline: true }, { name: '📝 Причина', value: options.getString('причина') });
        if (cur >= 3) {
            db.users[member.id].warns = 0;
            const roles = member.roles.cache.filter(r => r.id !== guild.id && r.id !== EXCLUDE_ROLE);
            await member.roles.remove(roles).catch(() => {});
            embed.setTitle('🚨 АВТОМАТИЧНЕ ЗВІЛЬНЕННЯ').setDescription(`${member} звільнено за порушення (3/3).`);
        }
        fs.writeFileSync(DB_PATH, JSON.stringify(db));
        return i.editReply({ content: `🚨 ${member}`, embeds: [embed] });
    }

    // --- 📂 ДОСЬЄ ---
    if (commandName === 'досьє') {
        const target = options.getUser('користувач');
        const warns = db.users[target.id]?.warns || 0;
        const embed = new EmbedBuilder().setColor('#0057B7').setTitle('📂 ОФІЦІЙНЕ ДОСЬЄ').setThumbnail(target.displayAvatarURL()).addFields({ name: '👤 Співробітник', value: `${target}`, inline: true }, { name: '📊 Догани', value: `\`${warns}/3\``, inline: true });
        return i.editReply({ embeds: [embed] });
    }

    // --- 🗄️ АРХІВ ---
    if (commandName === 'архів') {
        const logs = db.logs.slice(-15).reverse().map(l => `• ${l.action}`).join('\n') || 'Наказів немає.';
        const embed = new EmbedBuilder().setColor('#2B2D31').setTitle('🗄️ РЕЄСТР НАКАЗІВ').setDescription(logs);
        return i.editReply({ embeds: [embed] });
    }

    // --- 📉 ЗНЯТИ ДОГАНУ ---
    if (commandName === 'зняти_догану') {
        const target = options.getUser('користувач');
        const count = options.getInteger('кількість');
        if (!db.users[target.id]) db.users[target.id] = { warns: 0 };
        db.users[target.id].warns = Math.max(0, db.users[target.id].warns - count);
        fs.writeFileSync(DB_PATH, JSON.stringify(db));
        return i.editReply(`✅ З ${target} знято догани. Поточний статус: \`${db.users[target.id].warns}/3\``);
    }

    // --- 📊 СТАТУС ---
    if (commandName === 'статус') return i.editReply('📊 **СИСТЕМА ВРУ ОНЛАЙН.** Робота стабільна.');

    return i.editReply('✅ Операція виконана.');
});

function addLog(action) {
    const db = JSON.parse(fs.readFileSync(DB_PATH));
    db.logs.push({ action, time: Date.now() });
    if (db.logs.length > 50) db.logs.shift();
    fs.writeFileSync(DB_PATH, JSON.stringify(db));
}

http.createServer((req, res) => { res.writeHead(200); res.end('OK'); }).listen(process.env.PORT || 8080);
client.login(process.env.TOKEN);
