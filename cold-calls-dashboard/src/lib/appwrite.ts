/**
 * Appwrite Client Configuration
 * 
 * This module initializes and exports the Appwrite client instances
 * for use throughout the application.
 */

import { Client, Account, Databases } from 'appwrite';

// Environment variable validation
const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;

if (!endpoint || !projectId) {
  console.warn('Appwrite configuration missing. Please check your .env.local file.');
}

// Initialize the Appwrite client
const client = new Client();

if (endpoint && projectId) {
  client
    .setEndpoint(endpoint)
    .setProject(projectId);
}

// Export service instances
export const account = new Account(client);
export const databases = new Databases(client);

// Export the client for real-time subscriptions
export { client };

// Database and collection IDs
export const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || '';
export const COLDCALLS_COLLECTION_ID = process.env.NEXT_PUBLIC_APPWRITE_COLDCALLS_COLLECTION_ID || '';
export const COMPANIES_COLLECTION_ID = process.env.NEXT_PUBLIC_APPWRITE_COMPANIES_COLLECTION_ID || '';
export const TRANSCRIPTS_COLLECTION_ID = process.env.NEXT_PUBLIC_APPWRITE_TRANSCRIPTS_COLLECTION_ID || '';
export const TEAM_MEMBERS_COLLECTION_ID = process.env.NEXT_PUBLIC_APPWRITE_TEAM_MEMBERS_COLLECTION_ID || '';
export const ALERTS_COLLECTION_ID = process.env.NEXT_PUBLIC_APPWRITE_ALERTS_COLLECTION_ID || '';

