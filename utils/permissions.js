const { PermissionFlagsBits } = require('discord.js');

/**
 * Check if a member has DJ permissions
 * @param {Object} member - Discord guild member
 * @param {string} type - Permission type ('dj' or 'basic')
 * @returns {Promise<boolean>} Whether the member has the required permissions
 */
async function checkPermissions(member, type = 'basic') {
    if (!member || !member.guild) return false;
    
    try {
        switch (type) {
            case 'dj':
                return checkDJPermissions(member);
            case 'basic':
                return checkBasicPermissions(member);
            default:
                return false;
        }
    } catch (error) {
        console.error('Error checking permissions:', error);
        return false;
    }
}

/**
 * Check if member has DJ permissions
 * @param {Object} member - Discord guild member
 * @returns {boolean} Whether the member has DJ permissions
 */
function checkDJPermissions(member) {
    // Server owner always has DJ permissions
    if (member.guild.ownerId === member.id) return true;
    
    // Check for specific DJ permissions
    const djPermissions = [
        PermissionFlagsBits.ManageChannels,
        PermissionFlagsBits.MoveMembers,
        PermissionFlagsBits.Administrator
    ];
    
    return djPermissions.some(permission => member.permissions.has(permission));
}

/**
 * Check if member has basic permissions
 * @param {Object} member - Discord guild member
 * @returns {boolean} Whether the member has basic permissions
 */
function checkBasicPermissions(member) {
    // Basic permissions that everyone should have
    const basicPermissions = [
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.UseApplicationCommands
    ];
    
    return basicPermissions.every(permission => member.permissions.has(permission));
}

/**
 * Check if member is alone with the bot in voice channel
 * @param {Object} member - Discord guild member
 * @param {Object} voiceChannel - Voice channel to check
 * @returns {boolean} Whether the member is alone with the bot
 */
function isAloneWithBot(member, voiceChannel) {
    if (!voiceChannel || !member.voice.channel) return false;
    
    const membersInChannel = voiceChannel.members.filter(m => !m.user.bot);
    return membersInChannel.size === 1 && membersInChannel.has(member.id);
}

/**
 * Check if bot has required permissions in voice channel
 * @param {Object} voiceChannel - Voice channel to check
 * @param {Object} botMember - Bot's guild member object
 * @returns {Object} Permission check result
 */
function checkBotVoicePermissions(voiceChannel, botMember) {
    const permissions = voiceChannel.permissionsFor(botMember);
    
    const requiredPermissions = [
        PermissionFlagsBits.Connect,
        PermissionFlagsBits.Speak,
        PermissionFlagsBits.ViewChannel
    ];
    
    const missing = [];
    const hasAll = requiredPermissions.every(permission => {
        const has = permissions.has(permission);
        if (!has) {
            missing.push(getPermissionName(permission));
        }
        return has;
    });
    
    return {
        hasAll,
        missing,
        canConnect: permissions.has(PermissionFlagsBits.Connect),
        canSpeak: permissions.has(PermissionFlagsBits.Speak),
        canView: permissions.has(PermissionFlagsBits.ViewChannel)
    };
}

/**
 * Check if bot has required permissions in text channel
 * @param {Object} textChannel - Text channel to check
 * @param {Object} botMember - Bot's guild member object
 * @returns {Object} Permission check result
 */
function checkBotTextPermissions(textChannel, botMember) {
    const permissions = textChannel.permissionsFor(botMember);
    
    const requiredPermissions = [
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.UseApplicationCommands,
        PermissionFlagsBits.EmbedLinks,
        PermissionFlagsBits.ViewChannel
    ];
    
    const missing = [];
    const hasAll = requiredPermissions.every(permission => {
        const has = permissions.has(permission);
        if (!has) {
            missing.push(getPermissionName(permission));
        }
        return has;
    });
    
    return {
        hasAll,
        missing,
        canSend: permissions.has(PermissionFlagsBits.SendMessages),
        canUseSlash: permissions.has(PermissionFlagsBits.UseApplicationCommands),
        canEmbed: permissions.has(PermissionFlagsBits.EmbedLinks)
    };
}

/**
 * Get human-readable permission name
 * @param {BigInt} permission - Permission flag
 * @returns {string} Human-readable permission name
 */
function getPermissionName(permission) {
    const permissionNames = {
        [PermissionFlagsBits.Administrator]: 'Administrator',
        [PermissionFlagsBits.ManageChannels]: 'Manage Channels',
        [PermissionFlagsBits.MoveMembers]: 'Move Members',
        [PermissionFlagsBits.Connect]: 'Connect',
        [PermissionFlagsBits.Speak]: 'Speak',
        [PermissionFlagsBits.ViewChannel]: 'View Channel',
        [PermissionFlagsBits.SendMessages]: 'Send Messages',
        [PermissionFlagsBits.UseApplicationCommands]: 'Use Application Commands',
        [PermissionFlagsBits.EmbedLinks]: 'Embed Links'
    };
    
    return permissionNames[permission] || 'Unknown Permission';
}

/**
 * Check if user can control a song (requester or has DJ permissions)
 * @param {Object} member - Discord guild member
 * @param {Object} song - Song object
 * @param {Object} voiceChannel - Voice channel
 * @returns {Promise<boolean>} Whether the user can control the song
 */
async function canControlSong(member, song, voiceChannel) {
    // Song requester can always control their song
    if (song && song.requestedBy && song.requestedBy.id === member.id) {
        return true;
    }
    
    // DJ permissions
    if (await checkPermissions(member, 'dj')) {
        return true;
    }
    
    // Alone with bot in voice channel
    if (voiceChannel && isAloneWithBot(member, voiceChannel)) {
        return true;
    }
    
    return false;
}

/**
 * Get permission level for a member in the context of music commands
 * @param {Object} member - Discord guild member
 * @param {Object} voiceChannel - Voice channel (optional)
 * @returns {string} Permission level ('owner', 'dj', 'alone', 'basic')
 */
function getPermissionLevel(member, voiceChannel = null) {
    // Server owner
    if (member.guild.ownerId === member.id) {
        return 'owner';
    }
    
    // DJ permissions
    if (checkDJPermissions(member)) {
        return 'dj';
    }
    
    // Alone with bot
    if (voiceChannel && isAloneWithBot(member, voiceChannel)) {
        return 'alone';
    }
    
    return 'basic';
}

/**
 * Format permission requirements for error messages
 * @param {string} requiredLevel - Required permission level
 * @returns {string} Formatted permission requirement message
 */
function formatPermissionRequirement(requiredLevel) {
    switch (requiredLevel) {
        case 'dj':
            return 'You need DJ permissions (Manage Channels or Move Members) to use this command.';
        case 'owner':
            return 'Only the server owner can use this command.';
        case 'song_requester':
            return 'You can only control songs you requested, or you need DJ permissions.';
        case 'voice_channel':
            return 'You need to be in the same voice channel as the bot.';
        default:
            return 'You don\'t have permission to use this command.';
    }
}

module.exports = {
    checkPermissions,
    checkDJPermissions,
    checkBasicPermissions,
    isAloneWithBot,
    checkBotVoicePermissions,
    checkBotTextPermissions,
    canControlSong,
    getPermissionLevel,
    formatPermissionRequirement,
    getPermissionName
};
