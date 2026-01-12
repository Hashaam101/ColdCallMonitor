const fs = require('fs');
const path = require('path');
// We need to use the Appwrite SDK from the project
// Note: This script assumes 'appwrite' is installed in node_modules
const { Client } = require('appwrite');

// Manually read .env.local to avoid adding dependencies
function loadEnv() {
    try {
        const envPath = path.join(__dirname, '..', '.env');
        if (!fs.existsSync(envPath)) {
            // Try .env.local as fallback
            const localEnvPath = path.join(__dirname, '..', '.env.local');
            if (fs.existsSync(localEnvPath)) {
                return parseEnv(fs.readFileSync(localEnvPath, 'utf8'));
            }
            console.error('Error: .env or .env.local file not found!');
            process.exit(1);
        }
        return parseEnv(fs.readFileSync(envPath, 'utf8'));
    } catch (error) {
        console.error('Error loading env file:', error);
        process.exit(1);
    }
}

function parseEnv(envContent) {
    const env = {};
    const lines = envContent.replace(/\r\n/g, '\n').split('\n');
    lines.forEach(line => {
        const match = line.match(/^\s*([\w\.\-]+)\s*=\s*(.*)?\s*$/);
        if (match) {
            const key = match[1];
            let value = match[2] || '';
            if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
                value = value.slice(1, -1);
            }
            env[key] = value;
        }
    });
    return env;
}

const env = loadEnv();
const endpoint = env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
const projectId = env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;

if (!endpoint || !projectId) {
    console.error('Error: Missing Appwrite configuration in .env.local');
    console.log('Endpoint:', endpoint ? 'Found' : 'Missing');
    console.log('ProjectID:', projectId ? 'Found' : 'Missing');
    process.exit(1);
}

console.log(`Testing Appwrite Realtime Connection...`);
console.log(`Endpoint: ${endpoint}`);
console.log(`Project ID: ${projectId}`);

const client = new Client();
client
    .setEndpoint(endpoint)
    .setProject(projectId);

// Try to subscribe to a generic likely-to-exist channel or a wildcard if possible, 
// or just one of the collections mentioned in the code if we can get an ID.
// From previous file reads, we saw: database ID and collection IDs are also in env.
const databaseId = env.NEXT_PUBLIC_APPWRITE_DATABASE_ID;
// Pick one collection to test
const collectionId = env.NEXT_PUBLIC_APPWRITE_COLDCALLS_COLLECTION_ID;

if (!databaseId || !collectionId) {
    console.warn('Warning: Database or Collection ID missing, cannot test specific channel subscription.');
    console.log('Will try to subscribe to files channel as a fallback/test.');
}

const channel = databaseId && collectionId
    ? `databases.${databaseId}.collections.${collectionId}.documents`
    : 'files';

console.log(`Subscribing to channel: ${channel}`);

try {
    const unsubscribe = client.subscribe(channel, (response) => {
        console.log('Received message:', JSON.stringify(response, null, 2));
    });

    console.log('Subscription initiated. Waiting for messages or errors...');

    // Keep the script running
    setTimeout(() => {
        console.log('Test duration ended. Cleaning up...');
        unsubscribe();
        process.exit(0);
    }, 4000); // Run for 4 seconds

} catch (error) {
    console.error('Immediate error during subscribe:', error);
}

// Global error handlers
process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
    // process.exit(1); // Don't exit immediately, let's see if we get more info
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
