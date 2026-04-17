const { REST, Routes, SlashCommandBuilder } = require('discord.js');

const TOKEN = 'ТУТ_ТВОЙ_ТОКЕН';
const CLIENT_ID = 'АЙДИ_БОТА';
const GUILD_ID = 'АЙДИ_СЕРВЕРА';

const commands = [

  new SlashCommandBuilder()
    .setName('редагування')
    .setDescription('Налаштувати доступ до команд')
    .addStringOption(o => o.setName('команда').setRequired(true))
    .addRoleOption(o => o.setName('роль').setRequired(true)),

  new SlashCommandBuilder()
    .setName('прийняти')
    .setDescription('Прийняти співробітника')
    .addUserOption(o => o.setName('користувач').setRequired(true))
    .addStringOption(o => o.setName('посада'))
    .addRoleOption(o => o.setName('роль'))
    .addStringOption(o => o.setName('дата')),

  new SlashCommandBuilder()
    .setName('звільнити')
    .setDescription('Звільнити співробітника')
    .addUserOption(o => o.setName('користувач').setRequired(true)),

  new SlashCommandBuilder()
    .setName('догана')
    .setDescription('Видати догану')
    .addUserOption(o => o.setName('користувач').setRequired(true))
    .addStringOption(o => o.setName('причина').setRequired(true)),

  new SlashCommandBuilder()
    .setName('досьє')
    .setDescription('Переглянути досьє')
    .addUserOption(o => o.setName('користувач').setRequired(true)),

  new SlashCommandBuilder()
    .setName('виклик')
    .setDescription('Виклик у голосовий канал')
    .addUserOption(o => o.setName('користувач').setRequired(true))
    .addStringOption(o => o.setName('причина').setRequired(true))
    .addChannelOption(o => o.setName('канал').setRequired(true))
    .addStringOption(o => o.setName('дата')),

  new SlashCommandBuilder()
    .setName('архів')
    .setDescription('Переглянути архів'),

  new SlashCommandBuilder()
    .setName('статус')
    .setDescription('Статус бота')

].map(c => c.toJSON());

const rest = new REST({ version: '10' }).setToken(TOKEN);

(async () => {
  await rest.put(
    Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
    { body: commands }
  );

  console.log('✅ Команди загружені');
})();
