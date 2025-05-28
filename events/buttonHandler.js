
const { Events } = require('discord.js');
const { createErrorEmbed, createSuccessEmbed } = require('../utils/embeds');
const TopGGVoteChecker = require('../utils/topgg');

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction) {
        if (!interaction.isButton()) return;

        const { customId, user } = interaction;

        if (customId === 'check_vote_247' || customId === 'check_vote_loop') {
            await interaction.deferUpdate();

            // Clear cache and check again
            TopGGVoteChecker.clearCache(user.id);
            const hasVoted = await TopGGVoteChecker.hasVoted(user.id);

            if (hasVoted) {
                const featureName = customId.includes('247') ? '24/7 mode' : 'loop mode';
                await interaction.followUp({
                    embeds: [createSuccessEmbed(
                        '✅ Vote Verified!',
                        `Thank you for voting! You can now use ${featureName}.\n\nPlease run the command again to use the feature.`
                    )],
                    ephemeral: true
                });
            } else {
                await interaction.followUp({
                    embeds: [createErrorEmbed(
                        '❌ Vote Not Found',
                        'We couldn\'t find your vote yet. Please make sure you voted and try again in a few minutes.\n\nSometimes top.gg takes a moment to update.'
                    )],
                    ephemeral: true
                });
            }
        }
    }
};
