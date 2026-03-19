import {
  Client,
  ClientSelectionProfile,
  DegreeType,
  MatcherSearchFilters,
  MatcherSearchTarget,
} from '../types';

const MULTI_VALUE_SPLIT_REGEX = /[\n,;|/，；、]+/;

export function splitMultiValue(value?: string | string[] | null): string[] {
  if (Array.isArray(value)) {
    return Array.from(new Set(value.map((item) => String(item || '').trim()).filter(Boolean)));
  }

  return Array.from(
    new Set(
      String(value || '')
        .split(MULTI_VALUE_SPLIT_REGEX)
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  );
}

export function joinMultiValue(values?: string[] | null, separator = '、'): string {
  return splitMultiValue(values || []).join(separator);
}

function normalizeDegreeType(value?: string | DegreeType): DegreeType | undefined {
  if (!value) return undefined;
  if (value === 'phd' || value === 'master' || value === 'unspecified') return value;

  const normalized = String(value).toLowerCase();
  if (normalized.includes('phd') || normalized.includes('博士')) return 'phd';
  if (normalized.includes('master') || normalized.includes('硕士')) return 'master';
  return 'unspecified';
}

export function buildSelectionProfile(client: Partial<Client>): ClientSelectionProfile {
  const existing = client.selectionProfile;
  return {
    countries: splitMultiValue(existing?.countries || client.targetCountries),
    universities: splitMultiValue(existing?.universities || client.targetUniversities),
    departments: splitMultiValue(existing?.departments || client.targetDepartment),
    majors: splitMultiValue(existing?.majors || client.targetDepartment),
    degreeType: normalizeDegreeType(existing?.degreeType),
    majorA: existing?.majorA || '',
    majorB: existing?.majorB || '',
    crossDiscipline: existing?.crossDiscipline ?? client.acceptCrossDiscipline ?? false,
    officialLinks: splitMultiValue(existing?.officialLinks),
    targetPosition: existing?.targetPosition || '',
    entryYear: existing?.entryYear || client.entryYear || '',
    selectionCount: existing?.selectionCount ?? client.selectionCount,
    selectionType: existing?.selectionType || client.selectionType || '',
    selectionDeadline: existing?.selectionDeadline || client.selectionDeadline || '',
    scholarshipRequirement: existing?.scholarshipRequirement || client.scholarshipRequirement || '',
    exclusions: existing?.exclusions || client.exclusions || '',
    rankingPreference: existing?.rankingPreference || client.rankingPreference || '',
    specialRequirements: existing?.specialRequirements || client.specialRequirements || '',
    businessCoordinator: existing?.businessCoordinator || client.businessCoordinator || '',
    hasRP: existing?.hasRP ?? client.hasRP,
    hasCV: existing?.hasCV ?? client.hasCV,
    hasPublications: existing?.hasPublications ?? client.hasPublications,
    rpTopic: existing?.rpTopic || client.rpTopic || '',
    avoidPreviousMentors: existing?.avoidPreviousMentors || client.avoidPreviousMentors || '',
  };
}

export function buildSelectionProfilePatch(profile: ClientSelectionProfile): Partial<Client> {
  const combinedMajors = splitMultiValue([
    ...profile.departments,
    ...profile.majors,
    profile.majorA || '',
    profile.majorB || '',
  ]);

  return {
    selectionProfile: {
      ...profile,
      countries: splitMultiValue(profile.countries),
      universities: splitMultiValue(profile.universities),
      departments: splitMultiValue(profile.departments),
      majors: splitMultiValue(profile.majors),
      officialLinks: splitMultiValue(profile.officialLinks),
      degreeType: normalizeDegreeType(profile.degreeType),
      crossDiscipline: Boolean(profile.crossDiscipline),
    },
    targetCountries: joinMultiValue(profile.countries),
    targetUniversities: joinMultiValue(profile.universities),
    targetDepartment: joinMultiValue(combinedMajors, ' / '),
    entryYear: profile.entryYear || undefined,
    scholarshipRequirement: profile.scholarshipRequirement || undefined,
    exclusions: profile.exclusions || undefined,
    rankingPreference: profile.rankingPreference || undefined,
    acceptCrossDiscipline: profile.crossDiscipline ?? false,
    specialRequirements: profile.specialRequirements || undefined,
    hasRP: profile.hasRP,
    hasCV: profile.hasCV,
    hasPublications: profile.hasPublications,
    rpTopic: profile.rpTopic || undefined,
    businessCoordinator: profile.businessCoordinator || undefined,
    selectionType: profile.selectionType || undefined,
    selectionCount: profile.selectionCount,
    selectionDeadline: profile.selectionDeadline || undefined,
    avoidPreviousMentors: profile.avoidPreviousMentors || undefined,
  };
}

export function syncClientSelectionProfile(client: Client): Client {
  return {
    ...client,
    ...buildSelectionProfilePatch(buildSelectionProfile(client)),
    mentorRecommendations: client.mentorRecommendations || [],
  };
}

export function migrateClients(clients: Client[]): Client[] {
  return clients.map((client) => syncClientSelectionProfile(client));
}

export function buildClientProfileSummary(client: Partial<Client>): string {
  const parts: string[] = [];
  if (client.name) parts.push(`学生：${client.name}`);
  if (client.university) parts.push(`当前院校：${client.university}`);
  if (client.gpa) parts.push(`GPA：${client.gpa}`);

  const educations = client.educations || [];
  if (educations.length > 0) {
    parts.push(
      `教育经历：${educations
        .map((item) => [item.school, item.degree, item.major].filter(Boolean).join(' / '))
        .join('；')}`,
    );
  }

  const researchBits = [
    client.interests,
    client.academicAchievements,
    client.rpTopic,
    client.careerAspirations,
    client.skillsAndQualities,
    client.experiencesAndChallenges,
  ].filter(Boolean);

  if (researchBits.length > 0) {
    parts.push(`背景摘要：${researchBits.join('；')}`);
  }

  return parts.join('\n');
}

export function buildMatcherTargetsFromProfile(profile: ClientSelectionProfile): MatcherSearchTarget[] {
  if (
    profile.countries.length === 0 &&
    profile.universities.length === 0 &&
    profile.departments.length === 0 &&
    profile.majors.length === 0
  ) {
    return [
      {
        id: crypto.randomUUID(),
        count: profile.selectionCount || 5,
      },
    ];
  }

  const count = Math.max(profile.selectionCount || 5, 1);
  const size = Math.max(
    profile.countries.length,
    profile.universities.length,
    profile.departments.length,
    profile.majors.length,
    1,
  );

  return Array.from({ length: size }, (_, index) => ({
    id: crypto.randomUUID(),
    country: profile.countries[index] || profile.countries[0] || '',
    university: profile.universities[index] || profile.universities[0] || '',
    department: profile.departments[index] || profile.departments[0] || '',
    major: profile.majors[index] || profile.majors[0] || '',
    count,
  }));
}

export function buildMatcherFiltersFromClient(client: Client): MatcherSearchFilters {
  const profile = buildSelectionProfile(client);
  return {
    sourceModes: ['local', 'web'],
    targets: buildMatcherTargetsFromProfile(profile),
    degreeType: profile.degreeType || 'unspecified',
    majorA: profile.majorA || '',
    majorB: profile.majorB || '',
    crossDiscipline: profile.crossDiscipline ?? false,
    officialLinks: profile.officialLinks,
    profileSummary: buildClientProfileSummary(client),
    manualNotes: client.interests || '',
    scholarshipRequirement: profile.scholarshipRequirement || '',
    exclusions: profile.exclusions || '',
    rankingPreference: profile.rankingPreference || '',
    specialRequirements: profile.specialRequirements || '',
    targetPosition: profile.targetPosition || '',
    entryYear: profile.entryYear || '',
    businessCoordinator: profile.businessCoordinator || '',
    selectionType: profile.selectionType || '',
    selectionCount: profile.selectionCount,
    selectionDeadline: profile.selectionDeadline || '',
    hasRP: profile.hasRP,
    hasCV: profile.hasCV,
    hasPublications: profile.hasPublications,
    rpTopic: profile.rpTopic || '',
    avoidPreviousMentors: profile.avoidPreviousMentors || '',
  };
}
