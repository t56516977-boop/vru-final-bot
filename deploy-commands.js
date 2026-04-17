const { REST, Routes, SlashCommandBuilder } = require('discord.js');

const commands = [
  new SlashCommandBuilder()
    .setName('прийняти')
    .setDescription('📝 Прийняти на службу в ВРУ')
    .addUserOption(o => o.setName('користувач').setDescription('Оберіть особу').setRequired(true))
    .addStringOption(o => o.setName('посада').setDescription('Вкажіть посаду').setRequired(true))
    .addRoleOption(o => o.setName('роль1').setDescription('Надати першу роль').setRequired(false))
    .addRoleOption(o => o.setName('роль2').setDescription('Надати другу роль').setRequired(false)),

  new SlashCommandBuilder()
    .setName('догана')
    .setDescription('⚠️ Видати офіційну догану')
    .addUserOption(o => o.setName('користувач').setDescription('Оберіть порушника').setRequired(true))
    .addStringOption(o => o.setName('причина').setDescription('Вкажіть причину догани').setRequired(true)),

  new SlashCommandBuilder()
    .setName('зняти_догану')
    .setDescription('✅ Анулювати догани працівнику')
    .addUserOption(o => o.setName('користувач').setDescription('Оберіть особу').setRequired(true))
    .addIntegerOption(o => o.setName('кількість').setDescription('Скільки доган зняти').setRequired(true)),

  new SlashCommandBuilder()
    .setName('архів')
    .setDescription('🗄️ Реєстр державних наказів за 24 години'),

  new SlashCommandBuilder()
    .setName('статус')
    .setDescription('📊 Стан державної системи ВРУ')
].map(c => c.toJSON());

const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

(async () => {
  try {
    console.log('🔄 Оновлення команд для ВРУ...');
    await rest.put(
      Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
      { body: commands }
    );
    console.log('✅ КОМАНДИ ОНОВЛЕНО');
  } catch (e) { console.error(e); }
})();
