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

    if (!hasAccess(i.member)) return i.editReply({ content: '❌ **ВІДМОВА В ДОСТУПІ.**', ephemeral: true });

    const db = loadDB();
    const { commandName, options, guild, user: admin } = i;

    // --- 1. ЗНЯТИ ДОГАНУ ---
    if (commandName === 'зняти_догану') {
        const target = options.getUser('користувач');
        const count = options.getInteger('кількість') || 1;
        if (!db.users[target.id]) db.users[target.id] = { warns: 0 };
        db.users[target.id].warns = Math.max(0, db.users[target.id].warns - count);
        saveDB(db);
        addLog(`Знято догани (${count}) з ${target.username}`);
        const embed = new EmbedBuilder().setColor('#2ECC71').setTitle('✅ АНУЛЮВАННЯ ДОГАНИ').setDescription(`З працівника ${target} знято дисциплінарне стягнення.\nПоточний статус: \`${db.users[target.id].warns}/3\``);
        return i.editReply({ embeds: [embed] });
    }

    // --- 2. ЗВІЛЬНИТИ ---
    if (commandName === 'звільнити') {
        const target = options.getMember('користувач');
        const rolesToRemove = target.roles.cache.filter(r => r.id !== guild.id && r.id !== EXCLUDE_ROLE);
        await target.roles.remove(rolesToRemove).catch(() => {});
        addLog(`Звільнено працівника: ${target.user.username}`);
        const embed = new EmbedBuilder().setColor('#000000').setTitle('📑 НАКАЗ ПРО ЗВІЛЬНЕННЯ').setDescription(`Працівника ${target} звільнено з займаної посади та позбавлено всіх повноважень.`).addFields({name: '✍️ Підписав', value: `${admin}`});
        return i.editReply({ content: `${target}`, embeds: [embed] });
    }

    // --- 3. ПІДВИЩИТИ ---
    if (commandName === 'підвищити') {
        const target = options.getUser('користувач');
        addLog(`Підвищено у званні: ${target.username}`);
        const embed = new EmbedBuilder().setColor('#F1C40F').setTitle('📈 НАКАЗ ПРО ПІДВИЩЕННЯ').setDescription(`За особливі заслуги перед державою, працівника ${target} підвищено у званні/посаді!`).addFields({name: '✍️ Підписав', value: `${admin}`});
        return i.editReply({ content: `${target}`, embeds: [embed] });
    }

    // --- 4. ЗБОРИ ---
    if (commandName === 'збори') {
        const time = options.getString('час');
        const place = options.getString('місце');
        addLog(`Оголошено збори на ${time}`);
        const embed = new EmbedBuilder().setColor('#FFD700').setTitle('📢 ТЕРМІНОВІ ЗБОРИ ВРУ').setDescription(`@everyone\n**Всім членам фракції терміново прибути!**`).addFields({ name: '🕒 Час', value: `\`${time}\``, inline: true }, { name: '📍 Місце', value: `\`${place}\``, inline: true });
        return i.editReply({ content: '@everyone', embeds: [embed] });
    }

    // --- 5. ГОЛОСУВАННЯ ---
    if (commandName === 'голосування') {
        const question = options.getString('питання');
        const embed = new EmbedBuilder().setColor('#3498DB').setTitle('🗳️ ДЕРЖАВНЕ ГОЛОСУВАННЯ').setDescription(`**Питання:**\n> ${question}`).setFooter({ text: 'Проголосуйте ✅ або ❌' });
        const msg = await i.editReply({ embeds: [embed], fetchReply: true });
        await msg.react('✅'); await msg.react('❌');
        return;
    }

    // --- 6. ЗАКОН / НАКАЗ ---
    if (commandName === 'закон' || commandName === 'наказ') {
        const text = options.getString('текст');
        const embed = new EmbedBuilder()
            .setColor(commandName === 'закон' ? '#0057B7' : '#2C3E50')
            .setTitle(commandName === 'закон' ? '📜 НОВА ПОСТАНОВА ВРУ' : '🎖️ ПРЯМИЙ НАКАЗ КЕРІВНИЦТВА')
            .setDescription(`**Текст документу:**\n${text}`)
            .setFooter({ text: `Видав: ${admin.username}` });
        addLog(`Опубліковано ${commandName}`);
        return i.editReply({ embeds: [embed] });
    }

    // --- 7. СТАТИСТИКА ---
    if (commandName === 'статистика') {
        const totalLogs = db.logs.length;
        const embed = new EmbedBuilder().setColor('#9B59B6').setTitle('📈 ЗВІТНІСТЬ ФРАКЦІЇ').addFields({ name: '📊 Всього наказів в архіві', value: `\`${totalLogs}\`` });
        return i.editReply({ embeds: [embed] });
    }

    // ПРИЙНЯТИ, ДОГАНА, ДОСЬЄ, АРХІВ - залишаємо їх логіку як була, але перевіряємо
    if (commandName === 'прийняти') {
        const target = options.getMember('користувач');
        const pos = options.getString('посада');
        const r1 = options.getRole('роль1');
        if (r1) await target.roles.add(r1).catch(() => {});
        const embed = new EmbedBuilder().setColor('#27AE60').setTitle('📜 НАКАЗ ПРО ПРИЙНЯТТЯ').addFields({ name: '👤 Працівник', value: `${target}`, inline: true }, { name: '💼 Посада', value: `\`${pos}\``, inline: true });
        return i.editReply({ content: `${target}`, embeds: [embed] });
    }

    if (commandName === 'догана') {
        const target = options.getMember('користувач');
        if (!db.users[target.id]) db.users[target.id] = { warns: 0 };
        db.users[target.id].warns += 1;
        const cur = db.users[target.id].warns;
        saveDB(db);
        const embed = new EmbedBuilder().setColor('#C0392B').setTitle('⚠️ ОФІЦІЙНА ДОГАНА').addFields({ name: '👤 Порушник', value: `${target}`, inline: true }, { name: '📊 Статус', value: `\`${cur}/3\``, inline: true });
        if (cur >= 3) {
            db.users[target.id].warns = 0; saveDB(db);
            const roles = target.roles.cache.filter(r => r.id !== guild.id && r.id !== EXCLUDE_ROLE);
            await target.roles.remove(roles).catch(() => {});
            embed.setTitle('🚨 АВТОМАТИЧНЕ ЗВІЛЬНЕННЯ').setDescription(`${target} звільнено за 3 догани.`);
        }
        return i.editReply({ content: `${target}`, embeds: [embed] });
    }

    if (commandName === 'архів') {
        const list = db.logs.filter(l => (Date.now() - l.time) < 86400000).map(l => `• <t:${Math.floor(l.time/1000)}:R> - ${l.action}`).reverse().join('\n') || 'Наказів немає.';
        const embed = new EmbedBuilder().setColor('#2B2D31').setTitle('🗄️ АРХІВ (24г)').setDescription(list);
        return i.editReply({ embeds: [embed] });
    }

    return i.editReply({ content: `✅ Команда **${commandName}** виконана.` });
});

http.createServer((req, res) => { res.writeHead(200); res.end('OK'); }).listen(process.env.PORT || 8080);
client.login(process.env.TOKEN);
