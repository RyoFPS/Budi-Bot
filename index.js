require('dotenv').config();
const { Client, GatewayIntentBits, Partials, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildPresences,
  ],
  partials: [Partials.Message, Partials.Reaction, Partials.User, Partials.GuildMember],
});

// ========== CONFIGURATION ==========
const CONFIG = {
  guildId: process.env.GUILD_ID,
  verificationChannelId: process.env.VERIFICATION_CHANNEL_ID,
  verifiedRoleId: process.env.VERIFIED_ROLE_ID,
  verificationEmoji: '✅',
  welcomeChannelId: process.env.WELCOME_CHANNEL_ID,
  goodbyeChannelId: process.env.GOODBYE_CHANNEL_ID,
  statsChannelId: process.env.STATS_CHANNEL_ID,
  statsUpdateInterval: 30 * 60 * 1000,
  changelogChannelId: process.env.CHANGELOG_CHANNEL_ID,
  ownerRoleId: process.env.OWNER_ROLE_ID,
  adminRoleId: process.env.ADMIN_ROLE_ID,
};

// Stores the stats message ID so we can edit it instead of sending new ones
let statsMessageId = null;

// Prevents setInterval stacking on reconnect
let statsInterval = null;

// Mutex/lock to prevent concurrent stats updates
let isUpdatingStats = false;

// ========== HELPER: FORMAT DURATION ==========
function formatDuration(ms) {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const months = Math.floor(days / 30);
  const years = Math.floor(days / 365);

  if (years > 0) return `${years} year${years > 1 ? 's' : ''}, ${months % 12} month${months % 12 !== 1 ? 's' : ''}`;
  if (months > 0) return `${months} month${months > 1 ? 's' : ''}, ${days % 30} day${days % 30 !== 1 ? 's' : ''}`;
  if (days > 0) return `${days} day${days > 1 ? 's' : ''}, ${hours % 24} hour${hours % 24 !== 1 ? 's' : ''}`;
  if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''}, ${minutes % 60} minute${minutes % 60 !== 1 ? 's' : ''}`;
  return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
}

// ========== HELPER: BUILD STATS EMBED ==========
async function buildStatsEmbed(guild) {
  // Note: Online/human/bot counts rely on cached presence data from the GuildPresences intent.
  // This avoids a heavy guild.members.fetch() call but counts may be slightly lower than actual
  // if some members are not yet cached. guild.memberCount is always accurate (provided by Discord).
  const totalMembers = guild.memberCount;
  const humans = guild.members.cache.filter((m) => !m.user.bot).size;
  const bots = guild.members.cache.filter((m) => m.user.bot).size;
  const onlineMembers = guild.members.cache.filter(
    (m) => m.presence && m.presence.status !== 'offline'
  ).size;
  const totalChannels = guild.channels.cache.size;
  const totalRoles = guild.roles.cache.size;
  const boostLevel = guild.premiumTier;
  const boostCount = guild.premiumSubscriptionCount || 0;
  const owner = await guild.fetchOwner();
  const createdAt = `<t:${Math.floor(guild.createdTimestamp / 1000)}:F>`;

  const boostTierLabel = ['None', 'Tier 1', 'Tier 2', 'Tier 3'][boostLevel] || 'Unknown';

  const embed = new EmbedBuilder()
    .setTitle('📊 Server Statistics')
    .setDescription(`Live statistics for **${guild.name}**`)
    .setColor(0x7c3aed)
    .setThumbnail(guild.iconURL({ dynamic: true, size: 256 }))
    .addFields(
      { name: '👥 Total Members', value: `\`${totalMembers}\``, inline: true },
      { name: '🟢 Online', value: `\`${onlineMembers}\``, inline: true },
      { name: '🧑 Humans', value: `\`${humans}\``, inline: true },
      { name: '🤖 Bots', value: `\`${bots}\``, inline: true },
      { name: '💬 Channels', value: `\`${totalChannels}\``, inline: true },
      { name: '🏷️ Roles', value: `\`${totalRoles}\``, inline: true },
      { name: '📅 Server Created', value: createdAt, inline: false },
      { name: '🚀 Boost Level', value: `${boostTierLabel} (${boostCount} boost${boostCount !== 1 ? 's' : ''})`, inline: true },
      { name: '👑 Server Owner', value: `${owner.user}`, inline: true }
    )
    .setFooter({ text: '🔄 Stats update every 30 minutes • Last updated' })
    .setTimestamp();

  return embed;
}

