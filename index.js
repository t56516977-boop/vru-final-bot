const {
  Client,
  GatewayIntentBits,
  EmbedBuilder
} = require("discord.js");

const fs = require("fs");
const path = require("path");

const TOKEN = process.env.TOKEN;
const DATABASE_PATH = path.join(__dirname, "database.json");

const COLORS = {
  BLUE: 0x0057b7,
  YELLOW: 0xffd700,
  GREEN: 0x2ecc71,
  RED: 0xe74c3c
};

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers
  ]
});

function createDatabase() {
  return {
    warnings: {},
    logs: []
  };
}

function loadDatabase() {
  if (!fs.existsSync(DATABASE_PATH)) {
    fs.writeFileSync(DATABASE_PATH, JSON.stringify(createDatabase(), null, 2));
  }

  return JSON.parse(fs.readFileSync(DATABASE_PATH, "utf8"));
}

function saveDatabase(database) {
  fs.writeFileSync(DATABASE_PATH, JSON.stringify(database, null, 2));
}

function addLog(type, moderator, target, details) {
  const database = loadDatabase();

  database.logs.unshift({
    type,
    moderatorId: moderator.id,
    moderatorTag: moderator.tag,
    targetId: target ? target.id : null,
    targetTag: target ? target.tag : null,
    details,
    date: new Date().toISOString()
  });

  database.logs = database.logs.slice(0, 100);

  saveDatabase(database);
}

function officialEmbed(color, title) {
  return new EmbedBuilder()
    .setColor(color)
    .setTitle(title)
    .setAuthor({ name: "Верховна Рада України" })
    .setFooter({ text: "Офіційна система ВРУ" })
    .setTimestamp();
}

client.once("ready", () => {
  console.log(`Бот ВРУ запущено як ${client.user.tag}`);
});

