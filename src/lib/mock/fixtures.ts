import type {
  Client,
  LibraryBlock,
  Medication,
  MockData,
  Survey,
} from '@/types/domain';

/**
 * Seed fixtures for the Admin demo.
 *
 * @remarks
 * Pure data — no behavior. The mock store deep-clones these as the initial /
 * reset state so seeded data is never mutated in place. Ids are stable literals
 * (not generated) so seeded entities are addressable across refreshes and so
 * reset is deterministic.
 */

/**
 * Reusable Block library the survey builder assembles surveys from.
 * Each block carries its questions as templates (no ids until copied).
 */
export const SEED_BLOCK_LIBRARY: LibraryBlock[] = [
  {
    id: 'lib-block-acknowledgments',
    name: 'Acknowledgments',
    description: 'Consent and acknowledgment prompts shown at the start.',
    questions: [
      {
        type: 'single-select',
        label: 'Do you consent to this medication check-in?',
        required: true,
        choices: [
          { id: 'c-yes', label: 'Yes', scoreCode: 0 },
          { id: 'c-no', label: 'No', scoreCode: 1 },
        ],
      },
    ],
  },
  {
    id: 'lib-block-contact',
    name: 'Contact',
    description: 'Verify the patient contact details on file.',
    questions: [
      {
        type: 'text',
        label: 'Confirm your preferred phone number',
        required: true,
        choices: [],
      },
    ],
  },
  {
    id: 'lib-block-demographics',
    name: 'Demographics',
    description: 'Baseline demographic questions.',
    questions: [
      {
        type: 'date',
        label: 'What is your date of birth?',
        required: true,
        choices: [],
      },
      {
        type: 'single-select',
        label: 'What is your preferred language?',
        required: false,
        choices: [
          { id: 'c-en', label: 'English', scoreCode: 0 },
          { id: 'c-es', label: 'Spanish', scoreCode: 0 },
        ],
      },
    ],
  },
  {
    id: 'lib-block-medication',
    name: 'Medication adherence',
    description: 'Core adherence questions driving the adherence score.',
    questions: [
      {
        type: 'single-select',
        label: 'Did you take your medication as prescribed this week?',
        required: true,
        choices: [
          { id: 'c-every', label: 'Every day', scoreCode: 0 },
          { id: 'c-most', label: 'Most days', scoreCode: 1 },
          { id: 'c-some', label: 'Some days', scoreCode: 2 },
          { id: 'c-none', label: 'Not at all', scoreCode: 3 },
        ],
      },
      {
        type: 'multi-select',
        label: 'Which side effects did you experience?',
        required: false,
        choices: [
          { id: 'c-nausea', label: 'Nausea', scoreCode: 1 },
          { id: 'c-dizzy', label: 'Dizziness', scoreCode: 1 },
          { id: 'c-fatigue', label: 'Fatigue', scoreCode: 1 },
          { id: 'c-none-se', label: 'None', scoreCode: 0 },
        ],
      },
    ],
  },
  {
    id: 'lib-block-sdoh',
    name: 'Social determinants',
    description: 'Non-clinical factors (housing, food, transport).',
    questions: [
      {
        type: 'single-select',
        label: 'Did you have reliable transportation this week?',
        required: false,
        choices: [
          { id: 'c-transp-yes', label: 'Yes', scoreCode: 0 },
          { id: 'c-transp-no', label: 'No', scoreCode: 2 },
        ],
      },
    ],
  },
];

/** Four sample clients with distinct white-label branding. */
export const SEED_CLIENTS: Client[] = [
  {
    id: 'client-bayside',
    name: 'Bayside Community Pharmacy',
    branding: {
      logo: 'https://placehold.co/120x40/1d4ed8/ffffff?text=Bayside',
      primaryColor: '#1d4ed8',
      secondaryColor: '#60a5fa',
    },
    status: 'active',
    createdAt: '2026-01-12T09:00:00.000Z',
  },
  {
    id: 'client-rivervalley',
    name: 'River Valley FQHC',
    branding: {
      logo: 'https://placehold.co/120x40/047857/ffffff?text=River+Valley',
      primaryColor: '#047857',
      secondaryColor: '#34d399',
    },
    status: 'active',
    createdAt: '2026-02-03T09:00:00.000Z',
  },
  {
    id: 'client-summit',
    name: 'Summit Care Clinic',
    branding: {
      logo: 'https://placehold.co/120x40/7c3aed/ffffff?text=Summit',
      primaryColor: '#7c3aed',
      secondaryColor: '#a78bfa',
    },
    status: 'inactive',
    createdAt: '2026-03-21T09:00:00.000Z',
  },
  {
    id: 'client-harbor',
    name: 'Harbor Health Network',
    branding: {
      logo: 'https://placehold.co/120x40/ea580c/ffffff?text=Harbor',
      primaryColor: '#ea580c',
      secondaryColor: '#fb923c',
    },
    status: 'active',
    createdAt: '2026-04-09T09:00:00.000Z',
  },
];

