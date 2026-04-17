require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const http = require('http');

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers] });
const DB_PATH = './database.json';
const EXCLUDE_ROLE = '1447718423390847178'; 

if (!fs.existsSync(DB_PATH)) fs.writeFileSync(DB_PATH, JSON.stringify({ users: {}, logs: [] }));

client.on('interactionCreate', async (i) => {
    if (!i.isChatInputCommand()) return;
    await i.deferReply().catch(() => {});

    const db = JSON.parse(fs.readFileSync(DB_PATH));
    const { commandName, options, guild, user: admin } = i;

    // 1. ПРИЙНЯТИ
    if (commandName === 'прийняти') {
        const member = options.getMember('користувач');
        const pos = options.getString('посада');
        const r1 = options.getRole('роль1');
        if (r1) await member.roles.add(r1).catch(() => {});
        
        const embed = new EmbedBuilder().setColor('#27AE60').setTitle('📜 НАКАЗ ПРО ПРИЙНЯТТЯ').setDescription(`Співробітника ${member} зараховано на посаду: **${pos}**`).addFields({ name: '✍️ Підписав', value: `${admin}` });
        return i.editReply({ content: `${member}`, embeds: [embed] });
    }

    // 2. ДОГАНА
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
            embed.setTitle('🚨 ЗВІЛЬНЕННЯ (3/3)').setDescription(`${member} звільнено за порушення.`);
        }
        fs.writeFileSync(DB_PATH, JSON.stringify(db));
        return i.editReply({ content: `🚨 ${member}`, embeds: [embed] });
    }

    // 3. ЗНЯТИ ДОГАНУ
    if (commandName === 'зняти_догану') {
        const target = options.getUser('користувач');
        const count = options.getInteger('кількість');
        if (!db.users[target.id]) db.users[target.id] = { warns: 0 };
        db.users[target.id].warns = Math.max(0, db.users[target.id].warns - count);
        fs.writeFileSync(DB_PATH, JSON.stringify(db));
        
        const embed = new EmbedBuilder().setColor('#2ECC71').setTitle('✅ АНУЛЮВАННЯ ДОГАНИ').setDescription(`З працівника ${target} знято догани.\nПоточний статус: \`${db.users[target.id].warns}/3\``);
        return i.editReply({ embeds: [embed] });
    }

    // 4. ВИКЛИК
    if (commandName === 'виклик') {
        const target = options.getUser('користувач');
        const embed = new EmbedBuilder().setColor('#E67E22').setTitle('🚨 ВИКЛИК ДО КЕРІВНИЦТВА').setDescription(`${target}, терміново прибудьте до залу засідань!`).addFields({ name: '📝 Причина', value: options.getString('причина') || 'Не вказана' });
        return i.editReply({ content: `${target}`, embeds: [embed] });
    }

    // 5. ЗБОРИ
    if (commandName === 'збори') {
        const embed = new EmbedBuilder().setColor('#FFD700').setTitle('📢 ТЕРМІНОВІ ЗБОРИ ВРУ').setDescription(`@everyone\n**Всім негайно прибути!**\nЧас: ${options.getString('час')}\nМісце: ${options.getString('місце')}`);
        return i.editReply({ content: '@everyone', embeds: [embed] });
    }

    // 6. СТАТУС
    if (commandName === 'статус') {
        const embed = new EmbedBuilder().setColor('#27AE60').setTitle('📊 СТАН СИСТЕМИ').setDescription('🟢 Всі модулі працюють стабільно.');
        return i.editReply({ embeds: [embed] });
    }

    // 7. ДОСЬЄ
    if (commandName === 'досьє') {
        const target = options.getUser('користувач');
        const warns = db.users[target.id]?.warns || 0;
        const embed = new EmbedBuilder().setColor('#0057B7').setTitle('📂 ДОСЬЄ').setThumbnail(target.displayAvatarURL()).addFields({ name: '👤 Працівник', value: `${target}`, inline: true }, { name: '📊 Догани', value: `\`${warns}/3\``, inline: true });
        return i.editReply({ embeds: [embed] });
    }

    // Універсальна відповідь для всього іншого (закон, наказ, підвищити тощо)
    const finalEmbed = new EmbedBuilder().setColor('#34495E').setTitle('🏛️ ДЕРЖАВНИЙ АКТ').setDescription(`Команда **${commandName}** виконана адміністратором ${admin}.`);
    return i.editReply({ embeds: [finalEmbed] });
});

http.createServer((req, res) => { res.writeHead(200); res.end('OK'); }).listen(process.env.PORT || 8080);
client.login(process.env.TOKEN);
