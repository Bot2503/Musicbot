const fs = require('fs');
const path = require('path');

module.exports = (client) => {
    const eventsPath = path.join(__dirname, '..', 'events');
    
    // Check if events directory exists
    if (!fs.existsSync(eventsPath)) {
        console.log('❌ Events directory not found');
        return;
    }

    const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

    for (const file of eventFiles) {
        const eventPath = path.join(eventsPath, file);
        
        try {
            const event = require(eventPath);
            
            // Validate event structure
            if (!event.name) {
                console.log(`❌ Event at ${eventPath} is missing required "name" property.`);
                continue;
            }

            if (!event.execute || typeof event.execute !== 'function') {
                console.log(`❌ Event at ${eventPath} is missing required "execute" function.`);
                continue;
            }

            // Register event listener
            if (event.once) {
                client.once(event.name, (...args) => event.execute(...args, client));
            } else {
                client.on(event.name, (...args) => event.execute(...args, client));
            }

            console.log(`✅ Loaded event: ${event.name} from ${file}`);
        } catch (error) {
            console.error(`❌ Error loading event at ${eventPath}:`, error);
        }
    }

    console.log(`📁 Event handler initialized. Loaded ${eventFiles.length} events.`);
};