// ========== HELPER: UPDATE STATS ==========
async function updateStats() {
  if (isUpdatingStats) return;
  isUpdatingStats = true;
  try {
    const guild = client.guilds.cache.get(CONFIG.guildId);
    if (!guild) return;

    const statsChannel = client.channels.cache.get(CONFIG.statsChannelId);
    if (!statsChannel) {
      console.error('❌ Stats channel not found! Check your channel ID.');
      return;
    }

    const embed = await buildStatsEmbed(guild);

    // Try to edit existing message
    if (statsMessageId) {
      try {
        const existingMsg = await statsChannel.messages.fetch(statsMessageId);
        await existingMsg.edit({ embeds: [embed] });
        console.log('📊 Stats embed updated.');
        return;
      } catch {
        // Message was deleted or not found, we'll send a new one below
        statsMessageId = null;
      }
    }

    // Look for an existing stats message from the bot
    const messages = await statsChannel.messages.fetch({ limit: 20 });
    const botStatsMsg = messages.find(
      (msg) =>
        msg.author.id === client.user.id &&
        msg.embeds.length > 0 &&
        msg.embeds[0].title === '📊 Server Statistics'
    );

    if (botStatsMsg) {
      statsMessageId = botStatsMsg.id;
      await botStatsMsg.edit({ embeds: [embed] });
      console.log('📊 Stats embed found and updated.');
    } else {
      const sent = await statsChannel.send({ embeds: [embed] });
      statsMessageId = sent.id;
      console.log('📊 Stats embed sent!');
    }
  } catch (error) {
    console.error('❌ Error updating stats:', error);
  } finally {
    isUpdatingStats = false;
  }
}

// ========== BOT READY ==========
client.once('clientReady', async () => {
  console.log(`✅ Bot is online as ${client.user.tag}`);

  // ---------- Verification Message ----------
  try {
    const channel = client.channels.cache.get(CONFIG.verificationChannelId);
    if (!channel) {
      console.error('❌ Verification channel not found! Check your channel ID.');
    } else {
      const messages = await channel.messages.fetch({ limit: 10 });
      const existingMessage = messages.find(
        (msg) => msg.author.id === client.user.id && msg.embeds.length > 0
      );

      if (!existingMessage) {
        const embed = new EmbedBuilder()
          .setTitle('✅ Server Verification')
          .setDescription(
            `Welcome to the server!\n\nReact with ${CONFIG.verificationEmoji} below to verify yourself and gain access to the server channels.`
          )
          .setColor(0x00ae86)
          .setFooter({ text: 'Verification System' })
          .setTimestamp();

        const sentMessage = await channel.send({ embeds: [embed] });
        await sentMessage.react(CONFIG.verificationEmoji);
        console.log('📨 Verification message sent!');
      } else {
        console.log('📨 Verification message already exists.');
      }
    }
  } catch (error) {
    console.error('❌ Error setting up verification:', error.message);
    console.error('💡 Make sure the bot has "Send Messages", "Embed Links", and "Add Reactions" permissions in the verification channel.');
  }

  // ---------- Server Statistics ----------
  try {
    await updateStats();
  } catch (error) {
    console.error('❌ Error setting up stats:', error.message);
  }

  // Set up auto-update interval (clear previous to prevent stacking on reconnect)
  if (statsInterval) clearInterval(statsInterval);
  statsInterval = setInterval(() => {
    updateStats().catch(err => console.error('❌ Stats auto-update failed:', err));
  }, CONFIG.statsUpdateInterval);

  console.log(`🔄 Stats auto-update set to every ${CONFIG.statsUpdateInterval / 60000} minutes.`);
});