/**
 * Surveys spanning the full lifecycle (Draft / Published / Archived) across the
 * seeded clients so both Admin workflows have realistic context immediately.
 */
export const SEED_SURVEYS: Survey[] = [
  {
    id: 'survey-bayside-statin',
    clientId: 'client-bayside',
    name: 'Statin Adherence Check-in',
    status: 'published',
    baseLanguage: 'en',
    // Baseline cadence for the survey; groups inherit it unless they override.
    defaultSchedule: { every: 1, unit: 'weeks', firstSendOffsetDays: 0, scope: 'survey-default' },
    blockGroups: [
      {
        id: 'group-bs-default',
        name: 'Main check-in',
        order: 0,
        blocks: [
          {
            id: 'block-bs-ack',
            name: 'Acknowledgments',
            order: 0,
            // Consent is captured on the first check-in only.
            inclusion: 'initial',
            questions: [
              {
                id: 'q-bs-consent',
                type: 'single-select',
                label: 'Do you consent to this medication check-in?',
                required: true,
                choices: [
                  { id: 'c-bs-yes', label: 'Yes', scoreCode: 0 },
                  { id: 'c-bs-no', label: 'No', scoreCode: 1 },
                ],
              },
            ],
          },
          {
            id: 'block-bs-med',
            name: 'Medication adherence',
            order: 1,
            questions: [
              {
                id: 'q-bs-adherence',
                type: 'single-select',
                label: 'Did you take your statin as prescribed this week?',
                required: true,
                choices: [
                  { id: 'c-bs-every', label: 'Every day', scoreCode: 0 },
                  { id: 'c-bs-most', label: 'Most days', scoreCode: 1 },
                  { id: 'c-bs-some', label: 'Some days', scoreCode: 2 },
                  { id: 'c-bs-none', label: 'Not at all', scoreCode: 3 },
                ],
              },
            ],
          },
        ],
      },
    ],
    createdAt: '2026-01-15T10:00:00.000Z',
    updatedAt: '2026-01-20T14:30:00.000Z',
  },
  {
    id: 'survey-bayside-diabetes',
    clientId: 'client-bayside',
    name: 'Diabetes Monitoring (new)',
    status: 'draft',
    baseLanguage: 'en',
    defaultSchedule: { every: 1, unit: 'weeks', firstSendOffsetDays: 0, scope: 'survey-default' },
    blockGroups: [
      {
        id: 'group-bd-default',
        name: 'Main check-in',
        order: 0,
        blocks: [
          {
            id: 'block-bd-med',
            name: 'Medication adherence',
            order: 0,
            questions: [
              {
                id: 'q-bd-adherence',
                type: 'single-select',
                label: 'Did you take your insulin as prescribed this week?',
                required: true,
                choices: [
                  { id: 'c-bd-every', label: 'Every day', scoreCode: 0 },
                  { id: 'c-bd-most', label: 'Most days', scoreCode: 1 },
                  { id: 'c-bd-some', label: 'Some days', scoreCode: 2 },
                  { id: 'c-bd-none', label: 'Not at all', scoreCode: 3 },
                ],
              },
            ],
          },
        ],
      },
    ],
    createdAt: '2026-05-02T11:00:00.000Z',
    updatedAt: '2026-05-02T11:00:00.000Z',
  },
  {
    id: 'survey-rivervalley-bp',
    clientId: 'client-rivervalley',
    name: 'Blood Pressure Check-in',
    status: 'published',
    baseLanguage: 'en',
    // Survey default: weekly. The SDOH group below overrides this to monthly,
    // demonstrating the layered survey-default → block-group-override cadence.
    defaultSchedule: { every: 1, unit: 'weeks', firstSendOffsetDays: 0, scope: 'survey-default' },
    blockGroups: [
      {
        id: 'group-rv-med',
        name: 'Medication',
        order: 0,
        // No schedule → inherits the survey default (weekly).
        blocks: [
          {
            id: 'block-rv-med',
            name: 'Medication adherence',
            order: 0,
            questions: [
              {
                id: 'q-rv-adherence',
                type: 'single-select',
                label: 'Did you take your blood pressure medication this week?',
                required: true,
                choices: [
                  { id: 'c-rv-every', label: 'Every day', scoreCode: 0 },
                  { id: 'c-rv-most', label: 'Most days', scoreCode: 1 },
                  { id: 'c-rv-none', label: 'Not at all', scoreCode: 3 },
                ],
              },
            ],
          },
        ],
      },
      {
        id: 'group-rv-sdoh',
        name: 'Social determinants',
        order: 1,
        // Overrides the survey default: this group recurs monthly, not weekly.
        schedule: { every: 1, unit: 'months', firstSendOffsetDays: 0, scope: 'block-group-override' },
        blocks: [
          {
            id: 'block-rv-sdoh',
            name: 'Social determinants',
            order: 0,
            questions: [
              {
                id: 'q-rv-transport',
                type: 'single-select',
                label: 'Did you have reliable transportation this week?',
                required: false,
                choices: [
                  { id: 'c-rv-transp-yes', label: 'Yes', scoreCode: 0 },
                  { id: 'c-rv-transp-no', label: 'No', scoreCode: 2 },
                ],
                // SDOH follow-up: revealed only when adherence was "Not at all".
                displayCondition: {
                  questionId: 'q-rv-adherence',
                  choiceId: 'c-rv-none',
                },
              },
            ],
          },
        ],
      },
    ],
    createdAt: '2026-02-10T09:30:00.000Z',
    updatedAt: '2026-02-18T16:00:00.000Z',
  },
  {
    id: 'survey-summit-legacy',
    clientId: 'client-summit',
    name: 'Legacy Wellness Survey',
    status: 'archived',
    baseLanguage: 'en',
    defaultSchedule: { every: 1, unit: 'months', firstSendOffsetDays: 0, scope: 'survey-default' },
    blockGroups: [
      {
        id: 'group-sm-default',
        name: 'Main check-in',
        order: 0,
        blocks: [
          {
            id: 'block-sm-demo',
            name: 'Demographics',
            order: 0,
            // Demographics are collected on the first check-in only.
            inclusion: 'initial',
            questions: [
              {
                id: 'q-sm-dob',
                type: 'date',
                label: 'What is your date of birth?',
                required: true,
                choices: [],
              },
            ],
          },
        ],
      },
    ],
    createdAt: '2026-03-25T08:00:00.000Z',
    updatedAt: '2026-04-30T12:00:00.000Z',
  },
  {
    id: 'survey-harbor-intake',
    clientId: 'client-harbor',
    name: 'Medication Intake Draft',
    status: 'draft',
    baseLanguage: 'en',
    defaultSchedule: { every: 2, unit: 'weeks', firstSendOffsetDays: 0, scope: 'survey-default' },
    blockGroups: [],
    createdAt: '2026-04-12T13:00:00.000Z',
    updatedAt: '2026-04-12T13:00:00.000Z',
  },
];

/**
 * Medication presets mapping a medication type to its schedule preset — the
 * lowest cadence layer (see DOM00016). Each preset's scope is
 * `'medication-preset'`.
 */
export const SEED_MEDICATIONS: Medication[] = [
  {
    id: 'medication-glp1',
    name: 'GLP-1 agonist',
    type: 'GLP-1',
    schedulePreset: {
      every: 2,
      unit: 'weeks',
      firstSendOffsetDays: 0,
      scope: 'medication-preset',
    },
  },
  {
    id: 'medication-cardiovascular',
    name: 'Cardiovascular',
    type: 'cardiovascular',
    schedulePreset: {
      every: 1,
      unit: 'months',
      firstSendOffsetDays: 0,
      scope: 'medication-preset',
    },
  },
];

/** Deep-clones the seed dataset so callers never mutate the fixtures. */
export function createSeedData(): MockData {
  return structuredClone({
    clients: SEED_CLIENTS,
    surveys: SEED_SURVEYS,
    blockLibrary: SEED_BLOCK_LIBRARY,
    medications: SEED_MEDICATIONS,
  });
}
