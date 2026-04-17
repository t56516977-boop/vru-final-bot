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

    if (!hasAccess(i.member)) return i.editReply({ content: '❌ **ВІДМОВА В ДОСТУПІ:** Недостатній рівень секретності.', ephemeral: true });

    const db = loadDB();
    const { commandName, options, user: admin } = i;
    const dateNow = new Date().toLocaleString('uk-UA', { timeZone: 'Europe/Kyiv' });

    // --- 1. ПРИЙНЯТИ ---
    if (commandName === 'прийняти') {
        const target = options.getMember('користувач');
        const pos = options.getString('посада');
        const r1 = options.getRole('роль1');
        if (r1) await target.roles.add(r1).catch(() => {});

        const embed = new EmbedBuilder()
            .setColor('#27AE60').setTitle('📜 НАКАЗ ПРО ПРИЙНЯТТЯ НА СЛУЖБУ')
            .setThumbnail(target.user.displayAvatarURL())
            .addFields(
                { name: '👤 Працівник', value: `${target}`, inline: true },
                { name: '💼 Посада', value: `\`${pos}\``, inline: true },
                { name: '📅 Дата наказу', value: `\`${dateNow}\``, inline: true },
                { name: '✍️ Підписав', value: `${admin}`, inline: false }
            ).setFooter({ text: 'ВРУ • Департамент персоналу' });

        addLog(`Прийнято: ${target.user.username} на ${pos} (Відповідальний: ${admin.username})`);
        return i.editReply({ content: `${target}`, embeds: [embed] });
    }

    // --- 2. ДОГАНА ---
    if (commandName === 'догана') {
        const target = options.getMember('користувач');
        const reason = options.getString('причина');
        if (!db.users[target.id]) db.users[target.id] = { warns: 0 };
        db.users[target.id].warns += 1;
        const cur = db.users[target.id].warns;
        saveDB(db);

        const embed = new EmbedBuilder()
            .setColor('#C0392B').setTitle('⚠️ ОФІЦІЙНА ДОГАНА ВРУ')
            .addFields(
                { name: '👤 Порушник', value: `${target}`, inline: true },
                { name: '📊 Статус доган', value: `\`${cur}/3\``, inline: true },
                { name: '📅 Дата винесення', value: `\`${dateNow}\``, inline: true },
                { name: '📝 Причина', value: `*${reason}*`, inline: false },
                { name: '👮 Видав наказ', value: `${admin}`, inline: false }
            ).setFooter({ text: 'Дисциплінарна комісія ВРУ' });

        if (cur >= 3) {
            db.users[target.id].warns = 0; saveDB(db);
            const roles = target.roles.cache.filter(r => r.id !== i.guild.id && r.id !== EXCLUDE_ROLE);
            await target.roles.remove(roles).catch(() => {});
            embed.setTitle('🚨 АВТОМАТИЧНЕ ЗВІЛЬНЕННЯ (3/3)').setColor('#000000').setDescription(`Співробітника ${target} звільнено за систематичні порушення.`);
        }
        addLog(`Догана: ${target.user.username} (${cur}/3) від ${admin.username}`);
        return i.editReply({ content: `🚨 Увага працівнику! ${target}`, embeds: [embed] });
    }

    // --- 3. ВИКЛИК ---
    if (commandName === 'виклик') {
        const target = options.getUser('користувач');
        const reason = options.getString('причина');
        const embed = new EmbedBuilder()
            .setColor('#E67E22').setTitle('🚨 СЛУЖБОВИЙ ВИКЛИК НА КИЛИМ')
            .setDescription(`${target}, за розпорядженням керівництва вам наказано негайно з'явитися до залу засідань!`)
            .addFields(
                { name: '📝 Мета виклику', value: `*${reason}*` },
                { name: '📅 Дата/Час виклику', value: `\`${dateNow}\`` },
                { name: '👮 Хто викликає', value: `${admin}` }
            );
        return i.editReply({ content: `${target}`, embeds: [embed] });
    }

    // --- 4. СТАТУС ---
    if (commandName === 'статус') {
        const embed = new EmbedBuilder()
            .setColor('#27AE60').setTitle('📊 СТАН СИСТЕМИ ВРУ')
            .addFields(
                { name: '📡 Канал зв’язку', value: '🟢 Стабільний', inline: true },
                { name: '🗄️ База даних', value: '🟢 Активна', inline: true },
                { name: '🤖 Модулі ВРУ', value: '🟢 Онлайн', inline: true }
            );
        return i.editReply({ embeds: [embed] });
    }

    // --- 5. ДОСЬЄ ---
    if (commandName === 'досьє') {
        const target = options.getUser('користувач');
        const warns = db.users[target.id]?.warns || 0;
        const embed = new EmbedBuilder()
            .setColor('#0057B7').setTitle('📂 ОФІЦІЙНЕ ДОСЬЄ СПІВРОБІТНИКА')
            .setThumbnail(target.displayAvatarURL())
            .addFields(
                { name: '👤 Прізвище Ім’я', value: `${target}`, inline: true },
                { name: '⚠️ Активні догани', value: `\`${warns}/3\``, inline: true },
                { name: '🏛️ Організація', value: 'Верховна Рада України' }
            ).setFooter({ text: 'Перевірка за базою даних МВС' });
        return i.editReply({ embeds: [embed] });
    }

    // --- 6. ДОПОМОГА ---
    if (commandName === 'допомога') {
        const embed = new EmbedBuilder()
            .setColor('#34495E').setTitle('❓ ІНСТРУКЦІЯ ПО РОБОТІ З СИСТЕМОЮ')
            .setDescription('**Команди управління фракцією:**\n`/прийняти` — зарахувати особу\n`/звільнити` — припинити повноваження\n`/догана` — дисциплінарний захід\n`/збори` — скликати всіх\n`/виклик` — викликати до кабінету\n`/статус` — перевірка зв’язку');
        return i.editReply({ embeds: [embed] });
    }

    // --- 7. ПЕРЕВІРКА ---
    if (commandName === 'перевірка') {
        const embed = new EmbedBuilder()
            .setColor('#F1C40F').setTitle('🔍 СЛУЖБОВА ПЕРЕВІРКА ПРИСУТНОСТІ')
            .setDescription(`@everyone\n\n**Проводиться раптова перевірка! Кожному члену ВРУ негайно відписати свою присутність у даному каналі.**`)
            .addFields({ name: '📝 Перевіряючий', value: `${admin}` });
        return i.editReply({ content: '@everyone', embeds: [embed] });
    }

    // Для команд, які ще не мають дизайну (архів, голосування тощо)
    if (!i.replied && !i.deferred) await i.editReply({ content: `✅ Команда **${commandName}** виконана.` });
});

http.createServer((req, res) => { res.writeHead(200); res.end('OK'); }).listen(process.env.PORT || 8080);
client.login(process.env.TOKEN);