// ========== REACTION ADD → GIVE ROLE ==========
client.on('messageReactionAdd', async (reaction, user) => {
  // Ignore bot reactions
  if (user.bot) return;

  // Handle partial reactions (uncached)
  if (reaction.partial) {
    try {
      await reaction.fetch();
    } catch (error) {
      console.error('Error fetching reaction:', error);
      return;
    }
  }

  // Check if it's in the verification channel
  if (reaction.message.channel.id !== CONFIG.verificationChannelId) return;

  // Check if it's the correct emoji
  if (reaction.emoji.name !== CONFIG.verificationEmoji) return;

  // Get the guild member and add the role
  const guild = reaction.message.guild;
  const member = await guild.members.fetch(user.id);

  try {
    await member.roles.add(CONFIG.verifiedRoleId);
    console.log(`✅ Verified: ${user.tag}`);

    // Send a DM to the user (optional)
    await user.send(`✅ You have been verified in **${guild.name}**! Enjoy the server!`).catch(() => {
      // User might have DMs disabled, that's okay
    });
  } catch (error) {
    console.error(`❌ Failed to add role to ${user.tag}:`, error);
  }
});

// ========== REACTION REMOVE → REMOVE ROLE ==========
client.on('messageReactionRemove', async (reaction, user) => {
  // Ignore bots
  if (user.bot) return;

  // Handle partial reactions
  if (reaction.partial) {
    try {
      await reaction.fetch();
    } catch (error) {
      console.error('Error fetching reaction:', error);
      return;
    }
  }

  // Check channel and emoji
  if (reaction.message.channel.id !== CONFIG.verificationChannelId) return;
  if (reaction.emoji.name !== CONFIG.verificationEmoji) return;

  // Remove the role
  const guild = reaction.message.guild;
  const member = await guild.members.fetch(user.id);

  try {
    await member.roles.remove(CONFIG.verifiedRoleId);
    console.log(`❌ Unverified: ${user.tag}`);
  } catch (error) {
    console.error(`❌ Failed to remove role from ${user.tag}:`, error);
  }
});

// ========== MEMBER JOIN → WELCOME MESSAGE ==========
client.on('guildMemberAdd', async (member) => {
  // Send welcome embed
  const welcomeChannel = client.channels.cache.get(CONFIG.welcomeChannelId);
  if (!welcomeChannel) {
    console.error('❌ Welcome channel not found!');
    return;
  }

  const accountAge = formatDuration(Date.now() - member.user.createdTimestamp);

  const embed = new EmbedBuilder()
    .setTitle('🎉 Welcome to the Server!')
    .setDescription(
      `Hey ${member}, welcome to **${member.guild.name}**!\n\n` +
      `We're so glad to have you here. Make sure to check out the rules and enjoy your stay! 🎊`
    )
    .setColor(0x2ecc71)
    .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 256 }))
    .addFields(
      { name: '👤 Username', value: `${member.user.tag}`, inline: true },
      { name: '🆔 User ID', value: `\`${member.id}\``, inline: true },
      { name: '👥 Member Count', value: `You are member **#${member.guild.memberCount}**!`, inline: false },
      { name: '📅 Account Created', value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R> (${accountAge} ago)`, inline: false }
    )
    .setFooter({ text: `${member.guild.name} • Welcome!`, iconURL: member.guild.iconURL({ dynamic: true }) })
    .setTimestamp();

  try {
    await welcomeChannel.send({ embeds: [embed] });
    console.log(`👋 Welcome message sent for ${member.user.tag}`);
  } catch (error) {
    console.error('❌ Error sending welcome message:', error);
  }

  // Update stats when a member joins
  await updateStats();
});

// ========== MEMBER LEAVE → GOODBYE MESSAGE ==========
client.on('guildMemberRemove', async (member) => {
  // Handle partial member data (may occur for uncached members)
  if (member.partial) {
    try {
      await member.fetch();
    } catch {
      console.error('❌ Could not fetch departed member data.');
      await updateStats();
      return;
    }
  }

  // Send goodbye embed
  const goodbyeChannel = client.channels.cache.get(CONFIG.goodbyeChannelId);
  if (!goodbyeChannel) {
    console.error('❌ Goodbye channel not found!');
    return;
  }

  const joinedAt = member.joinedTimestamp;
  const timeInServer = joinedAt ? formatDuration(Date.now() - joinedAt) : 'Unknown';

  const embed = new EmbedBuilder()
    .setTitle('😢 Goodbye, Friend...')
    .setDescription(
      `**${member.user.tag}** has left **${member.guild.name}**.\n\n` +
      `We're sad to see you go. Hope to see you again someday! 💔`
    )
    .setColor(0xe74c3c)
    .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 256 }))
    .addFields(
      { name: '👤 Username', value: `${member.user.tag}`, inline: true },
      { name: '🆔 User ID', value: `\`${member.id}\``, inline: true },
      { name: '⏱️ Time in Server', value: timeInServer, inline: false },
      { name: '👥 Members Remaining', value: `**${member.guild.memberCount}** members`, inline: false }
    )
    .setFooter({ text: `${member.guild.name} • Farewell`, iconURL: member.guild.iconURL({ dynamic: true }) })
    .setTimestamp();

  try {
    await goodbyeChannel.send({ embeds: [embed] });
    console.log(`👋 Goodbye message sent for ${member.user.tag}`);
  } catch (error) {
    console.error('❌ Error sending goodbye message:', error);
  }

  // Update stats when a member leaves
  await updateStats();
});

