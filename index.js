require('dotenv').config();
const { Client, GatewayIntentBits, Partials, EmbedBuilder } = require('discord.js');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.Message, Partials.Reaction, Partials.User],
});

// ======== CONFIGURATION ==========
const CONFIG = {
  verificationChannelId: 'YOUR_CHANNEL_ID_HERE',  // Replace with your #verification channel ID
  verifiedRoleId: 'YOUR_ROLE_ID_HERE',             // Replace with your Verified role ID
  verificationEmoji: '✅',                          // Emoji users react with
};

// ========== BOT READY =========
client.on('ready', async () => {
  console.log(`✅ Bot is online as ${client.user.tag}`);

  // Send verification message (only once — check if one already exists)
  const channel = client.channels.cache.get(CONFIG.verificationChannelId);
  if (!channel) {
    console.error('❌ Verification channel not found! Check your channel ID.');
    return;
  }

  // Check if bot already sent a verification message
  const messages = await channel.messages.fetch({ limit: 10 });
  const existingMessage = messages.find(
    (msg) => msg.author.id === client.user.id && msg.embeds.length > 0
  );

  if (!existingMessage) {
    // Send a new verification embed
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

// ========== LOGIN ==========
client.login(process.env.DISCORD_TOKEN);