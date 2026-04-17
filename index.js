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

    // ЛІКИ ВІД "ДУМАЄ": Бот миттєво каже Дискорду, що він працює
    await i.deferReply().catch(() => {});

    if (!hasAccess(i.member)) return i.editReply({ content: '❌ **ВІДМОВА У ДОСТУПІ.**', ephemeral: true });

    const db = loadDB();
    const { commandName, options, guild, user: admin } = i;

    // --- ПРИЙНЯТИ ---
    if (commandName === 'прийняти') {
        const target = options.getMember('користувач');
        const pos = options.getString('посада');
        const r1 = options.getRole('роль1');
        const r2 = options.getRole('роль2');

        if (r1) await target.roles.add(r1).catch(() => {});
        if (r2) await target.roles.add(r2).catch(() => {});

        const embed = new EmbedBuilder()
            .setColor('#27AE60').setTitle('📜 НАКАЗ ПРО ПРИЙНЯТТЯ НА СЛУЖБУ')
            .addFields(
                { name: '👤 Співробітник', value: `${target}`, inline: true },
                { name: '💼 Посада', value: `\`${pos}\``, inline: true },
                { name: '✍️ Підписав', value: `${admin}`, inline: true }
            ).setFooter({ text: 'Верховна Рада України' }).setTimestamp();

        addLog(`Прийнято: ${target.user.username} (Підпис: ${admin.username})`);
        return i.editReply({ content: `${target}`, embeds: [embed] });
    }

    // --- ЗНЯТИ ДОГАНУ ---
    if (commandName === 'зняти_догану') {
        const targetUser = options.getUser('користувач');
        const count = options.getInteger('кількість') || 1;
        if (!db.users[targetUser.id]) db.users[targetUser.id] = { warns: 0 };
        
        db.users[targetUser.id].warns = Math.max(0, db.users[targetUser.id].warns - count);
        saveDB(db);

        const embed = new EmbedBuilder()
            .setColor('#2ECC71').setTitle('✅ АНУЛЮВАННЯ ДОГАНИ')
            .setDescription(`З працівника ${targetUser} знято догани (${count} шт.)\nПоточний статус: \`${db.users[targetUser.id].warns}/3\``)
            .addFields({ name: '✍️ Відповідальний', value: `${admin}` });

        addLog(`Знято догани (${count}) з ${targetUser.username} (Підпис: ${admin.username})`);
        return i.editReply({ embeds: [embed] });
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
            embed.setTitle('🚨 НАКАЗ ПРО ЗВІЛЬНЕННЯ').setColor('#000000').setDescription(`${target} звільнено за 3/3 доган.`);
        }
        addLog(`Догана: ${target.user.username} (${cur}/3) від ${admin.username}`);
        return i.editReply({ content: `🚨 Увага! ${target}`, embeds: [embed] });
    }

    // --- ЗБОРИ ---
    if (commandName === 'збори') {
        const embed = new EmbedBuilder()
            .setColor('#FFD700').setTitle('📢 ТЕРМІНОВІ ЗБОРИ')
            .setDescription(`@everyone\n**Всім негайно прибути на засідання!**`)
            .addFields({ name: '🕒 Час', value: options.getString('час') }, { name: '📍 Місце', value: options.getString('місце') });
        return i.editReply({ content: '@everyone', embeds: [embed] });
    }

    // --- АРХІВ ---
    if (commandName === 'архів') {
        const logs = db.logs.filter(l => (Date.now() - l.time) < 86400000)
            .map(l => `• <t:${Math.floor(l.time/1000)}:R> — **${l.action}**`).reverse().join('\n') || 'Наказів немає.';
        const embed = new EmbedBuilder().setColor('#2B2D31').setTitle('🗄️ ЕЛЕКТРОННИЙ РЕЄСТР').setDescription(logs);
        return i.editReply({ embeds: [embed] });
    }

    if (commandName === 'статус') return i.editReply('📊 **Система ВРУ онлайн.**');
});

http.createServer((req, res) => { res.writeHead(200); res.end('OK'); }).listen(process.env.PORT || 8080);
client.login(process.env.TOKEN);
