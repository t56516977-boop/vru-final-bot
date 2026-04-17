const { REST, Routes, SlashCommandBuilder } = require('discord.js');

const commands = [
  new SlashCommandBuilder().setName('статус').setDescription('📊 Стан системи ВРУ'),
  new SlashCommandBuilder().setName('прийняти').setDescription('📝 Прийняти на службу')
    .addUserOption(o => o.setName('користувач').setDescription('Кого').setRequired(true))
    .addStringOption(o => o.setName('посада').setDescription('Посада').setRequired(true))
    .addRoleOption(o => o.setName('роль1').setDescription('Перша роль').setRequired(false))
    .addRoleOption(o => o.setName('роль2').setDescription('Друга роль').setRequired(false)),
  new SlashCommandBuilder().setName('догана').setDescription('⚠️ Видати догану')
    .addUserOption(o => o.setName('користувач').setDescription('Порушник').setRequired(true))
    .addStringOption(o => o.setName('причина').setDescription('За що').setRequired(true)),
  new SlashCommandBuilder().setName('зняти_догану').setDescription('✅ Анулювати догану')
    .addUserOption(o => o.setName('користувач').setRequired(true))
    .addIntegerOption(o => o.setName('кількість').setRequired(true)),
  new SlashCommandBuilder().setName('архів').setDescription('🗄️ Реєстр наказів за 24г'),
  new SlashCommandBuilder().setName('виклик').setDescription('🚨 Терміновий виклик')
    .addUserOption(o => o.setName('користувач').setRequired(true))
    .addStringOption(o => o.setName('причина').setRequired(true)),
  new SlashCommandBuilder().setName('закон').setDescription('📜 Опублікувати постанову')
    .addStringOption(o => o.setName('текст').setRequired(true)),
  new SlashCommandBuilder().setName('наказ').setDescription('🎖️ Видати прямий наказ')
    .addStringOption(o => o.setName('текст').setRequired(true)),
  new SlashCommandBuilder().setName('збори').setDescription('📢 Оголосити збори')
    .addStringOption(o => o.setName('час').setRequired(true))
    .addStringOption(o => o.setName('місце').setRequired(true)),
  new SlashCommandBuilder().setName('звільнити').setDescription('❌ Наказ про звільнення')
    .addUserOption(o => o.setName('користувач').setRequired(true)),
  new SlashCommandBuilder().setName('підвищити').setDescription('📈 Наказ про підвищення')
    .addUserOption(o => o.setName('користувач').setRequired(true)),
  new SlashCommandBuilder().setName('досьє').setDescription('📂 Особова справа')
    .addUserOption(o => o.setName('користувач').setRequired(true)),
  new SlashCommandBuilder().setName('перевірка').setDescription('🔍 Перевірка присутності'),
  new SlashCommandBuilder().setName('статистика').setDescription('📈 Звітність фракції'),
  new SlashCommandBuilder().setName('голосування').setDescription('🗳️ Розпочати вибори')
    .addStringOption(o => o.setName('питання').setRequired(true)),
  new SlashCommandBuilder().setName('допомога').setDescription('❓ Довідка по командам')
].map(c => c.toJSON());

const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
(async () => {
  try {
    await rest.put(Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID), { body: commands });
    console.log('✅ ВСІ 16 КОМАНД ЗАРЕЄСТРОВАНО');
  } catch (e) { console.error(e); }
})();
