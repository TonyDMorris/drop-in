import * as assert from 'node:assert/strict';
import * as path from 'node:path';
import {
  buildPlan,
  validateSources,
  type ConflictChoice,
  type ConflictQuestion,
  type PlanDeps
} from '../../src/plan';

// Paths are built with path.join so expectations hold on Windows, where the
// production code correctly produces backslashes. The platform passed to the
// code under test must match, or the separator-aware nesting checks compare
// Windows paths under POSIX rules.
const HOST = process.platform;
const TARGET = path.join(path.sep, 'project', 'assets');
const inTarget = (name: string) => path.join(TARGET, name);
const outside = (...parts: string[]) => path.join(path.sep, ...parts);

function deps(overrides: Partial<PlanDeps> = {}): PlanDeps {
  return {
    exists: () => false,
    ask: async () => ({ action: 'keepBoth', applyToAll: false }) as ConflictChoice,
    policy: 'prompt',
    platform: HOST,
    ...overrides
  };
}

/** Answers every conflict the same way and records what it was asked. */
function scriptedAsk(choice: ConflictChoice) {
  const asked: ConflictQuestion[] = [];
  return {
    asked,
    ask: async (question: ConflictQuestion) => {
      asked.push(question);
      return choice;
    }
  };
}

describe('validateSources', () => {
  it('accepts ordinary sources from elsewhere on disk', () => {
    const { accepted, rejected } = validateSources([outside('downloads', 'a.png')], TARGET, HOST);
    assert.deepEqual(accepted, [outside('downloads', 'a.png')]);
    assert.deepEqual(rejected, []);
  });

  it('refuses to copy a folder into itself', () => {
    const { accepted, rejected } = validateSources([TARGET], TARGET, HOST);
    assert.deepEqual(accepted, []);
    assert.equal(rejected[0]!.reason, 'a folder cannot be copied into itself');
  });

  it('refuses a folder that contains the target', () => {
    const { rejected } = validateSources([outside('project')], TARGET, HOST);
    assert.equal(rejected[0]!.reason, 'the target folder is inside this folder');
  });

  it('refuses an item already sitting in the target folder', () => {
    const { rejected } = validateSources([inTarget('logo.svg')], TARGET, HOST);
    assert.equal(rejected[0]!.reason, 'it is already in this folder');
  });

  it('is not fooled by a sibling folder sharing a name prefix', () => {
    const { accepted } = validateSources([outside('project', 'assets-old')], TARGET, HOST);
    assert.deepEqual(accepted, [outside('project', 'assets-old')]);
  });

  it('collapses exact duplicates in the source list', () => {
    const { accepted } = validateSources([outside('d', 'a.png'), outside('d', 'a.png')], TARGET, HOST);
    assert.deepEqual(accepted, [outside('d', 'a.png')]);
  });

  it('honours platform case rules when refusing a self-copy', () => {
    assert.equal(validateSources([outside('Project', 'Assets')], TARGET, 'darwin').rejected.length, 1);
    assert.equal(validateSources([outside('Project', 'Assets')], TARGET, 'linux').accepted.length, 1);
  });
});

