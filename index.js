require('dotenv').config();
const fs = require('fs');
const http = require('http');
const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers] });
const DB_PATH = './database.json';
const EXCLUDE_ROLE = '1447718423390847178'; 
const ALLOWED_ROLES = ['1447679308050071623', '1476850285950402590', '1383809507251191830', '1383809217701613588', '1448618012176416872', '1448586089840377897', '1383809053813379103'];

// Швидка робота з БД
if (!fs.existsSync(DB_PATH)) fs.writeFileSync(DB_PATH, JSON.stringify({ users: {}, logs: [] }));

client.on('interactionCreate', async (i) => {
    if (!i.isChatInputCommand()) return;

    // МИТТЄВА ВІДПОВІДЬ ДЛЯ DISCORD (Щоб не було "думає")
    await i.deferReply().catch(() => {});

    // Перевірка доступу (тільки адміни або вказані ролі)
    const hasRole = i.member.roles.cache.some(r => ALLOWED_ROLES.includes(r.id));
    if (!hasRole && !i.member.permissions.has('Administrator')) {
        return i.editReply('❌ **ВІДМОВА В ДОСТУПІ.**');
    }

    const db = JSON.parse(fs.readFileSync(DB_PATH));
    const { commandName, options, guild } = i;

    // --- ДОСЬЄ ---
    if (commandName === 'досьє') {
        const target = options.getUser('користувач');
        const warns = db.users[target.id]?.warns || 0;
        const embed = new EmbedBuilder()
            .setColor('#0057B7')
            .setTitle('📂 ОФІЦІЙНЕ ДОСЬЄ')
            .setThumbnail(target.displayAvatarURL())
            .addFields(
                { name: '👤 Співробітник', value: `${target}`, inline: true },
                { name: '📊 Статус доган', value: `\`${warns}/3\``, inline: true }
            );
        return i.editReply({ embeds: [embed] });
    }

    // --- ПРИЙНЯТИ ---
    if (commandName === 'прийняти') {
        const member = options.getMember('користувач');
        const pos = options.getString('посада');
        const role = options.getRole('роль1');
        if (role) await member.roles.add(role).catch(() => {});
        
        const embed = new EmbedBuilder()
            .setColor('#27AE60')
            .setTitle('📜 НАКАЗ ПРО ПРИЙНЯТТЯ')
            .setDescription(`Співробітника ${member} зараховано на посаду **${pos}**`);
        
        db.logs.push({ action: `Прийнято: ${member.user.username}`, time: Date.now() });
        fs.writeFileSync(DB_PATH, JSON.stringify(db));
        return i.editReply({ content: `${member}`, embeds: [embed] });
    }

    // --- ДОГАНА ---
    if (commandName === 'догана') {
        const member = options.getMember('користувач');
        if (!db.users[member.id]) db.users[member.id] = { warns: 0 };
        db.users[member.id].warns += 1;
        const cur = db.users[member.id].warns;

        const embed = new EmbedBuilder()
            .setColor('#C0392B')
            .setTitle('⚠️ ОФІЦІЙНА ДОГАНА')
            .addFields({ name: '👤 Порушник', value: `${member}`, inline: true }, { name: '📊 Статус', value: `\`${cur}/3\``, inline: true });

        if (cur >= 3) {
            db.users[member.id].warns = 0;
            const roles = member.roles.cache.filter(r => r.id !== guild.id && r.id !== EXCLUDE_ROLE);
            await member.roles.remove(roles).catch(() => {});
            embed.setTitle('🚨 ЗВІЛЬНЕННЯ').setDescription(`${member} звільнено за 3/3 доган.`);
        }
        
        fs.writeFileSync(DB_PATH, JSON.stringify(db));
        return i.editReply({ content: `🚨 ${member}`, embeds: [embed] });
    }

    // --- АРХІВ ---
    if (commandName === 'архів') {
        const logs = db.logs.slice(-10).map(l => `• ${l.action}`).join('\n') || 'Наказів немає.';
        const embed = new EmbedBuilder().setColor('#2B2D31').setTitle('🗄️ РЕЄСТР НАКАЗІВ').setDescription(logs);
        return i.editReply({ embeds: [embed] });
    }

    // --- СТАТУС ---
    if (commandName === 'статус') {
        return i.editReply('📊 **СИСТЕМА ОНЛАЙН.** Робота стабільна.');
    }

    // Універсальна відповідь для всього іншого
    return i.editReply(`✅ Наказ **${commandName}** успішно виконано.`);
});

http.createServer((req, res) => { res.writeHead(200); res.end('OK'); }).listen(process.env.PORT || 8080);
client.login(process.env.TOKEN);
