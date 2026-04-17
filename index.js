const { Client, GatewayIntentBits, Events, EmbedBuilder } = require('discord.js');

const TOKEN = 'ТУТ_ТВОЙ_ТОКЕН';

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers]
});

const MAIN_ROLE = '1447679308050071623';
const SAFE_ROLE = '1447718423390847178';

const permissions = new Map();
let archive = [];
const warnings = new Map();

function addToArchive(text) {
  archive.push({ text, time: Date.now() });
  archive = archive.filter(x => Date.now() - x.time < 86400000);
}

function hasAccess(member, command) {
  if (member.roles.cache.has(MAIN_ROLE)) return true;

  const allowed = permissions.get(command);
  if (!allowed) return false;

  return member.roles.cache.some(r => allowed.includes(r.id));
}

client.once(Events.ClientReady, () => {
  console.log(`✅ ${client.user.tag} ready`);
});

client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const { commandName } = interaction;
  const member = interaction.member;

  try {

    if (commandName === 'редагування') {
      if (!member.roles.cache.has(MAIN_ROLE))
        return interaction.reply({ content: '❌ Немає доступу', ephemeral: true });

      const command = interaction.options.getString('команда');
      const role = interaction.options.getRole('роль');

      if (!permissions.has(command)) permissions.set(command, []);
      permissions.get(command).push(role.id);

      return interaction.reply(`✅ Роль ${role} має доступ до /${command}`);
    }

    if (!hasAccess(member, commandName))
      return interaction.reply({ content: '❌ У вас немає доступу', ephemeral: true });

    if (commandName === 'прийняти') {
      const user = interaction.options.getUser('користувач');
      const role = interaction.options.getRole('роль');
      const position = interaction.options.getString('посада');
      const date = interaction.options.getString('дата');

      const target = await interaction.guild.members.fetch(user.id);
      if (role) await target.roles.add(role);

      const embed = new EmbedBuilder()
        .setColor('Green')
        .setTitle('🟢 НАКАЗ ПРО ПРИЙНЯТТЯ')
        .setThumbnail(user.displayAvatarURL())
        .addFields(
          { name: '👤 Особа', value: `${user}` },
          { name: '🏛 Посада', value: position || 'Не вказано' },
          { name: '📅 Дата', value: date || 'Не вказано' }
        );

      addToArchive(`ПРИЙНЯТТЯ: ${user.tag} | ${position}`);
      await interaction.reply({ embeds: [embed] });
    }

    if (commandName === 'звільнити') {
      const user = interaction.options.getUser('користувач');
      const target = await interaction.guild.members.fetch(user.id);

      const rolesToRemove = target.roles.cache.filter(r => r.id !== SAFE_ROLE);
      await target.roles.remove(rolesToRemove);

      addToArchive(`ЗВІЛЬНЕННЯ: ${user.tag}`);
      await interaction.reply(`⚫ ${user} звільнений`);
    }

    if (commandName === 'догана') {
      const user = interaction.options.getUser('користувач');
      const reason = interaction.options.getString('причина');

      let count = warnings.get(user.id) || 0;
      count++;
      warnings.set(user.id, count);

      addToArchive(`ДОГАНА: ${user.tag} | ${reason}`);

      if (count >= 3) {
        warnings.delete(user.id);

        const target = await interaction.guild.members.fetch(user.id);
        const rolesToRemove = target.roles.cache.filter(r => r.id !== SAFE_ROLE);
        await target.roles.remove(rolesToRemove);

        return interaction.reply(`❌ ${user} отримав 3/3 і звільнений`);
      }

      await interaction.reply(`⚠️ ${user} отримав догану (${count}/3)\nПричина: ${reason}`);
    }

    if (commandName === 'архів') {
      const list = archive.map(x => x.text).join('\\n') || 'Немає даних';
      await interaction.reply(`📊 Архів:\\n${list}`);
    }

  } catch (err) {
    console.error(err);
    await interaction.reply({ content: '❌ Помилка', ephemeral: true });
  }
});

client.login(TOKEN);
