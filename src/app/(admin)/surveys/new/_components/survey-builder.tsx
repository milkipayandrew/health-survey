'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import {
  QuestionEditor,
  makeEmptyQuestion,
  type GatewayOption,
} from '@/components/question-editor';
import { useActiveClient } from '@/hooks/active-client';
import { useMockData } from '@/hooks/use-mock-data';
import { addSurvey, updateSurvey } from '@/lib/mock/store';
import {
  DEFAULT_SURVEY_SCHEDULE,
  formatSchedule,
  resolveEffectiveCadence,
} from '@/lib/scheduling';
import {
  cn,
  makeId,
  primaryButtonClasses,
  secondaryButtonClasses,
} from '@/lib/utils';
import type {
  Block,
  BlockGroup,
  BlockInclusion,
  Client,
  LibraryBlock,
  NewSurveyInput,
  Question,
  Schedule,
  ScheduleUnit,
  Survey,
} from '@/types/domain';

/** Default canonical source language for a newly assembled survey. */
const DEFAULT_BASE_LANGUAGE = 'en';

/** The block-inclusion modes, with human labels for the inclusion picker. */
const INCLUSION_OPTIONS: { value: BlockInclusion; label: string }[] = [
  { value: 'always', label: 'Always (every run)' },
  { value: 'initial', label: 'Initial run only' },
  { value: 'recurring', label: 'Recurring runs only' },
];

/** The schedule interval units, with human labels for the unit picker. */
const UNIT_OPTIONS: { value: ScheduleUnit; label: string }[] = [
  { value: 'days', label: 'day(s)' },
  { value: 'weeks', label: 'week(s)' },
  { value: 'months', label: 'month(s)' },
];

/**
 * Materialises a {@link LibraryBlock} template into an assembled {@link Block},
 * minting fresh ids for the block, its questions, and their choices so the new
 * survey owns its content independently of the reusable library.
 *
 * @param template - The library block to copy.
 * @param order - The block's position within its group.
 * @returns A fully-identified Block ready to append to a group.
 */
function instantiateBlock(template: LibraryBlock, order: number): Block {
  const questions: Question[] = template.questions.map((question) => ({
    ...question,
    id: makeId('q'),
    choices: question.choices.map((choice) => ({
      ...choice,
      id: makeId('c'),
    })),
  }));
  return {
    id: makeId('block'),
    name: template.name,
    order,
    inclusion: 'always',
    questions,
  };
}

/** Re-sequences a block list so each `order` matches its array index. */
function resequenceBlocks(blocks: Block[]): Block[] {
  return blocks.map((block, index) => ({ ...block, order: index }));
}

/** Re-sequences a group list so each `order` matches its array index. */
function resequenceGroups(groups: BlockGroup[]): BlockGroup[] {
  return groups.map((group, index) => ({ ...group, order: index }));
}

/** A fresh, empty block group to seed the builder / add via the UI. */
function makeEmptyGroup(name: string, order: number): BlockGroup {
  return { id: makeId('group'), name, order, blocks: [] };
}

interface SurveyBuilderProps {
  /**
   * When set, the builder re-opens this existing Draft for editing instead of
   * assembling a new survey: its name/client/groups/schedule pre-populate the
   * form and a save patches the survey in place (keeping it a Draft).
   */
  editSurveyId?: string;
}

/**
 * Survey builder. An Admin assembles a Survey by grouping Blocks (with their
 * Questions) within Block Groups, sets the survey's default schedule and an
 * optional per-group schedule override, and on save persists a Draft survey to
 * the mock store. When {@link SurveyBuilderProps.editSurveyId} is provided it
 * instead edits that existing Draft in place.
 */
export function SurveyBuilder({ editSurveyId }: SurveyBuilderProps = {}) {
  const data = useMockData();
  const { activeClientId } = useActiveClient();

  if (data === null) {
    return <p className="text-sm text-zinc-500">Loading library…</p>;
  }

  const editing =
    editSurveyId === undefined
      ? undefined
      : data.surveys.find((survey) => survey.id === editSurveyId);

  if (editSurveyId !== undefined && editing === undefined) {
    return (
      <p className="text-sm text-zinc-500">
        Draft not found — it may have been published or deleted.
      </p>
    );
  }

  // A new survey defaults its owning client to the active client context (when
  // one is selected and still exists); editing keeps the survey's own client.
  const defaultClientId =
    activeClientId !== null &&
    data.clients.some((client) => client.id === activeClientId)
      ? activeClientId
      : '';

  // Key by the survey being edited (or `new`) so re-opening a different draft
  // remounts the form, re-running its state initializers with the new content.
  return (
    <BuilderForm
      key={editing?.id ?? 'new'}
      clients={data.clients}
      blockLibrary={data.blockLibrary}
      editing={editing}
      defaultClientId={defaultClientId}
    />
  );
}

