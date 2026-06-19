'use client';

import { useState } from 'react';

import {
  QuestionEditor,
  makeEmptyQuestion,
} from '@/components/question-editor';
import { useMockData } from '@/hooks/use-mock-data';
import {
  addLibraryBlock,
  removeLibraryBlock,
  updateLibraryBlock,
} from '@/lib/mock/store';
import {
  makeId,
  primaryButtonClasses,
  secondaryButtonClasses,
} from '@/lib/utils';
import type {
  LibraryBlock,
  LibraryQuestion,
  NewLibraryBlockInput,
  Question,
} from '@/types/domain';

/** Which block the manager is currently editing, or `null` when just listing. */
type Editing = { mode: 'new' } | { mode: 'edit'; block: LibraryBlock } | null;

/**
 * Lifts a stored {@link LibraryQuestion} (id-less template) into an editable
 * {@link Question} by minting a fresh question id, so the shared
 * {@link QuestionEditor} — which keys off question ids — can drive it.
 */
function toEditableQuestion(question: LibraryQuestion): Question {
  return { ...question, id: makeId('q') };
}

/**
 * Lowers an editable {@link Question} back to a {@link LibraryQuestion} template
 * by dropping its id and trimming text, ready to persist into the library.
 */
function toLibraryQuestion(question: Question): LibraryQuestion {
  return {
    type: question.type,
    label: question.label.trim(),
    required: question.required,
    choices: question.choices.map((choice) => ({
      ...choice,
      label: choice.label.trim(),
    })),
  };
}

/**
 * Block library manager. Lists the reusable library blocks with a question
 * count, and opens an inline form to add a new block or edit an existing one.
 * The form reuses the same {@link QuestionEditor} as the survey builder, so
 * question authoring (type, required, choices, score codes) is identical.
 */
export function LibraryManager() {
  const data = useMockData();
  const [editing, setEditing] = useState<Editing>(null);

  if (data === null) {
    return <p className="text-sm text-zinc-500">Loading library…</p>;
  }

  function handleDelete(block: LibraryBlock) {
    removeLibraryBlock(block.id);
    setEditing((current) =>
      current?.mode === 'edit' && current.block.id === block.id
        ? null
        : current,
    );
  }

  if (editing !== null) {
    const block = editing.mode === 'edit' ? editing.block : undefined;
    return (
      <LibraryBlockForm
        // Remount when switching which block is edited so initializers re-run.
        key={block?.id ?? 'new'}
        initial={block}
        onSave={(input) => {
          if (block === undefined) {
            addLibraryBlock(input);
          } else {
            updateLibraryBlock(block.id, input);
          }
          setEditing(null);
        }}
        onCancel={() => setEditing(null)}
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setEditing({ mode: 'new' })}
          className={primaryButtonClasses()}
        >
          + Add block
        </button>
      </div>

      {data.blockLibrary.length === 0 ? (
        <p className="rounded-md border border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-500">
          The library is empty. Add a block to make it available in the builder.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {data.blockLibrary.map((block) => (
            <li
              key={block.id}
              className="flex items-start justify-between gap-4 rounded-lg border border-zinc-200 bg-white p-4"
            >
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-medium text-zinc-900">
                  {block.name}
                </span>
                <span className="text-xs text-zinc-500">
                  {block.description}
                </span>
                <span className="text-xs text-zinc-400">
                  {block.questions.length}{' '}
                  {block.questions.length === 1 ? 'question' : 'questions'}
                </span>
              </div>
              <div className="flex shrink-0 gap-2">
                <button
                  type="button"
                  onClick={() => setEditing({ mode: 'edit', block })}
                  className={secondaryButtonClasses()}
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(block)}
                  aria-label={`Delete ${block.name}`}
                  className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

interface LibraryBlockFormProps {
  /** The block being edited, or `undefined` when adding a new one. */
  initial: LibraryBlock | undefined;
  /** Persists the assembled library-block input (add or update). */
  onSave: (input: NewLibraryBlockInput) => void;
  /** Abandons the edit and returns to the list. */
  onCancel: () => void;
}

/**
 * Add/edit form for one library Block: its name, description, and template
 * questions. Questions are held with minted ids for editing and stripped back
 * to id-less templates on save.
 */
function LibraryBlockForm({ initial, onSave, onCancel }: LibraryBlockFormProps) {
  const [name, setName] = useState(() => initial?.name ?? '');
  const [description, setDescription] = useState(
    () => initial?.description ?? '',
  );
  const [questions, setQuestions] = useState<Question[]>(() =>
    initial === undefined
      ? [makeEmptyQuestion()]
      : initial.questions.map(toEditableQuestion),
  );

  function addQuestion() {
    setQuestions((current) => [...current, makeEmptyQuestion()]);
  }

  function updateQuestion(next: Question) {
    setQuestions((current) =>
      current.map((question) => (question.id === next.id ? next : question)),
    );
  }

  function removeQuestion(questionId: string) {
    setQuestions((current) =>
      current.filter((question) => question.id !== questionId),
    );
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSave({
      name: name.trim(),
      description: description.trim(),
      questions: questions.map(toLibraryQuestion),
    });
  }

  const canSave = name.trim().length > 0 && questions.length > 0;

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <h2 className="text-sm font-semibold text-zinc-700">
        {initial === undefined ? 'Add block' : `Edit “${initial.name}”`}
      </h2>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="library-block-name" className="text-sm font-medium">
            Block name
          </label>
          <input
            id="library-block-name"
            type="text"
            required
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="e.g. Medication adherence"
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="library-block-description"
            className="text-sm font-medium"
          >
            Description
          </label>
          <input
            id="library-block-description"
            type="text"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="What this block covers"
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none"
          />
        </div>
      </div>

      <section className="flex flex-col gap-3" aria-label="Block questions">
        <h3 className="text-sm font-semibold text-zinc-700">Questions</h3>
        {questions.length === 0 ? (
          <p className="rounded-md border border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-500">
            No questions yet. Add at least one question to the block.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {questions.map((question, index) => (
              <QuestionEditor
                key={question.id}
                question={question}
                index={index + 1}
                onChange={updateQuestion}
                onRemove={() => removeQuestion(question.id)}
              />
            ))}
          </div>
        )}
        <button
          type="button"
          onClick={addQuestion}
          className="self-start rounded-md border border-zinc-300 px-3 py-1.5 text-sm transition-colors hover:bg-zinc-100"
        >
          + Add question
        </button>
      </section>

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={!canSave}
          className={primaryButtonClasses(
            !canSave ? 'cursor-not-allowed opacity-40' : undefined,
          )}
        >
          {initial === undefined ? 'Add to library' : 'Save changes'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className={secondaryButtonClasses()}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
