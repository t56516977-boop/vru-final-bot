const { REST, Routes, SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");

const commands = [
  new SlashCommandBuilder()
    .setName("прийняти")
    .setDescription("Видати зелений наказ про прийняття")
    .addUserOption(option =>
      option.setName("користувач")
        .setDescription("Користувач")
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName("посада")
        .setDescription("Посада")
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),

  new SlashCommandBuilder()
    .setName("догана")
    .setDescription("Видати догану користувачу")
    .addUserOption(option =>
      option.setName("користувач")
        .setDescription("Користувач")
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName("причина")
        .setDescription("Причина догани")
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),

  new SlashCommandBuilder()
    .setName("збори")
    .setDescription("Оголосити збори фракції")
    .addStringOption(option =>
      option.setName("час")
        .setDescription("Час зборів")
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName("місце")
        .setDescription("Місце зборів")
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.MentionEveryone),

  new SlashCommandBuilder()
    .setName("виклик")
    .setDescription("Викликати користувача на килим")
    .addUserOption(option =>
      option.setName("користувач")
        .setDescription("Користувач")
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName("причина")
        .setDescription("Причина виклику")
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("архів")
    .setDescription("Показати останні 10 дій"),

  new SlashCommandBuilder()
    .setName("досьє")
    .setDescription("Показати досьє користувача")
    .addUserOption(option =>
      option.setName("користувач")
        .setDescription("Користувач")
        .setRequired(false)
    ),

  new SlashCommandBuilder()
    .setName("статус")
    .setDescription("Показати стан системи ВРУ")
].map(command => command.toJSON());

const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);

(async () => {
  try {
    await rest.put(
      Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
      { body: commands }
    );

    console.log("Команди ВРУ успішно зареєстровано.");
  } catch (error) {
    console.error(error);
  }
})();
