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
    GatewayIntentBits.GuildInvites,
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
  rulesChannelId: process.env.RULES_CHANNEL_ID,
  ownerRoleId: process.env.OWNER_ROLE_ID,
  adminRoleId: process.env.ADMIN_ROLE_ID,
  inviteTrackerChannelId: process.env.INVITE_TRACKER_CHANNEL_ID,
};

// Stores the stats message ID so we can edit it instead of sending new ones
let statsMessageId = null;

// Prevents setInterval stacking on reconnect
let statsInterval = null;

// Mutex/lock to prevent concurrent stats updates
let isUpdatingStats = false;

// Invite cache for tracking who invited whom
const inviteCache = new Map();

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

// ========== HELPER: SEND RULES ==========
async function sendRules(channel) {
  // Header embed
  const headerEmbed = new EmbedBuilder()
    .setTitle('📜 SERVER RULES / PERATURAN SERVER')
    .setDescription(
      '🇬🇧 **English** • 🇮🇩 **Bahasa Indonesia**\n\n' +
      'Please read and follow all the rules below to maintain a safe and enjoyable community for everyone.\n' +
      '*Harap baca dan patuhi semua peraturan di bawah ini demi menjaga komunitas yang aman dan nyaman untuk semua.*\n\n' +
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
    )
    .setColor(0xf1c40f)
    .setThumbnail(channel.guild.iconURL({ dynamic: true, size: 256 }));

  // Rule embeds - split into groups for readability
  const rulesEmbed1 = new EmbedBuilder()
    .setColor(0x3498db)
    .addFields(
      {
        name: '1️⃣ Respect All Members\n*Hormati Semua Member*',
        value:
          '🇬🇧 Do not insult, belittle, harass, or provoke unnecessary conflicts with other members. Treat everyone with kindness and respect.\n' +
          '🇮🇩 *Dilarang menghina, merendahkan, melakukan harassment, atau memancing konflik yang tidak perlu. Perlakukan semua orang dengan baik dan hormat.*',
      },
      {
        name: '\u200b',
        value: '━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
      },
      {
        name: '2️⃣ No Spam / Flood\n*Dilarang Spam / Flood*',
        value:
          '🇬🇧 Do not spam messages, emojis, mentions, or send repetitive/meaningless content that disrupts conversations.\n' +
          '🇮🇩 *Dilarang spam pesan, emoji, mention, atau mengirim konten berulang/tidak bermakna yang mengganggu percakapan.*',
      },
      {
        name: '\u200b',
        value: '━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
      },
      {
        name: '3️⃣ No NSFW / Illegal Content\n*Dilarang Konten NSFW / Ilegal*',
        value:
          '🇬🇧 Pornographic material, excessive gore, or any form of illegal content is strictly prohibited across all channels.\n' +
          '🇮🇩 *Konten pornografi, gore berlebihan, atau segala bentuk konten ilegal dilarang keras di semua channel.*',
      },
      {
        name: '\u200b',
        value: '━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
      },
      {
        name: '4️⃣ No Hate Speech\n*Dilarang Ujaran Kebencian*',
        value:
          '🇬🇧 Any form of discrimination or hate speech targeting race, ethnicity, religion, gender, sexual orientation, or other sensitive topics is prohibited.\n' +
          '🇮🇩 *Segala bentuk diskriminasi atau ujaran kebencian yang menyasar ras, suku, agama, gender, orientasi seksual, atau topik sensitif lainnya dilarang.*',
      },
      {
        name: '\u200b',
        value: '━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
      },
      {
        name: '5️⃣ No Scam / Phishing / Malware\n*Dilarang Scam / Phishing / Malware*',
        value:
          '🇬🇧 Sharing scam links, phishing attempts, malware, or any activity intended to harm or deceive other members is strictly forbidden.\n' +
          '🇮🇩 *Dilarang membagikan link scam, phishing, malware, atau aktivitas apa pun yang bertujuan merugikan atau menipu member lain.*',
      },
    );

  const rulesEmbed2 = new EmbedBuilder()
    .setColor(0x3498db)
    .addFields(
      {
        name: '6️⃣ Use Channels Appropriately\n*Gunakan Channel Sesuai Fungsinya*',
        value:
          '🇬🇧 Please use each channel according to its designated topic. This keeps the server organized and comfortable for everyone.\n' +
          '🇮🇩 *Gunakan setiap channel sesuai topik yang telah ditentukan. Ini menjaga server tetap rapi dan nyaman untuk semua.*',
      },
      {
        name: '\u200b',
        value: '━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
      },
      {
        name: '7️⃣ No Advertising Without Permission\n*Dilarang Promosi Tanpa Izin*',
        value:
          '🇬🇧 Promoting other servers, products, social media, or external communities without prior staff approval is not allowed.\n' +
          '🇮🇩 *Promosi server lain, produk, media sosial, atau komunitas eksternal tanpa persetujuan staff tidak diperbolehkan.*',
      },
      {
        name: '\u200b',
        value: '━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
      },
      {
        name: '8️⃣ Respect Privacy\n*Jaga Privasi*',
        value:
          '🇬🇧 Do not share personal information — whether your own or others\' — without explicit consent. This includes real names, addresses, photos, and other private data.\n' +
          '🇮🇩 *Dilarang menyebarkan informasi pribadi — baik milik sendiri maupun orang lain — tanpa persetujuan yang jelas. Termasuk nama asli, alamat, foto, dan data pribadi lainnya.*',
      },
      {
        name: '\u200b',
        value: '━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
      },
      {
        name: '9️⃣ Follow Staff Instructions\n*Ikuti Arahan Staff*',
        value:
          '🇬🇧 Decisions and instructions from the Owner and Administrators must be respected, as long as they are in accordance with the server rules.\n' +
          '🇮🇩 *Keputusan dan arahan dari Owner serta Administrator wajib dihormati, selama sesuai dengan peraturan server.*',
      },
      {
        name: '\u200b',
        value: '━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
      },
      {
        name: '🔟 Use Common Sense\n*Gunakan Akal Sehat*',
        value:
          '🇬🇧 If something feels disruptive, harmful, or damaging to the community\'s well-being — don\'t do it. When in doubt, ask a staff member.\n' +
          '🇮🇩 *Jika sesuatu terasa mengganggu, merugikan, atau merusak kenyamanan komunitas — jangan dilakukan. Jika ragu, tanyakan kepada staff.*',
      },
    );

  // Enforcement / footer embed
  const enforcementEmbed = new EmbedBuilder()
    .setTitle('⚖️ Enforcement / Penegakan Aturan')
    .setDescription(
      'Violations may result in the following actions:\n' +
      '*Pelanggaran dapat mengakibatkan tindakan berikut:*\n\n' +
      '```\n' +
      '⚠️  Warning        →  Peringatan\n' +
      '⏰  Timeout        →  Pembatasan sementara\n' +
      '👢  Kick           →  Dikeluarkan dari server\n' +
      '🔨  Ban            →  Diblokir permanen\n' +
      '```\n\n' +
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
      '🇬🇧 By joining this server, you acknowledge that you have read, understood, and agreed to abide by all the rules listed above.\n\n' +
      '🇮🇩 *Dengan bergabung di server ini, kamu dianggap telah membaca, memahami, dan menyetujui untuk mematuhi semua peraturan yang tercantum di atas.*\n\n' +
      '**Thank you for helping us build a great community! 🙏**\n' +
      '***Terima kasih telah membantu kami membangun komunitas yang hebat!***'
    )
    .setColor(0xe74c3c)
    .setFooter({ text: 'Last updated' })
    .setTimestamp();

  // Send all embeds in order
  await channel.send({ embeds: [headerEmbed] });
  await channel.send({ embeds: [rulesEmbed1] });
  await channel.send({ embeds: [rulesEmbed2] });
  await channel.send({ embeds: [enforcementEmbed] });
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

  // ---------- Rules Message ----------
  try {
    const rulesChannel = client.channels.cache.get(CONFIG.rulesChannelId);
    if (!rulesChannel) {
      console.error('❌ Rules channel not found! Check your channel ID.');
    } else {
      // Check if bot already sent rules (look for the header embed)
      const rulesMessages = await rulesChannel.messages.fetch({ limit: 10 });
      const existingRules = rulesMessages.find(
        (msg) =>
          msg.author.id === client.user.id &&
          msg.embeds.length > 0 &&
          msg.embeds[0].title === '📜 SERVER RULES / PERATURAN SERVER'
      );

      if (!existingRules) {
        await sendRules(rulesChannel);
        console.log('📜 Rules messages sent!');
      } else {
        console.log('📜 Rules messages already exist.');
      }
    }
  } catch (error) {
    console.error('❌ Error setting up rules:', error.message);
    console.error('💡 Make sure the bot has "Send Messages" and "Embed Links" permissions in the rules channel.');
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

  // ---------- Invite Tracker: Cache Invites ----------
  try {
    const guild = client.guilds.cache.get(CONFIG.guildId);
    if (guild) {
      const invites = await guild.invites.fetch();
      invites.forEach(invite => {
        inviteCache.set(invite.code, invite.uses);
      });
      console.log(`📨 Cached ${inviteCache.size} invite(s) for invite tracking.`);
    }
  } catch (error) {
    console.error('❌ Error caching invites:', error.message);
    console.error('💡 Make sure the bot has "Manage Server" permission to track invites.');
  }
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
  // ---------- Invite Tracking ----------
  try {
    const inviteTrackerChannel = client.channels.cache.get(CONFIG.inviteTrackerChannelId);
    if (inviteTrackerChannel) {
      const newInvites = await member.guild.invites.fetch();
      
      // Find the invite that was used (the one with increased uses)
      const usedInvite = newInvites.find(inv => {
        const cachedUses = inviteCache.get(inv.code) || 0;
        return inv.uses > cachedUses;
      });

      // Update the cache with new invite data
      newInvites.forEach(inv => {
        inviteCache.set(inv.code, inv.uses);
      });

      if (usedInvite && usedInvite.inviter) {
        const inviter = usedInvite.inviter;
        const totalInvites = newInvites
          .filter(inv => inv.inviter && inv.inviter.id === inviter.id)
          .reduce((acc, inv) => acc + inv.uses, 0);

        const inviteEmbed = new EmbedBuilder()
          .setTitle('📨 Invite Tracker')
          .setDescription(
            `${member} was invited by ${inviter}\n\n` +
            `📎 **Invite Code:** \`${usedInvite.code}\`\n` +
            `📊 **${inviter.tag}** now has **${totalInvites}** invite${totalInvites !== 1 ? 's' : ''}`
          )
          .setColor(0x3498db)
          .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 256 }))
          .setFooter({ text: `${member.guild.name} • Invite Tracker`, iconURL: member.guild.iconURL({ dynamic: true }) })
          .setTimestamp();

        await inviteTrackerChannel.send({ embeds: [inviteEmbed] });
        console.log(`📨 ${member.user.tag} was invited by ${inviter.tag} (code: ${usedInvite.code})`);
      } else {
        // Could not determine who invited (vanity URL, unknown, etc.)
        const unknownEmbed = new EmbedBuilder()
          .setTitle('📨 Invite Tracker')
          .setDescription(
            `${member} joined the server\n\n` +
            `⚠️ Could not determine who invited this member.\n` +
            `*(Possible: Vanity URL, Server Discovery, or expired invite)*`
          )
          .setColor(0x95a5a6)
          .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 256 }))
          .setFooter({ text: `${member.guild.name} • Invite Tracker`, iconURL: member.guild.iconURL({ dynamic: true }) })
          .setTimestamp();

        await inviteTrackerChannel.send({ embeds: [unknownEmbed] });
        console.log(`📨 ${member.user.tag} joined but inviter could not be determined.`);
      }
    }
  } catch (error) {
    console.error('❌ Error tracking invite:', error);
  }

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

// ========== INVITE CREATE → UPDATE CACHE ==========
client.on('inviteCreate', (invite) => {
  inviteCache.set(invite.code, invite.uses);
  console.log(`📨 Invite created: ${invite.code} by ${invite.inviter?.tag || 'Unknown'}`);
});

// ========== INVITE DELETE → REMOVE FROM CACHE ==========
client.on('inviteDelete', (invite) => {
  inviteCache.delete(invite.code);
  console.log(`📨 Invite deleted: ${invite.code}`);
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
