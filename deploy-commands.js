const { REST, Routes, SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");

const commands = [
  new SlashCommandBuilder()
    .setName("прийняти")
    .setDescription("📝 Видати зелений наказ про прийняття на службу")
    .addUserOption(o => o.setName("користувач").setDescription("Кого приймаємо").setRequired(true))
    .addStringOption(o => o.setName("посада").setDescription("На яку посаду").setRequired(true))
    .addRoleOption(o => o.setName("роль1").setDescription("Основна роль").setRequired(false))
    .addRoleOption(o => o.setName("роль2").setDescription("Додаткова роль").setRequired(false)),

  new SlashCommandBuilder()
    .setName("догана")
    .setDescription("⚠️ Видати офіційну догану (3/3 = звільнення)")
    .addUserOption(o => o.setName("користувач").setDescription("Порушник").setRequired(true))
    .addStringOption(o => o.setName("причина").setDescription("Суть порушення").setRequired(true)),

  new SlashCommandBuilder()
    .setName("збори")
    .setDescription("📢 Оголосити терміновий збір фракції")
    .addStringOption(o => o.setName("час").setDescription("На котру годину").setRequired(true))
    .addStringOption(o => o.setName("місце").setDescription("Локація збору").setRequired(true)),

  new SlashCommandBuilder()
    .setName("виклик")
    .setDescription("🚨 Викликати співробітника 'на килим'")
    .addUserOption(o => o.setName("користувач").setDescription("Кого викликаємо").setRequired(true))
    .addStringOption(o => o.setName("причина").setDescription("Мета виклику").setRequired(true)),

  new SlashCommandBuilder().setName("архів").setDescription("🗄️ Реєстр державних наказів за 24г"),
  new SlashCommandBuilder().setName("досьє").setDescription("📂 Переглянути особову справу співробітника").addUserOption(o => o.setName("користувач").setDescription("Чия справа").setRequired(true)),
  new SlashCommandBuilder().setName("статус").setDescription("📊 Стан державної системи ВРУ")
].map(command => command.toJSON());

const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);

(async () => {
  try {
    console.log("🔄 Синхронізація 7 команд ВРУ...");
    await rest.put(
      Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
      { body: commands }
    );
    console.log("✅ КОМАНДИ ВРУ УСПІШНО ЗАРЕЄСТРОВАНО.");
  } catch (error) {
    console.error("❌ Помилка реєстрації:", error);
  }
})();
