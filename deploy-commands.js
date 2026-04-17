const { REST, Routes, SlashCommandBuilder } = require('discord.js');

const commands = [
  new SlashCommandBuilder().setName('статус').setDescription('📊 Стан системи'),
  new SlashCommandBuilder().setName('допомога').setDescription('❓ Список команд'),
  new SlashCommandBuilder().setName('архів').setDescription('🗄️ Реєстр за 24г'),
  new SlashCommandBuilder().setName('статистика').setDescription('📈 Звітність'),
  new SlashCommandBuilder().setName('перевірка').setDescription('🔍 Перевірка присутніх'),
  
  new SlashCommandBuilder().setName('прийняти').setDescription('📝 Прийняти на службу')
    .addUserOption(o => o.setName('користувач').setDescription('Кого').setRequired(true))
    .addStringOption(o => o.setName('посада').setDescription('Посада').setRequired(true))
    .addRoleOption(o => o.setName('роль1').setDescription('Роль').setRequired(false)),

  new SlashCommandBuilder().setName('догана').setDescription('⚠️ Видати догану')
    .addUserOption(o => o.setName('користувач').setDescription('Кому').setRequired(true))
    .addStringOption(o => o.setName('причина').setDescription('За що').setRequired(true)),

  new SlashCommandBuilder().setName('зняти_догану').setDescription('✅ Зняти догани')
    .addUserOption(o => o.setName('користувач').setDescription('Кому').setRequired(true))
    .addIntegerOption(o => o.setName('кількість').setDescription('Скільки').setRequired(true)),

  new SlashCommandBuilder().setName('виклик').setDescription('🚨 Виклик')
    .addUserOption(o => o.setName('користувач').setDescription('Кого').setRequired(true))
    .addStringOption(o => o.setName('причина').setDescription('Причина').setRequired(true)),

  new SlashCommandBuilder().setName('збори').setDescription('📢 Збори')
    .addStringOption(o => o.setName('час').setDescription('Коли').setRequired(true))
    .addStringOption(o => o.setName('місце').setDescription('Де').setRequired(true)),

  new SlashCommandBuilder().setName('досьє').setDescription('📂 Справа')
    .addUserOption(o => o.setName('користувач').setDescription('Чия').setRequired(true))
].map(c => c.toJSON());

const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

(async () => {
  try {
    console.log('🧹 Очищення...');
    await rest.put(Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID), { body: [] });
    console.log('🔄 Реєстрація...');
    await rest.put(Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID), { body: commands });
    console.log('✅ КОМАНДИ ГОТОВІ!');
  } catch (e) { console.error(e); }
})();