// ========== SLASH COMMANDS ==========
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === 'update') {
    // Check if user has Owner or Admin role
    const member = interaction.member;
    const hasPermission =
      member.roles.cache.has(CONFIG.ownerRoleId) ||
      member.roles.cache.has(CONFIG.adminRoleId);

    if (!hasPermission) {
      return interaction.reply({
        content: '❌ You need the **Owner** or **Admin** role to use this command.',
        ephemeral: true,
      });
    }

    const version = interaction.options.getString('version');
    const title = interaction.options.getString('title');
    const changesRaw = interaction.options.getString('changes');
    const type = interaction.options.getString('type') || 'feature';

    // Parse changes separated by |
    const changesList = changesRaw
      .split('|')
      .map((c) => c.trim())
      .filter((c) => c.length > 0)
      .map((c) => `• ${c}`)
      .join('\n');

    // Type-based styling
    const typeConfig = {
      feature: { emoji: '🚀', label: 'New Feature', color: 0x2ecc71 },
      bugfix: { emoji: '🐛', label: 'Bug Fix', color: 0xe67e22 },
      maintenance: { emoji: '🔧', label: 'Maintenance', color: 0x3498db },
      announcement: { emoji: '📢', label: 'Announcement', color: 0x9b59b6 },
    };

    const { emoji, label, color } = typeConfig[type];

    const embed = new EmbedBuilder()
      .setTitle(`${emoji} ${title}`)
      .setDescription(
        `**Version:** \`${version}\`\n**Type:** ${emoji} ${label}\n\n` +
        `**📋 Changes:**\n${changesList}`
      )
      .setColor(color)
      .setFooter({
        text: `Update by ${interaction.user.tag}`,
        iconURL: interaction.user.displayAvatarURL({ dynamic: true }),
      })
      .setTimestamp();

    // Send to changelog channel
    const changelogChannel = client.channels.cache.get(CONFIG.changelogChannelId);
    if (!changelogChannel) {
      return interaction.reply({
        content: '❌ Changelog channel not found! Check the CHANGELOG_CHANNEL_ID in .env',
        ephemeral: true,
      });
    }

    try {
      await changelogChannel.send({ embeds: [embed] });
      await interaction.reply({
        content: `✅ Changelog **${version}** has been posted to <#${CONFIG.changelogChannelId}>!`,
        ephemeral: true,
      });
      console.log(`📝 Changelog ${version} posted by ${interaction.user.tag}`);
    } catch (error) {
      console.error('❌ Error posting changelog:', error);
      await interaction.reply({
        content: '❌ Failed to post changelog. Check bot permissions.',
        ephemeral: true,
      });
    }
  }
});

// ========== GLOBAL ERROR HANDLERS ==========
client.on('error', (error) => {
  console.error('❌ Client error:', error);
});

process.on('unhandledRejection', (error) => {
  console.error('❌ Unhandled promise rejection:', error);
});

// ========== LOGIN ==========
client.login(process.env.DISCORD_TOKEN);
