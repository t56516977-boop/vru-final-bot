const { REST, Routes, SlashCommandBuilder } = require('discord.js');

const commands = [
  new SlashCommandBuilder().setName('прийняти').setDescription('📝 Прийняти на службу')
    .addUserOption(o => o.setName('користувач').setDescription('Кого приймаємо').setRequired(true))
    .addStringOption(o => o.setName('посада').setDescription('На яку посаду').setRequired(true))
    .addRoleOption(o => o.setName('роль1').setDescription('Надати першу роль').setRequired(false))
    .addRoleOption(o => o.setName('роль2').setDescription('Надати другу роль').setRequired(false)),

  new SlashCommandBuilder().setName('догана').setDescription('⚠️ Видати офіційну догану')
    .addUserOption(o => o.setName('користувач').setDescription('Кому видати').setRequired(true))
    .addStringOption(o => o.setName('причина').setDescription('За що видається догана').setRequired(true)),

  new SlashCommandBuilder().setName('звільнити').setDescription('❌ Наказ про звільнення')
    .addUserOption(o => o.setName('користувач').setDescription('Кого звільнити').setRequired(true)),

  new SlashCommandBuilder().setName('підвищити').setDescription('📈 Наказ про підвищення')
    .addUserOption(o => o.setName('користувач').setDescription('Кого підвищити').setRequired(true)),

  new SlashCommandBuilder().setName('досьє').setDescription('📂 Переглянути особову справу')
    .addUserOption(o => o.setName('користувач').setDescription('Оберіть особу').setRequired(true)),

  new SlashCommandBuilder().setName('зняти_догану').setDescription('✅ Анулювати догану')
    .addUserOption(o => o.setName('користувач').setDescription('Кому зняти').setRequired(true))
    .addIntegerOption(o => o.setName('кількість').setDescription('Скільки доган зняти').setRequired(true)),

  new SlashCommandBuilder().setName('виклик').setDescription('🚨 Терміновий виклик')
    .addUserOption(o => o.setName('користувач').setDescription('Кого викликаємо').setRequired(true))
    .addStringOption(o => o.setName('причина').setDescription('Мета виклику').setRequired(true)),

  new SlashCommandBuilder().setName('збори').setDescription('📢 Оголосити збори ВРУ')
    .addStringOption(o => o.setName('час').setDescription('Коли прибути').setRequired(true))
    .addStringOption(o => o.setName('місце').setDescription('Де збираємось').setRequired(true)),

  new SlashCommandBuilder().setName('голосування').setDescription('🗳️ Розпочати вибори')
    .addStringOption(o => o.setName('питання').setDescription('Тема для голосування').setRequired(true)),

  new SlashCommandBuilder().setName('архів').setDescription('🗄️ Реєстр наказів за 24г'),
  new SlashCommandBuilder().setName('статус').setDescription('📊 Стан системи ВРУ'),
  new SlashCommandBuilder().setName('статистика').setDescription('📈 Звітність фракції'),
  new SlashCommandBuilder().setName('перевірка').setDescription('🔍 Перевірка присутності'),
  new SlashCommandBuilder().setName('допомога').setDescription('❓ Інструкція'),
  
  new SlashCommandBuilder().setName('закон').setDescription('📜 Опублікувати постанову')
    .addStringOption(o => o.setName('текст').setDescription('Зміст постанови').setRequired(true)),

  new SlashCommandBuilder().setName('наказ').setDescription('🎖️ Прямий наказ')
    .addStringOption(o => o.setName('текст').setDescription('Зміст наказу').setRequired(true))
];

const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

(async () => {
  try {
    console.log('🧹 Очищення старих команд...');
    await rest.put(Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID), { body: [] });
    
    console.log('🔄 Реєстрація 16 офіційних команд ВРУ...');
    await rest.put(
      Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
      { body: commands.map(c => c.toJSON()) }
    );
    console.log('✅ ВСІ КОМАНДИ УСПІШНО ЗАРЕЄСТРОВАНІ!');
  } catch (error) {
    console.error('❌ Помилка деплою:', error);
  }
})();