client.on("interactionCreate", async interaction => {
  if (!interaction.isChatInputCommand()) return;

  await interaction.deferReply();

  try {
    if (interaction.commandName === "прийняти") {
      const user = interaction.options.getUser("користувач");
      const position = interaction.options.getString("посада");

      const embed = officialEmbed(COLORS.GREEN, "Зелений наказ")
        .setDescription(`${user} прийнято до фракції ВРУ.`)
        .addFields(
          { name: "Посада", value: position, inline: true },
          { name: "Наказ видав", value: `${interaction.user}`, inline: true }
        )
        .setThumbnail(user.displayAvatarURL({ size: 256 }));

      addLog("Прийняття", interaction.user, user, `Посада: ${position}`);

      return interaction.editReply({ embeds: [embed] });
    }

    if (interaction.commandName === "догана") {
      const user = interaction.options.getUser("користувач");
      const reason = interaction.options.getString("причина");

      const database = loadDatabase();

      if (!database.warnings[user.id]) {
        database.warnings[user.id] = [];
      }

      database.warnings[user.id].push({
        reason,
        moderatorId: interaction.user.id,
        moderatorTag: interaction.user.tag,
        date: new Date().toISOString()
      });

      const warningCount = database.warnings[user.id].length;
      saveDatabase(database);

      let fired = false;
      let roleStatus = "Не потрібно";

      if (warningCount >= 3) {
        const member = await interaction.guild.members.fetch(user.id).catch(() => null);

        if (member) {
          const rolesToRemove = member.roles.cache.filter(role =>
            role.id !== interaction.guild.id && role.editable
          );

          if (rolesToRemove.size > 0) {
            await member.roles.remove(rolesToRemove, "Автоматичне звільнення: 3/3 догани");
            roleStatus = `Знято ролей: ${rolesToRemove.size}`;
          } else {
            roleStatus = "Немає ролей, які бот може зняти";
          }

          fired = true;
        } else {
          roleStatus = "Користувача не знайдено на сервері";
        }
      }

      const embed = officialEmbed(
        fired ? COLORS.RED : COLORS.YELLOW,
        fired ? "Автоматичне звільнення" : "Офіційна догана"
      )
        .setDescription(
          fired
            ? `${user} отримав 3/3 догани та був автоматично звільнений.`
            : `${user} отримав офіційну догану.`
        )
        .addFields(
          { name: "Причина", value: reason },
          { name: "Догани", value: `${Math.min(warningCount, 3)}/3`, inline: true },
          { name: "Ролі", value: roleStatus, inline: true },
          { name: "Видав", value: `${interaction.user}`, inline: true }
        )
        .setThumbnail(user.displayAvatarURL({ size: 256 }));

      addLog(
        fired ? "Звільнення" : "Догана",
        interaction.user,
        user,
        `${reason}. Догани: ${warningCount}/3`
      );

      return interaction.editReply({ embeds: [embed] });
    }

    if (interaction.commandName === "збори") {
      const time = interaction.options.getString("час");
      const place = interaction.options.getString("місце");

      const embed = officialEmbed(COLORS.YELLOW, "Оголошення зборів")
        .setDescription("Офіційно оголошуються збори фракції ВРУ.")
        .addFields(
          { name: "Час", value: time, inline: true },
          { name: "Місце", value: place, inline: true },
          { name: "Оголосив", value: `${interaction.user}`, inline: true }
        );

      addLog("Збори", interaction.user, null, `Час: ${time}, місце: ${place}`);

      return interaction.editReply({
        content: "@everyone",
        embeds: [embed],
        allowedMentions: { parse: ["everyone"] }
      });
    }

    if (interaction.commandName === "виклик") {
      const user = interaction.options.getUser("користувач");
      const reason = interaction.options.getString("причина");

      const embed = officialEmbed(COLORS.RED, "На килим")
        .setDescription(`${user}, вас викликано на офіційну розмову.`)
        .addFields(
          { name: "Причина", value: reason },
          { name: "Викликав", value: `${interaction.user}`, inline: true }
        )
        .setThumbnail(user.displayAvatarURL({ size: 256 }));

      addLog("Виклик", interaction.user, user, reason);

      return interaction.editReply({ embeds: [embed] });
    }

    if (interaction.commandName === "архів") {
      const database = loadDatabase();
      const logs = database.logs.slice(0, 10);

      const embed = officialEmbed(COLORS.BLUE, "Архів останніх дій");

      if (logs.length === 0) {
        embed.setDescription("Архів поки порожній.");
      } else {
        embed.setDescription(
          logs.map((log, index) => {
            const target = log.targetTag ? ` → ${log.targetTag}` : "";
            return `**${index + 1}. ${log.type}${target}**\n${log.details}\n${new Date(log.date).toLocaleString("uk-UA")}`;
          }).join("\n\n")
        );
      }

      return interaction.editReply({ embeds: [embed] });
    }

    if (interaction.commandName === "досьє") {
      const user = interaction.options.getUser("користувач") || interaction.user;
      const database = loadDatabase();
      const warnings = database.warnings[user.id] || [];

      const embed = officialEmbed(COLORS.BLUE, "Досьє")
        .setDescription(`Офіційне досьє користувача ${user}.`)
        .setThumbnail(user.displayAvatarURL({ size: 512 }))
        .addFields(
          { name: "Користувач", value: user.tag, inline: true },
          { name: "ID", value: user.id, inline: true },
          { name: "Догани", value: `${Math.min(warnings.length, 3)}/3`, inline: true }
        );

      return interaction.editReply({ embeds: [embed] });
    }

    if (interaction.commandName === "статус") {
      const database = loadDatabase();

      const totalWarnings = Object.values(database.warnings)
        .reduce((sum, warnings) => sum + warnings.length, 0);

      const embed = officialEmbed(COLORS.BLUE, "Стан системи ВРУ")
        .setDescription("Система працює у штатному режимі.")
        .addFields(
          { name: "Бот", value: client.user.tag, inline: true },
          { name: "Ping", value: `${client.ws.ping} ms`, inline: true },
          { name: "Серверів", value: `${client.guilds.cache.size}`, inline: true },
          { name: "Усього доган", value: `${totalWarnings}`, inline: true },
          { name: "Записів архіву", value: `${database.logs.length}`, inline: true }
        );

      return interaction.editReply({ embeds: [embed] });
    }
  } catch (error) {
    const embed = officialEmbed(COLORS.RED, "Помилка системи ВРУ")
      .setDescription("Сталася помилка під час виконання команди.");

    return interaction.editReply({ embeds: [embed] });
  }
});

client.login(TOKEN);