interface BuilderFormProps {
  /** Clients selectable as the survey's owner. */
  clients: Client[];
  /** Reusable block templates the survey is assembled from. */
  blockLibrary: LibraryBlock[];
  /** The existing Draft being edited, or `undefined` when assembling new. */
  editing: Survey | undefined;
  /**
   * Owning client to pre-select for a *new* survey, from the active-client
   * context (`''` when no client is active). Ignored when editing.
   */
  defaultClientId: string;
}

/**
 * The stateful builder form. Receives resolved data so its state initializers
 * run against real content (the parent gates on the loading/not-found states).
 * Saves a new Draft via {@link addSurvey}, or patches the edited Draft in place
 * via {@link updateSurvey}, then returns to the survey list.
 */
function BuilderForm({
  clients,
  blockLibrary,
  editing,
  defaultClientId,
}: BuilderFormProps) {
  const router = useRouter();

  const [name, setName] = useState(() => editing?.name ?? '');
  const [clientId, setClientId] = useState(
    () => editing?.clientId ?? defaultClientId,
  );
  const [defaultSchedule, setDefaultSchedule] = useState<Schedule>(
    () => editing?.defaultSchedule ?? DEFAULT_SURVEY_SCHEDULE,
  );
  const [groups, setGroups] = useState<BlockGroup[]>(() =>
    editing?.blockGroups ?? [makeEmptyGroup('Main check-in', 0)],
  );

  // The survey snapshot used purely to resolve the read-only effective cadence
  // during render (no live store write). Derived in render — not effect-synced.
  const cadencePreviewSurvey: Survey = {
    id: editing?.id ?? 'preview',
    clientId,
    name,
    status: editing?.status ?? 'draft',
    baseLanguage: editing?.baseLanguage ?? DEFAULT_BASE_LANGUAGE,
    defaultSchedule,
    blockGroups: groups,
    createdAt: editing?.createdAt ?? '',
    updatedAt: editing?.updatedAt ?? '',
  };

  function mutateGroup(groupId: string, fn: (group: BlockGroup) => BlockGroup) {
    setGroups((current) =>
      current.map((group) => (group.id === groupId ? fn(group) : group)),
    );
  }

  function mutateBlocks(groupId: string, fn: (blocks: Block[]) => Block[]) {
    mutateGroup(groupId, (group) => ({ ...group, blocks: fn(group.blocks) }));
  }

  function addGroup() {
    setGroups((current) => [
      ...current,
      makeEmptyGroup(`Group ${current.length + 1}`, current.length),
    ]);
  }

  function removeGroup(groupId: string) {
    setGroups((current) =>
      resequenceGroups(current.filter((group) => group.id !== groupId)),
    );
  }

  function renameGroup(groupId: string, label: string) {
    mutateGroup(groupId, (group) => ({ ...group, name: label }));
  }

  function moveGroup(index: number, direction: -1 | 1) {
    setGroups((current) => {
      const target = index + direction;
      if (target < 0 || target >= current.length) {
        return current;
      }
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return resequenceGroups(next);
    });
  }

  /** Toggles a group's schedule override on/off (off → inherit survey default). */
  function toggleGroupOverride(groupId: string, enabled: boolean) {
    mutateGroup(groupId, (group) => {
      if (!enabled) {
        const next: BlockGroup = { ...group };
        delete next.schedule;
        return next;
      }
      // Seed the override from the survey default but re-scope it to the
      // block-group-override layer.
      return {
        ...group,
        schedule: { ...defaultSchedule, scope: 'block-group-override' },
      };
    });
  }

  function setGroupSchedule(groupId: string, schedule: Schedule) {
    mutateGroup(groupId, (group) => ({
      ...group,
      schedule: { ...schedule, scope: 'block-group-override' },
    }));
  }

  function addBlock(groupId: string, template: LibraryBlock) {
    mutateBlocks(groupId, (blocks) => [
      ...blocks,
      instantiateBlock(template, blocks.length),
    ]);
  }

  function addCustomBlock(groupId: string) {
    mutateBlocks(groupId, (blocks) => [
      ...blocks,
      {
        id: makeId('block'),
        name: 'New block',
        order: blocks.length,
        inclusion: 'always',
        questions: [makeEmptyQuestion()],
      },
    ]);
  }

  function removeBlock(groupId: string, blockId: string) {
    mutateBlocks(groupId, (blocks) =>
      resequenceBlocks(blocks.filter((block) => block.id !== blockId)),
    );
  }

  function moveBlock(groupId: string, index: number, direction: -1 | 1) {
    mutateBlocks(groupId, (blocks) => {
      const target = index + direction;
      if (target < 0 || target >= blocks.length) {
        return blocks;
      }
      const next = [...blocks];
      [next[index], next[target]] = [next[target], next[index]];
      return resequenceBlocks(next);
    });
  }

  function renameBlock(groupId: string, blockId: string, label: string) {
    mutateBlocks(groupId, (blocks) =>
      blocks.map((block) =>
        block.id === blockId ? { ...block, name: label } : block,
      ),
    );
  }

  function setBlockInclusion(
    groupId: string,
    blockId: string,
    inclusion: BlockInclusion,
  ) {
    mutateBlocks(groupId, (blocks) =>
      blocks.map((block) =>
        block.id === blockId ? { ...block, inclusion } : block,
      ),
    );
  }

  function addQuestion(groupId: string, blockId: string) {
    mutateBlocks(groupId, (blocks) =>
      blocks.map((block) =>
        block.id === blockId
          ? { ...block, questions: [...block.questions, makeEmptyQuestion()] }
          : block,
      ),
    );
  }

  function updateQuestion(groupId: string, blockId: string, next: Question) {
    mutateBlocks(groupId, (blocks) =>
      blocks.map((block) =>
        block.id === blockId
          ? {
              ...block,
              questions: block.questions.map((question) =>
                question.id === next.id ? next : question,
              ),
            }
          : block,
      ),
    );
  }

  function removeQuestion(groupId: string, blockId: string, questionId: string) {
    mutateBlocks(groupId, (blocks) =>
      blocks.map((block) =>
        block.id === blockId
          ? {
              ...block,
              questions: block.questions.filter(
                (question) => question.id !== questionId,
              ),
            }
          : block,
      ),
    );
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const input: NewSurveyInput = {
      clientId,
      name: name.trim(),
      baseLanguage: editing?.baseLanguage ?? DEFAULT_BASE_LANGUAGE,
      defaultSchedule,
      blockGroups: resequenceGroups(
        groups.map((group) => ({
          ...group,
          blocks: resequenceBlocks(group.blocks),
        })),
      ),
    };
    if (editing === undefined) {
      addSurvey(input);
      router.push('/surveys');
    } else {
      updateSurvey(editing.id, input);
      router.push(`/surveys/${editing.id}`);
    }
  }

  const totalBlocks = groups.reduce(
    (sum, group) => sum + group.blocks.length,
    0,
  );
  const canSave =
    name.trim().length > 0 && clientId !== '' && totalBlocks > 0;

  /**
   * Gateway candidates for a question: every single/multi-select question that
   * appears earlier in the survey (earlier groups/blocks, or earlier in the same
   * block). A question can only branch off an answer the respondent has already
   * reached, so later questions are never offered as gateways.
   */
  function gatewayOptionsFor(
    groupIndex: number,
    blockIndex: number,
    questionIndex: number,
  ): GatewayOption[] {
    const options: GatewayOption[] = [];
    groups.forEach((candidateGroup, gIndex) => {
      if (gIndex > groupIndex) {
        return;
      }
      candidateGroup.blocks.forEach((candidateBlock, bIndex) => {
        if (gIndex === groupIndex && bIndex > blockIndex) {
          return;
        }
        candidateBlock.questions.forEach((candidate, qIndex) => {
          const sameBlock = gIndex === groupIndex && bIndex === blockIndex;
          if (sameBlock && qIndex >= questionIndex) {
            return;
          }
          if (candidate.choices.length === 0) {
            return;
          }
          options.push({ question: candidate, blockName: candidateBlock.name });
        });
      });
    });
    return options;
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="survey-name" className="text-sm font-medium">
            Survey name
          </label>
          <input
            id="survey-name"
            name="name"
            type="text"
            required
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="e.g. Statin Adherence Check-in"
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="survey-client" className="text-sm font-medium">
            Client
          </label>
          <select
            id="survey-client"
            name="clientId"
            required
            value={clientId}
            onChange={(event) => setClientId(event.target.value)}
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none"
          >
            <option value="" disabled>
              Select a client…
            </option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <section
        className="flex flex-col gap-3 rounded-lg border border-zinc-200 bg-white p-4"
        aria-label="Default schedule"
      >
        <h2 className="text-sm font-semibold text-zinc-700">
          Survey default schedule
        </h2>
        <p className="text-xs text-zinc-500">
          The baseline send interval + first-send timing. Block groups inherit
          this unless they set their own override below.
        </p>
        <ScheduleEditor
          schedule={defaultSchedule}
          onChange={setDefaultSchedule}
          idPrefix="survey-default"
        />
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[18rem_1fr]">
        <section className="flex flex-col gap-3" aria-label="Block library">
          <h2 className="text-sm font-semibold text-zinc-700">Block library</h2>
          <p className="text-xs text-zinc-500">
            Use the “Add block” controls inside each group to add a library block
            (with its questions) to that group.
          </p>
          <ul className="flex flex-col gap-2">
            {blockLibrary.map((template) => (
              <li
                key={template.id}
                className="flex flex-col gap-0.5 rounded-md border border-zinc-200 bg-white p-3"
              >
                <span className="text-sm font-medium">{template.name}</span>
                <span className="text-xs text-zinc-500">
                  {template.description}
                </span>
                <span className="text-xs text-zinc-400">
                  {template.questions.length}{' '}
                  {template.questions.length === 1 ? 'question' : 'questions'}
                </span>
              </li>
            ))}
          </ul>
          <p className="text-xs text-zinc-400">
            Need a reusable block?{' '}
            <Link href="/library" className="underline hover:text-zinc-600">
              Manage the block library
            </Link>
            .
          </p>
        </section>

        <section className="flex flex-col gap-4" aria-label="Assembled survey">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-zinc-700">
              Survey structure
            </h2>
            <button
              type="button"
              onClick={addGroup}
              className={secondaryButtonClasses()}
            >
              + Add block group
            </button>
          </div>

          {groups.length === 0 ? (
            <p className="rounded-md border border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-500">
              No block groups yet. Add a block group to start assembling.
            </p>
          ) : (
            <ol className="flex flex-col gap-6">
              {groups.map((group, groupIndex) => {
                const cadence = resolveEffectiveCadence(
                  cadencePreviewSurvey,
                  group,
                );
                const hasOverride = group.schedule !== undefined;
                return (
                  <li
                    key={group.id}
                    className="flex flex-col gap-4 rounded-lg border border-zinc-300 bg-zinc-50 p-4"
                  >
                    <div className="flex items-start gap-2">
                      <div className="flex flex-1 flex-col gap-1.5">
                        <label
                          htmlFor={`group-name-${group.id}`}
                          className="text-xs font-medium text-zinc-500"
                        >
                          Block group {groupIndex + 1} name
                        </label>
                        <input
                          id={`group-name-${group.id}`}
                          type="text"
                          value={group.name}
                          onChange={(event) =>
                            renameGroup(group.id, event.target.value)
                          }
                          className="rounded-md border border-zinc-300 px-3 py-2 text-sm font-medium focus:border-zinc-900 focus:outline-none"
                        />
                      </div>
                      <div className="flex shrink-0 items-center gap-1 pt-6">
                        <button
                          type="button"
                          onClick={() => moveGroup(groupIndex, -1)}
                          disabled={groupIndex === 0}
                          aria-label={`Move group ${group.name} up`}
                          className={cn(
                            'rounded-md border border-zinc-300 px-2 py-1 text-sm transition-colors hover:bg-zinc-100',
                            groupIndex === 0 && 'cursor-not-allowed opacity-40',
                          )}
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          onClick={() => moveGroup(groupIndex, 1)}
                          disabled={groupIndex === groups.length - 1}
                          aria-label={`Move group ${group.name} down`}
                          className={cn(
                            'rounded-md border border-zinc-300 px-2 py-1 text-sm transition-colors hover:bg-zinc-100',
                            groupIndex === groups.length - 1 &&
                              'cursor-not-allowed opacity-40',
                          )}
                        >
                          ↓
                        </button>
                        <button
                          type="button"
                          onClick={() => removeGroup(group.id)}
                          aria-label={`Remove group ${group.name}`}
                          className="rounded-md border border-zinc-300 px-2 py-1 text-sm text-red-600 transition-colors hover:bg-red-50"
                        >
                          Remove
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 rounded-md border border-zinc-200 bg-white p-3">
                      <label className="flex items-center gap-2 text-xs font-medium text-zinc-600">
                        <input
                          type="checkbox"
                          checked={hasOverride}
                          onChange={(event) =>
                            toggleGroupOverride(group.id, event.target.checked)
                          }
                          className="size-4"
                        />
                        Override the survey default schedule for this group
                      </label>
                      {hasOverride && group.schedule !== undefined && (
                        <ScheduleEditor
                          schedule={group.schedule}
                          onChange={(next) => setGroupSchedule(group.id, next)}
                          idPrefix={`group-schedule-${group.id}`}
                        />
                      )}
                      <p className="text-xs text-zinc-500">
                        Effective cadence:{' '}
                        <span className="font-medium text-zinc-700">
                          {formatSchedule(cadence.schedule)}
                        </span>{' '}
                        <span className="text-zinc-400">
                          (
                          {cadence.source === 'survey-default'
                            ? 'from survey default'
                            : 'from group override'}
                          )
                        </span>
                      </p>
                      <p className="text-[11px] text-zinc-400">
                        Note: the medication-preset cadence layer is out of scope
                        here (resolved at patient enrollment, not in admin
                        authoring).
                      </p>
                    </div>

                    {group.blocks.length === 0 ? (
                      <p className="rounded-md border border-dashed border-zinc-300 bg-white p-4 text-center text-xs text-zinc-500">
                        No blocks in this group yet.
                      </p>
                    ) : (
                      <ol className="flex flex-col gap-4">
                        {group.blocks.map((block, blockIndex) => (
                          <li
                            key={block.id}
                            className="flex flex-col gap-3 rounded-lg border border-zinc-200 bg-white p-4"
                          >
                            <div className="flex items-start gap-2">
                              <div className="flex flex-1 flex-col gap-1.5">
                                <label
                                  htmlFor={`block-name-${block.id}`}
                                  className="text-xs text-zinc-500"
                                >
                                  Block {blockIndex + 1} label
                                </label>
                                <input
                                  id={`block-name-${block.id}`}
                                  type="text"
                                  value={block.name}
                                  onChange={(event) =>
                                    renameBlock(
                                      group.id,
                                      block.id,
                                      event.target.value,
                                    )
                                  }
                                  className="rounded-md border border-zinc-300 px-3 py-2 text-sm font-medium focus:border-zinc-900 focus:outline-none"
                                />
                              </div>
                              <div className="flex shrink-0 flex-col gap-1.5">
                                <label
                                  htmlFor={`block-inclusion-${block.id}`}
                                  className="text-xs text-zinc-500"
                                >
                                  Inclusion
                                </label>
                                <select
                                  id={`block-inclusion-${block.id}`}
                                  value={block.inclusion ?? 'always'}
                                  onChange={(event) =>
                                    setBlockInclusion(
                                      group.id,
                                      block.id,
                                      event.target.value as BlockInclusion,
                                    )
                                  }
                                  className="rounded-md border border-zinc-300 px-2 py-2 text-sm focus:border-zinc-900 focus:outline-none"
                                >
                                  {INCLUSION_OPTIONS.map((option) => (
                                    <option
                                      key={option.value}
                                      value={option.value}
                                    >
                                      {option.label}
                                    </option>
                                  ))}
                                </select>
                              </div>
                              <div className="flex shrink-0 items-center gap-1 pt-6">
                                <button
                                  type="button"
                                  onClick={() =>
                                    moveBlock(group.id, blockIndex, -1)
                                  }
                                  disabled={blockIndex === 0}
                                  aria-label={`Move ${block.name} up`}
                                  className={cn(
                                    'rounded-md border border-zinc-300 px-2 py-1 text-sm transition-colors hover:bg-zinc-100',
                                    blockIndex === 0 &&
                                      'cursor-not-allowed opacity-40',
                                  )}
                                >
                                  ↑
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    moveBlock(group.id, blockIndex, 1)
                                  }
                                  disabled={
                                    blockIndex === group.blocks.length - 1
                                  }
                                  aria-label={`Move ${block.name} down`}
                                  className={cn(
                                    'rounded-md border border-zinc-300 px-2 py-1 text-sm transition-colors hover:bg-zinc-100',
                                    blockIndex === group.blocks.length - 1 &&
                                      'cursor-not-allowed opacity-40',
                                  )}
                                >
                                  ↓
                                </button>
                                <button
                                  type="button"
                                  onClick={() => removeBlock(group.id, block.id)}
                                  aria-label={`Remove ${block.name}`}
                                  className="rounded-md border border-zinc-300 px-2 py-1 text-sm text-red-600 transition-colors hover:bg-red-50"
                                >
                                  Remove
                                </button>
                              </div>
                            </div>

                            <div className="flex flex-col gap-2 border-l border-zinc-100 pl-3">
                              {block.questions.length === 0 ? (
                                <p className="text-xs text-zinc-400">
                                  No questions in this block yet.
                                </p>
                              ) : (
                                block.questions.map(
                                  (question, questionIndex) => (
                                    <QuestionEditor
                                      key={question.id}
                                      question={question}
                                      index={questionIndex + 1}
                                      onChange={(next) =>
                                        updateQuestion(group.id, block.id, next)
                                      }
                                      onRemove={() =>
                                        removeQuestion(
                                          group.id,
                                          block.id,
                                          question.id,
                                        )
                                      }
                                      gatewayOptions={gatewayOptionsFor(
                                        groupIndex,
                                        blockIndex,
                                        questionIndex,
                                      )}
                                    />
                                  ),
                                )
                              )}
                              <button
                                type="button"
                                onClick={() => addQuestion(group.id, block.id)}
                                className="self-start rounded-md border border-zinc-300 px-3 py-1.5 text-sm transition-colors hover:bg-zinc-100"
                              >
                                + Add question
                              </button>
                            </div>
                          </li>
                        ))}
                      </ol>
                    )}

                    <div className="flex flex-wrap gap-2">
                      {blockLibrary.map((template) => (
                        <button
                          key={template.id}
                          type="button"
                          onClick={() => addBlock(group.id, template)}
                          className={secondaryButtonClasses()}
                        >
                          + {template.name}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => addCustomBlock(group.id)}
                        className={secondaryButtonClasses()}
                      >
                        + Custom block
                      </button>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </section>
      </div>

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={!canSave}
          className={primaryButtonClasses(
            !canSave ? 'cursor-not-allowed opacity-40' : undefined,
          )}
        >
          {editing === undefined ? 'Save as Draft' : 'Save changes'}
        </button>
        <button
          type="button"
          onClick={() => router.push('/surveys')}
          className={secondaryButtonClasses()}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

interface ScheduleEditorProps {
  /** The schedule being edited. */
  schedule: Schedule;
  /** Called with the next schedule on any field change. */
  onChange: (schedule: Schedule) => void;
  /** Unique id prefix so multiple editors on one page have distinct field ids. */
  idPrefix: string;
}

/**
 * Inline editor for a {@link Schedule}: interval count + unit and a first-send
 * day offset. Reused for both the survey default and per-group override so the
 * schedule-authoring UI lives in one place.
 */
function ScheduleEditor({ schedule, onChange, idPrefix }: ScheduleEditorProps) {
  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor={`${idPrefix}-every`}
          className="text-xs text-zinc-500"
        >
          Send every
        </label>
        <input
          id={`${idPrefix}-every`}
          type="number"
          min={1}
          value={schedule.every}
          onChange={(event) =>
            onChange({
              ...schedule,
              every: Math.max(1, Number(event.target.value) || 1),
            })
          }
          className="w-20 rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor={`${idPrefix}-unit`} className="text-xs text-zinc-500">
          Unit
        </label>
        <select
          id={`${idPrefix}-unit`}
          value={schedule.unit}
          onChange={(event) =>
            onChange({ ...schedule, unit: event.target.value as ScheduleUnit })
          }
          className="rounded-md border border-zinc-300 px-2 py-2 text-sm focus:border-zinc-900 focus:outline-none"
        >
          {UNIT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor={`${idPrefix}-first-send`}
          className="text-xs text-zinc-500"
        >
          First send (days after enrollment)
        </label>
        <input
          id={`${idPrefix}-first-send`}
          type="number"
          min={0}
          value={schedule.firstSendOffsetDays}
          onChange={(event) =>
            onChange({
              ...schedule,
              firstSendOffsetDays: Math.max(0, Number(event.target.value) || 0),
            })
          }
          className="w-24 rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none"
        />
      </div>
    </div>
  );
}
