const { REST, Routes, SlashCommandBuilder } = require('discord.js');

const commands = [
  new SlashCommandBuilder().setName('прийняти').setDescription('📝 Прийняти на службу')
    .addUserOption(o => o.setName('користувач').setDescription('Кого').setRequired(true))
    .addStringOption(o => o.setName('посада').setDescription('Посада').setRequired(true))
    .addRoleOption(o => o.setName('роль1').setDescription('Перша роль').setRequired(false))
    .addRoleOption(o => o.setName('роль2').setDescription('Друга роль').setRequired(false)),

  new SlashCommandBuilder().setName('догана').setDescription('⚠️ Видати догану')
    .addUserOption(o => o.setName('користувач').setRequired(true))
    .addStringOption(o => o.setName('причина').setRequired(true)),

  new SlashCommandBuilder().setName('зняти_догану').setDescription('✅ Зняти догани')
    .addUserOption(o => o.setName('користувач').setRequired(true))
    .addIntegerOption(o => o.setName('кількість').setRequired(true)),

  new SlashCommandBuilder().setName('архів').setDescription('🗄️ Реєстр за 24г'),
  new SlashCommandBuilder().setName('статус').setDescription('📊 Стан системи')
].map(c => c.toJSON());

const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
(async () => {
  try {
    await rest.put(Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID), { body: commands });
    console.log('✅ КОМАНДИ ОНОВЛЕНО');
  } catch (e) { console.error(e); }
})();
