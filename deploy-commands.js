const { REST, Routes, SlashCommandBuilder } = require('discord.js');

const TOKEN = 'ТВОЙ_ТОКЕН';
const CLIENT_ID = 'ТВОЙ_CLIENT_ID';
const GUILD_ID = 'ТВОЙ_GUILD_ID';

const commands = [

  new SlashCommandBuilder()
    .setName('редагування')
    .setDescription('Налаштувати доступ до команд')
    .addStringOption(o =>
      o.setName('команда')
       .setDescription('Назва команди')
       .setRequired(true))
    .addRoleOption(o =>
      o.setName('роль')
       .setDescription('Яка роль має доступ')
       .setRequired(true)),

  new SlashCommandBuilder()
    .setName('прийняти')
    .setDescription('Прийняти співробітника')
    .addUserOption(o =>
      o.setName('користувач')
       .setDescription('Кого прийняти')
       .setRequired(true))
    .addStringOption(o =>
      o.setName('посада')
       .setDescription('Посада'))
    .addRoleOption(o =>
      o.setName('роль')
       .setDescription('Роль'))
    .addStringOption(o =>
      o.setName('дата')
       .setDescription('Дата')),

  new SlashCommandBuilder()
    .setName('звільнити')
    .setDescription('Звільнити співробітника')
    .addUserOption(o =>
      o.setName('користувач')
       .setDescription('Кого звільнити')
       .setRequired(true)),

  new SlashCommandBuilder()
    .setName('догана')
    .setDescription('Видати догану')
    .addUserOption(o =>
      o.setName('користувач')
       .setDescription('Кому')
       .setRequired(true))
    .addStringOption(o =>
      o.setName('причина')
       .setDescription('Причина')
       .setRequired(true)),

  new SlashCommandBuilder()
    .setName('досьє')
    .setDescription('Переглянути досьє')
    .addUserOption(o =>
      o.setName('користувач')
       .setDescription('Кого')
       .setRequired(true)),

  new SlashCommandBuilder()
    .setName('виклик')
    .setDescription('Виклик у канал')
    .addUserOption(o =>
      o.setName('користувач')
       .setDescription('Кого викликати')
       .setRequired(true))
    .addStringOption(o =>
      o.setName('причина')
       .setDescription('Причина')
       .setRequired(true))
    .addChannelOption(o =>
      o.setName('канал')
       .setDescription('Куди')
       .setRequired(true))
    .addStringOption(o =>
      o.setName('дата')
       .setDescription('Дата')),

  new SlashCommandBuilder()
    .setName('архів')
    .setDescription('Переглянути архів'),

  new SlashCommandBuilder()
    .setName('статус')
    .setDescription('Статус бота')

].map(cmd => cmd.toJSON());

const rest = new REST({ version: '10' }).setToken(TOKEN);

(async () => {
  try {
    console.log('🔄 Deploy...');

    await rest.put(
      Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
      { body: commands }
    );

    console.log('✅ Команди загружені');
  } catch (err) {
    console.error(err);
  }
})();
