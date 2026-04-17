// ... (початок коду з підключенням бібліотек та БД залишаємо як був)

client.on('interactionCreate', async (i) => {
    if (!i.isChatInputCommand()) return;
    await i.deferReply().catch(() => {});

    // ПЕРЕВІРКА ПРАВ (твої ролі)
    if (!hasAccess(i.member)) return i.editReply({ content: '❌ **ВІДМОВА В ДОСТУПІ.**', ephemeral: true });

    const { commandName, options, user: admin } = i;

    // --- НОВІ КОМАНДИ ---

    if (commandName === 'закон') {
        const text = options.getString('text');
        const embed = new EmbedBuilder().setColor('#0057B7').setTitle('📜 НОВА ПОСТАНОВА ВЕРХОВНОЇ РАДИ').setDescription(text).setTimestamp();
        return i.editReply({ embeds: [embed] });
    }

    if (commandName === 'виклик') {
        const target = options.getUser('користувач');
        const reason = options.getString('причина');
        const embed = new EmbedBuilder().setColor('#C0392B').setTitle('🚨 СЛУЖБОВИЙ ВИКЛИК').setDescription(`${target}, негайно з'явіться до кабінету керівництва!`).addFields({ name: '📝 Причина', value: reason });
        return i.editReply({ content: `${target}`, embeds: [embed] });
    }

    if (commandName === 'збори') {
        const embed = new EmbedBuilder().setColor('#FFD700').setTitle('📢 ТЕРМІНОВІ ЗБОРИ').setDescription(`@everyone\n**Всім членам ВРУ терміново прибути на засідання!**`).addFields({ name: '🕒 Час', value: options.getString('час') }, { name: '📍 Місце', value: options.getString('місце') });
        return i.editReply({ content: '@everyone', embeds: [embed] });
    }

    if (commandName === 'голосування') {
        const embed = new EmbedBuilder().setColor('#0057B7').setTitle('🗳️ ГОЛОСУВАННЯ ВРУ').setDescription(`**Питання:** ${options.getString('питання')}`);
        const msg = await i.editReply({ embeds: [embed], fetchReply: true });
        await msg.react('✅'); await msg.react('❌');
        return;
    }

    // (Сюди також додаємо блоки для прийняти, догани та архіву, які ми робили раніше)

    if (!i.replied && !i.deferred) await i.editReply({ content: `✅ Запит на **${commandName}** виконано успішно.`, ephemeral: true });
});
