const { REST, Routes, SlashCommandBuilder } = require('discord.js');

const commands = [
  new SlashCommandBuilder()
    .setName('статус')
    .setDescription('📊 Перевірити стан системи ВРУ'),

  new SlashCommandBuilder()
    .setName('прийняти')
    .setDescription('📝 Прийняти на службу')
    .addUserOption(o => o.setName('користувач').setDescription('Кого').setRequired(true))
    .addStringOption(o => o.setName('посада').setDescription('Посада').setRequired(true))
    .addRoleOption(o => o.setName('роль1').setDescription('Основна роль').setRequired(false)),

  new SlashCommandBuilder()
    .setName('догана')
    .setDescription('⚠️ Видати офіційну догану')
    .addUserOption(o => o.setName('користувач').setDescription('Кому').setRequired(true))
    .addStringOption(o => o.setName('причина').setDescription('За що').setRequired(true)),

  new SlashCommandBuilder()
    .setName('збори')
    .setDescription('📢 Оголосити збори')
    .addStringOption(o => o.setName('час').setDescription('Коли').setRequired(true))
    .addStringOption(o => o.setName('місце').setDescription('Де').setRequired(true)),

  new SlashCommandBuilder()
    .setName('архів')
    .setDescription('🗄️ Переглянути реєстр наказів за 24г'),

  new SlashCommandBuilder()
    .setName('зняти_догану')
    .setDescription('✅ Анулювати догани')
    .addUserOption(o => o.setName('користувач').setDescription('Кому').setRequired(true))
    .addIntegerOption(o => o.setName('кількість').setDescription('Скільки').setRequired(true))
].map(command => command.toJSON());

const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

(async () => {
  try {
    console.log('🔄 Оновлення команд для ВРУ...');
    // Очищуємо старі команди і ставимо нові
    await rest.put(
      Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
      { body: commands }
    );
    console.log('✅ КОМАНДИ УСПІШНО ЗАРЕЄСТРОВАНІ');
  } catch (error) {
    console.error('❌ Помилка:', error);
  }
})();
