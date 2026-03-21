import { Client, MatcherSearchFilters } from '../types';

export function migrateClients(clients: any[]): Client[] {
  if (!Array.isArray(clients)) return [];
  return clients.map(client => syncClientSelectionProfile(client));
}

export function syncClientSelectionProfile(client: Client): Client {
  return {
    ...client,
    mentorRecommendations: client.mentorRecommendations || [],
    linkedFacultyIds: client.linkedFacultyIds || [],
    events: client.events || [],
    documents: client.documents || [],
  };
}

export function buildMatcherFiltersFromClient(client: Client): MatcherSearchFilters {
  return {
    countries: client.targetCountries ? client.targetCountries.split(/[,，\s]+/).filter(Boolean) : [],
    universities: client.targetUniversities ? client.targetUniversities.split(/[,，\s]+/).filter(Boolean) : [],
    fieldCategory: client.targetDepartment || '',
    // Add other filters as needed
  };
}
