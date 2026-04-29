require('dotenv').config();
const { REST, Routes, SlashCommandBuilder } = require('discord.js');

const commands = [
  new SlashCommandBuilder()
    .setName('update')
    .setDescription('Post a changelog/update announcement (Owner/Admin only)')
    .addStringOption(option =>
      option.setName('version')
        .setDescription('Version number (e.g., v1.2.0)')
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName('title')
        .setDescription('Update title (e.g., "New Features and Bug Fixes")')
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName('changes')
        .setDescription('List of changes separated by | (e.g., "Added X | Fixed Y | Removed Z")')
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName('type')
        .setDescription('Type of update')
        .setRequired(false)
        .addChoices(
          { name: '🚀 Feature', value: 'feature' },
          { name: '🐛 Bug Fix', value: 'bugfix' },
          { name: '🔧 Maintenance', value: 'maintenance' },
          { name: '📢 Announcement', value: 'announcement' },
        )
    )
    .toJSON(),
];

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    console.log('🔄 Registering slash commands...');
    await rest.put(
      Routes.applicationGuildCommands(process.env.APPLICATION_ID, process.env.GUILD_ID),
      { body: commands }
    );
    console.log('✅ Slash commands registered successfully!');
  } catch (error) {
    console.error('❌ Error registering commands:', error);
  }
})();
