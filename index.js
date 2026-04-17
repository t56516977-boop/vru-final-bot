require('dotenv').config();
const fs = require('fs');
const http = require('http');
const { Client, GatewayIntentBits, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildMessages] });

// Конфігурація
const DB_PATH = './database.json';
const EXCLUDE_ROLE = '1447718423390847178'; 
const ALLOWED_ROLES = ['1447679308050071623', '1476850285950402590', '1383809507251191830', '1383809217701613588', '1448618012176416872', '1448586089840377897', '1383809053813379103'];

// Ініціалізація БД
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

    // МИТТЄВА РЕАКЦІЯ (Захист від лагів)
    await i.deferReply().catch(() => {});

    const hasAccess = i.member.permissions.has(PermissionFlagsBits.Administrator) || i.member.roles.cache.some(r => ALLOWED_ROLES.includes(r.id));
    if (!hasAccess) return i.editReply({ content: '❌ **ВІДМОВА В ДОСТУПІ:** Недостатній рівень секретності.' });

    const db = loadDB();
    const { commandName, options, guild, user: admin } = i;
    const timestamp = `📅 Дата: ${getKyivDate()}`;

    // --- 📝 ПРИЙНЯТИ НА СЛУЖБУ ---
    if (commandName === 'прийняти') {
        const target = options.getMember('користувач');
        const pos = options.getString('посада');
        const r1 = options.getRole('роль1');
        const r2 = options.getRole('роль2');

        if (r1) await target.roles.add(r1).catch(() => {});
        if (r2) await target.roles.add(r2).catch(() => {});

        const embed = new EmbedBuilder()
            .setColor('#27AE60').setTitle('📜 НАКАЗ ПРО ПРИЙНЯТТЯ НА ПОСАДУ')
            .setThumbnail(target.user.displayAvatarURL())
            .setDescription(`> **Верховна Рада України офіційно повідомляє про нове призначення.**`)
            .addFields(
                { name: '👤 Працівник', value: `${target}`, inline: true },
                { name: '💼 Посада', value: `\`${pos}\``, inline: true },
                { name: '✍️ Підписано', value: `${admin}`, inline: true },
                { name: '📂 Статус', value: '🟢 Зараховано до штату', inline: false }
            )
            .setFooter({ text: `ВРУ • Кадровий реєстр | ${timestamp}` });

        addLog(`Прийнято: ${target.user.username} (${pos})`);
        return i.editReply({ content: `${target}`, embeds: [embed] });
    }

    // --- ⚠️ ДОГАНА ---
    if (commandName === 'догана') {
        const target = options.getMember('користувач');
        const reason = options.getString('причина');
        if (!db.users[target.id]) db.users[target.id] = { warns: 0 };
        db.users[target.id].warns += 1;
        const cur = db.users[target.id].warns;
        saveDB(db);

        const embed = new EmbedBuilder()
            .setColor('#C0392B').setTitle('🚨 ОФІЦІЙНА ДОГАНА ВРУ')
            .setDescription(`> **За порушення встановленого державного регламенту.**`)
            .addFields(
                { name: '👤 Порушник', value: `${target}`, inline: true },
                { name: '📊 Статус', value: `\`${cur}/3\``, inline: true },
                { name: '👮 Видав', value: `${admin}`, inline: true },
                { name: '📝 Підстава', value: `*${reason}*` }
            ).setFooter({ text: timestamp });

        if (cur >= 3) {
            db.users[target.id].warns = 0; saveDB(db);
            const roles = target.roles.cache.filter(r => r.id !== guild.id && r.id !== EXCLUDE_ROLE);
            await target.roles.remove(roles).catch(() => {});
            embed.setTitle('🔔 АВТОМАТИЧНЕ ЗВІЛЬНЕННЯ (3/3)').setColor('#000000').setDescription(`Працівника ${target} звільнено за систематичні порушення.`);
            addLog(`Авто-звільнення: ${target.user.username}`);
        } else { addLog(`Догана: ${target.user.username} (${cur}/3) від ${admin.username}`); }
        return i.editReply({ content: `🚨 **УВАГА!** ${target}`, embeds: [embed] });
    }

    // --- 🗳️ ГОЛОСУВАННЯ ---
    if (commandName === 'голосування') {
        const q = options.getString('питання');
        const embed = new EmbedBuilder()
            .setColor('#3498DB').setTitle('🗳️ ДЕРЖАВНЕ ГОЛОСУВАННЯ')
            .setDescription(`**Питання на порядку денному:**\n\n> ${q}`)
            .addFields({ name: '👤 Ініціатор', value: `${admin}` })
            .setFooter({ text: `ВРУ • Виборча комісія | ${timestamp}` });

        const msg = await i.editReply({ embeds: [embed], fetchReply: true });
        await msg.react('✅'); await msg.react('❌');
        return;
    }

    // --- 📜 ЗАКОН / НАКАЗ ---
    if (commandName === 'закон' || commandName === 'наказ') {
        const text = options.getString('текст');
        const embed = new EmbedBuilder()
            .setColor(commandName === 'закон' ? '#0057B7' : '#2C3E50')
            .setTitle(commandName === 'закон' ? '📜 НОВА ПОСТАНОВА ВРУ' : '🎖️ ПРЯМИЙ НАКАЗ КЕРІВНИЦТВА')
            .setDescription(`**Зміст документу:**\n\n${text}`)
            .addFields({ name: '✍️ Підписав', value: `${admin}` })
            .setFooter({ text: timestamp });
        addLog(`Видано ${commandName}`);
        return i.editReply({ embeds: [embed] });
    }

    // --- 📢 ЗБОРИ ---
    if (commandName === 'збори') {
        const embed = new EmbedBuilder()
            .setColor('#FFD700').setTitle('📢 ТЕРМІНОВІ ЗБОРИ ВРУ')
            .setDescription(`@everyone\n\n**Всім членам Верховної Ради терміново прибути на засідання!**`)
            .addFields(
                { name: '🕒 Час', value: `\`${options.getString('час')}\``, inline: true },
                { name: '📍 Місце', value: `\`${options.getString('місце')}\``, inline: true },
                { name: '👮 Організатор', value: `${admin}` }
            ).setFooter({ text: timestamp });
        return i.editReply({ content: '@everyone', embeds: [embed] });
    }

    // --- 🔍 ПЕРЕВІРКА ---
    if (commandName === 'перевірка') {
        const embed = new EmbedBuilder()
            .setColor('#E67E22').setTitle('🔍 СЛУЖБОВА ПЕРЕВІРКА ПРИСУТНОСТІ')
            .setDescription(`@everyone\n\n**Проводиться раптова перевірка! Кожному члену ВРУ негайно відписати свою присутність.**`)
            .setFooter({ text: timestamp });
        return i.editReply({ content: '@everyone', embeds: [embed] });
    }

    // --- 📂 ДОСЬЄ ---
    if (commandName === 'досьє') {
        const target = options.getUser('користувач');
        const warns = db.users[target.id]?.warns || 0;
        const embed = new EmbedBuilder()
            .setColor('#0057B7').setTitle('📂 ОФІЦІЙНЕ ДОСЬЄ')
            .setThumbnail(target.displayAvatarURL())
            .addFields(
                { name: '👤 Співробітник', value: `${target}`, inline: true },
                { name: '📊 Статус доган', value: `\`${warns}/3\``, inline: true }
            );
        return i.editReply({ embeds: [embed] });
    }

    // --- 📊 СТАТУС ---
    if (commandName === 'статус') {
        const embed = new EmbedBuilder()
            .setColor('#27AE60').setTitle('📊 СТАН СИСТЕМИ ВРУ')
            .addFields(
                { name: '📡 Зв’язок', value: '🟢 Стабільний', inline: true },
                { name: '📂 БД', value: '🟢 Активна', inline: true },
                { name: '🤖 Модулі', value: '🟢 Онлайн', inline: true }
            );
        return i.editReply({ embeds: [embed] });
    }

    // Універсальна відповідь для інших команд
    return i.editReply({ content: `✅ Запит на **${commandName}** успішно оброблено державною системою.` });
});

http.createServer((req, res) => { res.writeHead(200); res.end('OK'); }).listen(process.env.PORT || 8080);
client.login(process.env.TOKEN);
