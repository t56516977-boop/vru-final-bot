const { REST, Routes, SlashCommandBuilder } = require('discord.js');

const TOKEN = 'ТУТ_ТВОЙ_ТОКЕН';
const CLIENT_ID = 'АЙДИ_БОТА';
const GUILD_ID = 'АЙДИ_СЕРВЕРА';

const commands = [

  new SlashCommandBuilder()
    .setName('редагування')
    .setDescription('Доступ')
    .addStringOption(o => o.setName('команда').setRequired(true))
    .addRoleOption(o => o.setName('роль').setRequired(true)),

  new SlashCommandBuilder()
    .setName('прийняти')
    .addUserOption(o => o.setName('користувач').setRequired(true))
    .addStringOption(o => o.setName('посада'))
    .addRoleOption(o => o.setName('роль'))
    .addStringOption(o => o.setName('дата')),

  new SlashCommandBuilder()
    .setName('звільнити')
    .addUserOption(o => o.setName('користувач').setRequired(true)),

  new SlashCommandBuilder()
    .setName('догана')
    .addUserOption(o => o.setName('користувач').setRequired(true))
    .addStringOption(o => o.setName('причина').setRequired(true)),

  new SlashCommandBuilder().setName('архів')

].map(c => c.toJSON());

const rest = new REST({ version: '10' }).setToken(TOKEN);

(async () => {
  await rest.put(
    Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
    { body: commands }
  );

  console.log('✅ Команди загружені');
})();
