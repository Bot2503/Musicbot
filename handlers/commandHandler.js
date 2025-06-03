const { Collection, REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = (client) => {
    // Initialize commands collection
    client.commands = new Collection();
    
    // Array to store command data for registration
    const commands = [];

    // Read command categories
    const commandsPath = path.join(__dirname, '..', 'commands');
    const commandFolders = fs.readdirSync(commandsPath);

    for (const folder of commandFolders) {
        const folderPath = path.join(commandsPath, folder);
        
        // Skip if not a directory
        if (!fs.statSync(folderPath).isDirectory()) continue;
        
        const commandFiles = fs.readdirSync(folderPath).filter(file => file.endsWith('.js'));

        for (const file of commandFiles) {
            const commandPath = path.join(folderPath, file);
            
            try {
                const command = require(commandPath);

                // Validate command structure
                if ('data' in command && 'execute' in command) {
                    // Set command in collection
                    client.commands.set(command.data.name, command);
                    
                    // Add to commands array for registration
                    commands.push(command.data.toJSON());
                    
                    console.log(`✅ Loaded command: ${command.data.name} from ${folder}/${file}`);
                } else {
                    console.log(`❌ Command at ${commandPath} is missing required "data" or "execute" property.`);
                }
            } catch (error) {
                console.error(`❌ Error loading command at ${commandPath}:`, error);
            }
        }
    }

    // Register slash commands with Discord
    const registerCommands = async () => {
        try {
            const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN || client.config.token);

            console.log(`🔄 Started refreshing ${commands.length} application (/) commands.`);

            // Register commands globally or per guild
            const data = await rest.put(
                Routes.applicationCommands(process.env.CLIENT_ID || client.config.clientId),
                { body: commands }
            );

            console.log(`✅ Successfully reloaded ${data.length} application (/) commands.`);
        } catch (error) {
            console.error('❌ Error registering slash commands:', error);
        }
    };

    // Register commands when client is ready
    client.once('ready', async () => {
        await registerCommands();
    });

    console.log(`📁 Command handler initialized. Loaded ${client.commands.size} commands from ${commandFolders.length} categories.`);
};
