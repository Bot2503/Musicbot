const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const { createErrorEmbed, createSuccessEmbed } = require("../../utils/embeds");

// Store admin IDs who can grant 247 permissions
const ADMIN_IDS = [
    "878498815357894716", // Thay bằng Discord ID của bạn
    "1300917487034044498", // Thêm các admin ID khác nếu cần
];

// Store guilds that have been granted 247 permission by admins
const granted247Guilds = new Map();

module.exports = {
    data: new SlashCommandBuilder()
        .setName("admin247")
        .setDescription(
            "Admin command to grant/revoke 247 permission for this server",
        )
        .addBooleanOption((option) =>
            option
                .setName("grant")
                .setDescription(
                    "Grant or revoke 247 permission for this server",
                )
                .setRequired(true),
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        const userId = interaction.user.id;
        const guildId = interaction.guildId;
        const grantPermission = interaction.options.getBoolean("grant");

        // Check if user is in the admin list
        if (!ADMIN_IDS.includes(userId)) {
            return interaction.reply({
                embeds: [
                    createErrorEmbed(
                        "🚫 Access Denied",
                        "You are not authorized to use this command. Only designated admins can grant 247 permissions.",
                    ),
                ],
                ephemeral: true,
            });
        }

        try {
            if (grantPermission) {
                // Grant 247 permission to this guild
                granted247Guilds.set(guildId, {
                    grantedBy: userId,
                    grantedAt: new Date(),
                    guildName: interaction.guild.name,
                });

                await interaction.reply({
                    embeds: [
                        createSuccessEmbed(
                            "✅ 247 Permission Granted",
                            `This server (${interaction.guild.name}) has been granted 247 mode permission.\nUsers with "Manage Channels" permission can now use the \`/247\` command.`,
                        ),
                    ],
                });

                console.log(
                    `[ADMIN247] Permission granted to guild ${guildId} (${interaction.guild.name}) by admin ${userId}`,
                );
            } else {
                // Revoke 247 permission from this guild
                const wasGranted = granted247Guilds.has(guildId);
                granted247Guilds.delete(guildId);

                await interaction.reply({
                    embeds: [
                        createSuccessEmbed(
                            "🚫 247 Permission Revoked",
                            `247 mode permission has been ${wasGranted ? "revoked from" : "confirmed as not granted to"} this server.\nThe \`/247\` command is no longer available.`,
                        ),
                    ],
                });

                console.log(
                    `[ADMIN247] Permission revoked from guild ${guildId} (${interaction.guild.name}) by admin ${userId}`,
                );
            }
        } catch (error) {
            console.error("Admin247 command error:", error);
            await interaction.reply({
                embeds: [
                    createErrorEmbed(
                        "Failed to update 247 permissions",
                        error.message,
                    ),
                ],
                ephemeral: true,
            });
        }
    },
};

// Export functions for use in other files
module.exports.isGuildAuthorized = function (guildId) {
    return granted247Guilds.has(guildId);
};

module.exports.getAuthorizedGuilds = function () {
    return granted247Guilds;
};

module.exports.ADMIN_IDS = ADMIN_IDS;