describe('buildPlan', () => {
  it('maps sources onto destinations in the target folder', async () => {
    const plan = await buildPlan([outside('d', 'a.png'), outside('d', 'b.png')], TARGET, deps());
    assert.deepEqual(
      plan.items.map((item) => item.destination),
      [inTarget('a.png'), inTarget('b.png')]
    );
    assert.ok(plan.items.every((item) => !item.overwrite));
    assert.equal(plan.cancelled, false);
  });

  it('does not ask about names that are free', async () => {
    const { asked, ask } = scriptedAsk({ action: 'skip', applyToAll: false });
    await buildPlan([outside('d', 'a.png')], TARGET, deps({ ask }));
    assert.deepEqual(asked, []);
  });

  it('asks once per clash and reports how many are left', async () => {
    const { asked, ask } = scriptedAsk({ action: 'keepBoth', applyToAll: false });
    await buildPlan([outside('d', 'a.png'), outside('d', 'b.png')], TARGET, deps({ exists: () => true, ask }));
    assert.deepEqual(
      asked.map((question) => [question.name, question.remaining]),
      [
        ['a.png', 2],
        ['b.png', 1]
      ]
    );
  });

  it('stops asking once the answer applies to all', async () => {
    const { asked, ask } = scriptedAsk({ action: 'skip', applyToAll: true });
    const plan = await buildPlan([outside('d', 'a.png'), outside('d', 'b.png'), outside('d', 'c.png')], TARGET, deps({
      exists: () => true,
      ask
    }));
    assert.equal(asked.length, 1);
    assert.equal(plan.skipped.length, 3);
    assert.deepEqual(plan.items, []);
  });

  it('renames rather than clobbering when keeping both', async () => {
    const existing = new Set(['a.png']);
    const plan = await buildPlan([outside('d', 'a.png')], TARGET, deps({
      exists: (name) => existing.has(name),
      policy: 'keepBoth'
    }));
    assert.equal(plan.items[0]!.name, 'a 2.png');
    assert.equal(plan.items[0]!.destination, inTarget('a 2.png'));
    assert.equal(plan.items[0]!.overwrite, false);
  });

  it('marks the item for overwrite when replacing', async () => {
    const plan = await buildPlan([outside('d', 'a.png')], TARGET, deps({
      exists: () => true,
      policy: 'overwrite'
    }));
    assert.equal(plan.items[0]!.destination, inTarget('a.png'));
    assert.equal(plan.items[0]!.overwrite, true);
  });

  it('does not let two renamed files land on the same name', async () => {
    // Two different sources, same basename, target already holds one.
    const existing = new Set(['a.png']);
    const plan = await buildPlan([outside('one', 'a.png'), outside('two', 'a.png')], TARGET, deps({
      exists: (name) => existing.has(name),
      policy: 'keepBoth'
    }));
    assert.deepEqual(
      plan.items.map((item) => item.name),
      ['a 2.png', 'a 3.png']
    );
  });

  it('does not collide when a free name is claimed earlier in the same batch', async () => {
    const plan = await buildPlan([outside('one', 'a.png'), outside('two', 'a.png')], TARGET, deps({
      exists: () => false,
      policy: 'keepBoth'
    }));
    assert.deepEqual(
      plan.items.map((item) => item.name),
      ['a.png', 'a 2.png']
    );
  });

  it('abandons the whole plan when the user cancels', async () => {
    const { ask } = scriptedAsk({ action: 'cancel', applyToAll: false });
    const plan = await buildPlan([outside('d', 'a.png'), outside('d', 'b.png')], TARGET, deps({
      exists: () => true,
      ask
    }));
    assert.equal(plan.cancelled, true);
    assert.deepEqual(plan.items, []);
  });

  it('carries rejections through without letting them block the rest', async () => {
    const plan = await buildPlan([TARGET, outside('d', 'b.png')], TARGET, deps());
    assert.equal(plan.rejected.length, 1);
    assert.deepEqual(
      plan.items.map((item) => item.name),
      ['b.png']
    );
  });

  it('never asks when a non-prompt policy is configured', async () => {
    const { asked, ask } = scriptedAsk({ action: 'cancel', applyToAll: false });
    await buildPlan([outside('d', 'a.png')], TARGET, deps({ exists: () => true, policy: 'skip', ask }));
    assert.deepEqual(asked, []);
  });

  it('awaits an async exists check', async () => {
    const plan = await buildPlan([outside('d', 'a.png')], TARGET, deps({
      exists: async (name) => name === 'a.png',
      policy: 'keepBoth'
    }));
    assert.equal(plan.items[0]!.name, 'a 2.png');
  });
});
