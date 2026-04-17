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

    await i.deferReply().catch(() => {});

    if (!hasAccess(i.member)) {
        return i.editReply({ content: '❌ **ВІДМОВА В ДОСТУПІ:** Недостатній рівень повноважень.' });
    }

    const db = loadDB();
    const { commandName, options, guild, user: admin } = i;

    // --- СТАТУС ---
    if (commandName === 'статус') {
        const embed = new EmbedBuilder()
            .setColor('#27AE60').setTitle('📊 СТАН ДЕРЖАВНОЇ СИСТЕМИ ВРУ')
            .addFields(
                { name: '🌐 Зв’язок', value: '🟢 Стабільний', inline: true },
                { name: '📂 База даних', value: '🟢 Активна', inline: true },
                { name: '🤖 Версія', value: 'v2.1 PRO', inline: true }
            ).setFooter({ text: 'Система працює в штатному режимі' });
        return i.editReply({ embeds: [embed] });
    }

    // --- ПРИЙНЯТИ ---
    if (commandName === 'прийняти') {
        const target = options.getMember('користувач');
        const pos = options.getString('посада');
        const r1 = options.getRole('роль1');
        if (r1) await target.roles.add(r1).catch(() => {});

        const embed = new EmbedBuilder()
            .setColor('#27AE60').setTitle('📜 НАКАЗ ПРО ПРИЙНЯТТЯ НА СЛУЖБУ')
            .addFields(
                { name: '👤 Працівник', value: `${target}`, inline: true },
                { name: '💼 Посада', value: `\`${pos}\``, inline: true },
                { name: '✍️ Підписав', value: `${admin}`, inline: true }
            ).setThumbnail(target.user.displayAvatarURL());
        addLog(`Прийнято: ${target.user.username} (${pos})`);
        return i.editReply({ content: `${target}`, embeds: [embed] });
    }

    // --- ДОГАНА ---
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
                { name: '📝 Причина', value: options.getString('причина') }
            );

        if (cur >= 3) {
            db.users[target.id].warns = 0; saveDB(db);
            const roles = target.roles.cache.filter(r => r.id !== guild.id && r.id !== EXCLUDE_ROLE);
            await target.roles.remove(roles).catch(() => {});
            embed.setTitle('🚨 АВТОМАТИЧНЕ ЗВІЛЬНЕННЯ').setColor('#000000').setDescription(`${target} звільнено за 3 догани.`);
            addLog(`Звільнено (3/3): ${target.user.username}`);
        } else { addLog(`Догана: ${target.user.username} (${cur}/3)`); }
        return i.editReply({ content: `🚨 Увага! ${target}`, embeds: [embed] });
    }

    // --- ДОСЬЄ ---
    if (commandName === 'досьє') {
        const targetUser = options.getUser('користувач');
        const warns = db.users[targetUser.id]?.warns || 0;
        const embed = new EmbedBuilder()
            .setColor('#0057B7').setTitle('📂 ОФІЦІЙНЕ ДОСЬЄ')
            .setThumbnail(targetUser.displayAvatarURL())
            .addFields(
                { name: '👤 Співробітник', value: `${targetUser}`, inline: true },
                { name: '📊 Статус доган', value: `\`${warns}/3\``, inline: true }
            ).setFooter({ text: 'База даних ВРУ' });
        return i.editReply({ embeds: [embed] });
    }

    // --- ПЕРЕВІРКА ---
    if (commandName === 'перевірка') {
        const embed = new EmbedBuilder()
            .setColor('#E67E22').setTitle('🔍 ПЕРЕВІРКА ПРИСУТНОСТІ')
            .setDescription(`@everyone\n\n**Всім членам фракції негайно відписати в чат або зайти в голосовий канал!**`)
            .setFooter({ text: 'Проводиться службова перевірка' });
        return i.editReply({ content: '@everyone', embeds: [embed] });
    }

    // --- ДОПОМОГА ---
    if (commandName === 'допомога') {
        const embed = new EmbedBuilder()
            .setColor('#34495E').setTitle('❓ ІНСТРУКЦІЯ ТА КОМАНДИ')
            .setDescription('**Доступні дії:**\n`/прийняти` - Зарахувати в штат\n`/догана` - Видати попередження\n`/збори` - Скликати всіх\n`/архів` - Реєстр наказів\n`/статус` - Стан бота');
        return i.editReply({ embeds: [embed] });
    }

    // --- АРХІВ ---
    if (commandName === 'архів') {
        const logs = db.logs.filter(l => (Date.now() - l.time) < 86400000)
            .map(l => `• <t:${Math.floor(l.time/1000)}:R> — **${l.action}**`).reverse().join('\n') || 'Наказів немає.';
        const embed = new EmbedBuilder().setColor('#2B2D31').setTitle('🗄️ АРХІВ НАКАЗІВ').setDescription(logs);
        return i.editReply({ embeds: [embed] });
    }

    // Решта команд (універсальна картка)
    const finalEmbed = new EmbedBuilder()
        .setColor('#95A5A6')
        .setTitle('🏛️ ДЕРЖАВНА ОПЕРАЦІЯ')
        .setDescription(`Команда **${commandName}** успішно виконана адміністратором ${admin}.`);
    return i.editReply({ embeds: [finalEmbed] });
});

http.createServer((req, res) => { res.writeHead(200); res.end('OK'); }).listen(process.env.PORT || 8080);
client.login(process.env.TOKEN);
