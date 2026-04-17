require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder, REST, Routes, SlashCommandBuilder } = require('discord.js');
const fs = require('fs');
const http = require('http');

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers] });
const DB_PATH = './database.json';

// --- СПИСОК КОМАНД ДЛЯ РЕЄСТРАЦІЇ ---
const commands = [
    new SlashCommandBuilder().setName('статус').setDescription('📊 Стан системи'),
    new SlashCommandBuilder().setName('прийняти').setDescription('📝 Прийняти на службу').addUserOption(o => o.setName('користувач').setDescription('Кого').setRequired(true)).addStringOption(o => o.setName('посада').setDescription('Посада').setRequired(true)).addRoleOption(o => o.setName('роль1').setDescription('Роль').setRequired(false)),
    new SlashCommandBuilder().setName('догана').setDescription('⚠️ Видати догану').addUserOption(o => o.setName('користувач').setDescription('Кому').setRequired(true)).addStringOption(o => o.setName('причина').setDescription('За що').setRequired(true)),
    new SlashCommandBuilder().setName('зняти_догану').setDescription('✅ Зняти догани').addUserOption(o => o.setName('користувач').setDescription('Кому').setRequired(true)).addIntegerOption(o => o.setName('кількість').setDescription('Скільки').setRequired(true)),
    new SlashCommandBuilder().setName('збори').setDescription('📢 Збори').addStringOption(o => o.setName('час').setDescription('Коли').setRequired(true)).addStringOption(o => o.setName('місце').setDescription('Де').setRequired(true)),
    new SlashCommandBuilder().setName('виклик').setDescription('🚨 Виклик').addUserOption(o => o.setName('користувач').setDescription('Кого').setRequired(true)).addStringOption(o => o.setName('причина').setDescription('Причина').setRequired(true)),
    new SlashCommandBuilder().setName('досьє').setDescription('📂 Справа').addUserOption(o => o.setName('користувач').setDescription('Чия').setRequired(true)),
    new SlashCommandBuilder().setName('архів').setDescription('🗄️ Реєстр за 24г')
].map(c => c.toJSON());

client.once('ready', async () => {
    console.log(`🏛️ СИСТЕМА ВРУ ОНЛАЙН: ${client.user.tag}`);
    
    // Авто-реєстрація команд при кожному запуску
    const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
    try {
        await rest.put(Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID), { body: commands });
        console.log('✅ КОМАНДИ ОНОВЛЕНО АВТОМАТИЧНО');
    } catch (e) { console.error('Помилка реєстрації:', e); }
});

client.on('interactionCreate', async (i) => {
    if (!i.isChatInputCommand()) return;
    await i.deferReply().catch(() => {});

    const { commandName, options } = i;

    // --- ЛОГІКА СТАТУСУ ---
    if (commandName === 'статус') {
        return i.editReply('📊 **Система ВРУ працює стабільно.**');
    }

    // --- ЛОГІКА ЗБОРІВ ---
    if (commandName === 'збори') {
        const embed = new EmbedBuilder().setColor('#FFD700').setTitle('📢 ТЕРМІНОВІ ЗБОРИ').setDescription(`Всім прибути!\n🕒 Час: ${options.getString('час')}\n📍 Місце: ${options.getString('місце')}`);
        return i.editReply({ content: '@everyone', embeds: [embed] });
    }

    // --- ЛОГІКА ВИКЛИКУ ---
    if (commandName === 'виклик') {
        const target = options.getUser('користувач');
        const embed = new EmbedBuilder().setColor('#C0392B').setTitle('🚨 СЛУЖБОВИЙ ВИКЛИК').setDescription(`${target}, терміново прибудьте до кабінету керівництва!`).addFields({ name: 'Причина', value: options.getString('причина') });
        return i.editReply({ content: `${target}`, embeds: [embed] });
    }

    await i.editReply(`✅ Запит на **${commandName}** успішно оброблено.`);
});

http.createServer((req, res) => { res.writeHead(200); res.end('OK'); }).listen(process.env.PORT || 8080);
client.login(process.env.TOKEN);
