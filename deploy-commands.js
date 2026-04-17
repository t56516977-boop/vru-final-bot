const { REST, Routes, SlashCommandBuilder } = require('discord.js');

const commands = [
  new SlashCommandBuilder().setName('статус').setDescription('📊 Стан системи ВРУ'),
  
  new SlashCommandBuilder().setName('прийняти').setDescription('📝 Прийняти на службу')
    .addUserOption(o => o.setName('користувач').setDescription('Оберіть особу').setRequired(true))
    .addStringOption(o => o.setName('посада').setDescription('Вкажіть посаду').setRequired(true))
    .addRoleOption(o => o.setName('роль1').setDescription('Надати основну роль').setRequired(false))
    .addRoleOption(o => o.setName('роль2').setDescription('Надати додаткову роль').setRequired(false)),

  new SlashCommandBuilder().setName('догана').setDescription('⚠️ Видати догану')
    .addUserOption(o => o.setName('користувач').setDescription('Оберіть порушника').setRequired(true))
    .addStringOption(o => o.setName('причина').setDescription('Вкажіть причину').setRequired(true)),

  new SlashCommandBuilder().setName('зняти_догану').setDescription('✅ Анулювати догану')
    .addUserOption(o => o.setName('користувач').setDescription('Оберіть особу').setRequired(true))
    .addIntegerOption(o => o.setName('кількість').setDescription('Скільки доган зняти').setRequired(true)),

  new SlashCommandBuilder().setName('архів').setDescription('🗄️ Реєстр наказів за 24г'),

  new SlashCommandBuilder().setName('виклик').setDescription('🚨 Терміновий виклик')
    .addUserOption(o => o.setName('користувач').setDescription('Кого викликаємо').setRequired(true))
    .addStringOption(o => o.setName('причина').setDescription('Мета виклику').setRequired(true)),

  new SlashCommandBuilder().setName('закон').setDescription('📜 Опублікувати постанову')
    .addStringOption(o => o.setName('текст').setDescription('Зміст постанови').setRequired(true)),

  new SlashCommandBuilder().setName('наказ').setDescription('🎖️ Видати прямий наказ')
    .addStringOption(o => o.setName('текст').setDescription('Зміст наказу').setRequired(true)),

  new SlashCommandBuilder().setName('збори').setDescription('📢 Оголосити збори')
    .addStringOption(o => o.setName('час').setDescription('Вкажіть час').setRequired(true))
    .addStringOption(o => o.setName('місце').setDescription('Вкажіть місце').setRequired(true)),

  new SlashCommandBuilder().setName('звільнити').setDescription('❌ Наказ про звільнення')
    .addUserOption(o => o.setName('користувач').setDescription('Кого звільнити').setRequired(true)),

  new SlashCommandBuilder().setName('підвищити').setDescription('📈 Наказ про підвищення')
    .addUserOption(o => o.setName('користувач').setDescription('Кого підвищити').setRequired(true)),

  new SlashCommandBuilder().setName('досьє').setDescription('📂 Особова справа')
    .addUserOption(o => o.setName('користувач').setDescription('Чиє досьє відкрити').setRequired(true)),

  new SlashCommandBuilder().setName('перевірка').setDescription('🔍 Перевірка присутності'),
  new SlashCommandBuilder().setName('статистика').setDescription('📈 Звітність фракції'),
  
  new SlashCommandBuilder().setName('голосування').setDescription('🗳️ Розпочати вибори')
    .addStringOption(o => o.setName('питання').setDescription('Тема для голосування').setRequired(true)),

  new SlashCommandBuilder().setName('допомога').setDescription('❓ Довідка по командам')
].map(c => c.toJSON());

const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

(async () => {
  try {
    console.log('🔄 Оновлення 16 команд для ВРУ...');
    await rest.put(
      Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
      { body: commands }
    );
    console.log('✅ ВСІ КОМАНДИ ЗАРЕЄСТРОВАНО');
  } catch (e) { console.error(e); }
})();
