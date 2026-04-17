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
    if (db.logs.length > 50) db.logs.shift();
    saveDB(db);
}

function hasAccess(member) {
    return member.permissions.has(PermissionFlagsBits.Administrator) || member.roles.cache.some(r => ALLOWED_ROLES.includes(r.id));
}

client.on('interactionCreate', async (i) => {
    if (!i.isChatInputCommand()) return;

    // МИТТЄВА РЕАКЦІЯ: Бот каже Дискорду "Я прийняв, виконую..."
    await i.deferReply().catch(() => {});

    if (!hasAccess(i.member)) {
        return i.editReply({ content: '❌ **ВІДМОВА В ДОСТУПІ:** Ваших повноважень недостатньо для використання державної системи.', ephemeral: true });
    }

    const db = loadDB();
    const { commandName, options, guild, user: admin } = i;

    // --- СТАТУС ---
    if (commandName === 'статус') {
        const embed = new EmbedBuilder()
            .setColor('#27AE60')
            .setTitle('📊 МОНІТОРИНГ СИСТЕМИ ВРУ')
            .setDescription('✅ **Всі державні модулі активні.**\nЗв’язок із сервером: Стабільний.')
            .setFooter({ text: 'Державна канцелярія ВРУ' });
        return i.editReply({ embeds: [embed] });
    }

    // --- ПРИЙНЯТИ ---
    if (commandName === 'прийняти') {
        const target = options.getMember('користувач');
        const pos = options.getString('посада');
        const r1 = options.getRole('роль1');
        const r2 = options.getRole('роль2');

        if (r1) await target.roles.add(r1).catch(() => {});
        if (r2) await target.roles.add(r2).catch(() => {});

        const embed = new EmbedBuilder()
            .setColor('#27AE60')
            .setTitle('📜 НАКАЗ ПРО ЗАРАХУВАННЯ')
            .setDescription(`**Згідно з рішенням апарату ВРУ, громадянина призначено на службу.**`)
            .setThumbnail(target.user.displayAvatarURL())
            .addFields(
                { name: '👤 Працівник', value: `${target}`, inline: true },
                { name: '💼 Посада', value: `\`${pos}\``, inline: true },
                { name: '✍️ Підписав', value: `${admin}`, inline: true }
            )
            .setFooter({ text: 'ВРУ • Відділ кадрів' }).setTimestamp();

        addLog(`Прийнято: ${target.user.username} на ${pos}`);
        return i.editReply({ content: `${target}`, embeds: [embed] });
    }

    // --- ДОГАНА ---
    if (commandName === 'догана') {
        const target = options.getMember('користувач');
        const reason = options.getString('причина');
        
        if (!db.users[target.id]) db.users[target.id] = { warns: 0 };
        db.users[target.id].warns += 1;
        const cur = db.users[target.id].warns;
        saveDB(db);

        const embed = new EmbedBuilder()
            .setColor('#C0392B')
            .setTitle('⚠️ ОФІЦІЙНА ДОГАНА')
            .setDescription(`**Повідомлення про дисциплінарне стягнення.**`)
            .addFields(
                { name: '👤 Порушник', value: `${target}`, inline: true },
                { name: '📊 Статус', value: `\`${cur}/3\``, inline: true },
                { name: '👮 Видав', value: `${admin}`, inline: true },
                { name: '📝 Підстава', value: `*${reason}*` }
            );

        if (cur >= 3) {
            db.users[target.id].warns = 0; saveDB(db);
            const roles = target.roles.cache.filter(r => r.id !== guild.id && r.id !== EXCLUDE_ROLE);
            await target.roles.remove(roles).catch(() => {});
            embed.setTitle('🚨 НАКАЗ ПРО ЗВІЛЬНЕННЯ (3/3)').setColor('#000000').setDescription(`Працівника ${target} звільнено за систематичні порушення.`);
            addLog(`Звільнено (3/3): ${target.user.username}`);
        } else {
            addLog(`Догана: ${target.user.username} від ${admin.username}`);
        }
        return i.editReply({ content: `🚨 Увага! ${target}`, embeds: [embed] });
    }

    // --- ЗНЯТИ ДОГАНУ ---
    if (commandName === 'зняти_догану') {
        const targetUser = options.getUser('користувач');
        const count = options.getInteger('кількість');
        if (!db.users[targetUser.id]) db.users[targetUser.id] = { warns: 0 };
        db.users[targetUser.id].warns = Math.max(0, db.users[targetUser.id].warns - count);
        saveDB(db);

        const embed = new EmbedBuilder()
            .setColor('#2ECC71')
            .setTitle('✅ АНУЛЮВАННЯ ДОГАНИ')
            .setDescription(`З працівника ${targetUser} знято дисциплінарне стягнення.`)
            .addFields({ name: '📊 Поточний статус', value: `\`${db.users[targetUser.id].warns}/3\`` })
            .setFooter({ text: 'Канцелярія ВРУ' });

        addLog(`Знято догани (${count}) з ${targetUser.username}`);
        return i.editReply({ embeds: [embed] });
    }

    // --- ЗБОРИ ---
    if (commandName === 'збори') {
        const time = options.getString('час');
        const place = options.getString('місце');
        const embed = new EmbedBuilder()
            .setColor('#FFD700')
            .setTitle('📢 ТЕРМІНОВІ ЗБОРИ ВРУ')
            .setDescription(`@everyone\n\n**Всім членам Верховної Ради терміново з'явитися!**`)
            .addFields({ name: '🕒 Час', value: `\`${time}\``, inline: true }, { name: '📍 Локація', value: `\`${place}\``, inline: true })
            .setFooter({ text: 'Державна канцелярія • Явка обов’язкова' });

        addLog(`Збори оголошено на ${time}`);
        return i.editReply({ content: '@everyone', embeds: [embed] });
    }

    // --- АРХІВ ---
    if (commandName === 'архів') {
        const logs = db.logs.filter(l => (Date.now() - l.time) < 86400000)
            .map(l => `• <t:${Math.floor(l.time/1000)}:R> — **${l.action}**`).reverse().join('\n') || 'Наказів не знайдено.';

        const embed = new EmbedBuilder().setColor('#2B2D31').setTitle('🗄️ ЕЛЕКТРОННИЙ РЕЄСТР НАКАЗІВ').setDescription(logs);
        return i.editReply({ embeds: [embed] });
    }
});

http.createServer((req, res) => { res.writeHead(200); res.end('OK'); }).listen(process.env.PORT || 8080);
client.login(process.env.TOKEN);
