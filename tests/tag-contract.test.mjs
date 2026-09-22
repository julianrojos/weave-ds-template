// Tag, and the machinery it was the first contract to exercise.
//
// Every case here corresponds to a defect that reached the repository and was found by reading
// the generated output rather than by any gate. They are written against the OUTPUT — the TSX and
// the CSS — because that is precisely what nothing else looks at: `pnpm verify` proved the
// contract legal and the tests green while the emitted button was empty, unnamed, unconditional,
// wrapped in invalid HTML, and styled by a selector that could never match.

import { describe, it, expect } from 'vitest';
import Ajv from 'ajv/dist/2020.js';
import ts from 'typescript';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { readJson, contractPaths, REPO_ROOT } from '../scripts/contract-lib.mjs';
import { emitTsx } from '../packages/react/src/emit/emit.mjs';
import { emitSfc } from '../packages/vue/src/emit/emit.mjs';
import { emitComponent as emitAngular } from '../packages/angular/src/emit/emit.mjs';
import { emitComponent as emitWc } from '../packages/wc/src/emit/emit.mjs';
import { emitTheme, stateSelector } from '../packages/emit-web/css.mjs';
import { surfaceFrom as reactSurface } from '../packages/react/src/emit/surface.mjs';
import { surfaceFrom as vueSurface } from '../packages/vue/src/emit/surface.mjs';
import { surfaceFrom as angularSurface } from '../packages/angular/src/emit/surface.mjs';
import { surfaceFrom as wcSurface } from '../packages/wc/src/emit/surface.mjs';
import { elementFor, loadProfile } from '../packages/platform-web/resolve.mjs';
import { numericDefaultProblems, partHasOwnText } from '../packages/emit-web/contract.mjs';
import { requestConformance } from '../scripts/relationship-conformance.mjs';

const schema = readJson(join(REPO_ROOT, 'packages/contracts/schema/component.schema.json'));
const validate = new Ajv({ strict: false }).compile(schema);
const activates = new Ajv({ strict: false }).compile(schema.$defs.part.properties.activates);

const tag = () => readJson(contractPaths('Tag').contract);
// The root element is resolved from the platform profile, exactly as `loadPair` does for the
// real emit path — a binding on disk does not carry it, and passing a literal here would let the
// test keep passing after the profile changed underneath it.
const binding = () => ({ ...readJson(contractPaths('Tag').binding), element: elementFor('Tag') });
const tsx = () => emitTsx('Tag', tag(), binding(), 'juro');
const WEB = loadProfile();

describe('activates.requests', () => {
  it('accepts the Tag contract', () => {
    expect(validate(tag())).toBe(true);
  });

  it('is exclusive with the toggling pair, which keeps working', () => {
    expect(activates({ toggles: 'checked' })).toBe(true);
    expect(activates({ toggles: 'checked', between: ['unchecked', 'checked'] })).toBe(true);
    expect(activates({ requests: 'remove' })).toBe(true);

    expect(activates({ requests: 'remove', toggles: 'checked' })).toBe(false);
    expect(activates({ requests: 'remove', between: ['a', 'b'] })).toBe(false);
    expect(activates({ between: ['a', 'b'] })).toBe(false);
    expect(activates({})).toBe(false);
  });

  it('compiles to one callback, and it is REQUIRED', () => {
    // A toggling callback notifies; a request callback IS the effect, so an absent one leaves a
    // focusable named button that provably does nothing. ADR 0007.
    expect(tsx()).toMatch(/onRemoveRequest: \(\) => void;/);
    expect(tsx()).not.toMatch(/onRemoveRequest\?: /);
  });

  it('calls it plainly, matching the required type', () => {
    expect(tsx()).toMatch(/onClick=\{\(\) => onRemoveRequest\(\)\}/);
    expect(tsx()).not.toMatch(/onRemoveRequest\?\.\(\)/);
  });

  it('gives the control a required accessible name, because it shows no text of its own', () => {
    expect(tsx()).toMatch(/removeLabel: string;/);
    expect(tsx()).toMatch(/aria-label=\{removeLabel\}/);
  });

  it('does not mistake decorative content for a name', () => {
    // The icon slot fills the part. An earlier rule read "has content" as "is named" and dropped
    // the label prop, which is how an icon-only button loses its accessible name.
    const withIcon = reactSurface(tag()).map((p) => p.name);
    expect(withIcon).toContain('removeLabel');

    const textNamed = tag();
    textNamed.composition.slots.removeIcon.accepts = ['text'];
    expect(reactSurface(textNamed).map((p) => p.name)).not.toContain('removeLabel');
  });
});

describe('removable', () => {
  it('keeps the measured default of true all the way into the signature', () => {
    expect(tag().states.removable.default).toBe(true);
    expect(tsx()).toMatch(/removable = true/);
  });

  it("types the default as the state's own type, in all four shapes", () => {
    // The first version of this case asserted that a boolean state accepting `default: "yes"` was
    // VALID, which pinned the defect rather than the rule: widening `default` to carry a boolean
    // had constrained only the `values` branch. A test that blesses a bug is worse than no test,
    // because it tells whoever fixes it that they broke something.
    const mutate = (fn) => {
      const c = tag();
      fn(c.states.removable);
      return validate(c);
    };

    expect(mutate((s) => (s.default = 'yes'))).toBe(false); // boolean state, string default
    expect(mutate((s) => ((s.valueType = 'number'), (s.default = true)))).toBe(false);
    expect(mutate((s) => ((s.valueType = 'number'), (s.default = 3)))).toBe(true);
    expect(mutate((s) => ((s.values = ['a', 'b']), (s.default = true)))).toBe(false);
    expect(mutate((s) => ((s.values = ['a', 'b']), (s.default = 'A b')))).toBe(false);
    expect(mutate((s) => ((s.values = ['a', 'b']), (s.default = 'a')))).toBe(true);
    // A free-text value's default is prose, so the kebab pattern must NOT reach it.
    expect(
      mutate((s) => {
        s.valueType = 'string';
        s.control = 'shared';
        s.editing = 'live';
        s.default = 'Hello World!';
      }),
    ).toBe(true);
  });

  it('preserves every declared default in all four backend surfaces', () => {
    for (const surface of [reactSurface, vueSurface, angularSurface, wcSurface]) {
      const probe = tag();
      probe.states = {
        prose: {
          kind: 'authored',
          control: 'shared',
          valueType: 'string',
          editing: 'live',
          default: "It's ready",
        },
        amount: {
          kind: 'authored',
          control: 'shared',
          valueType: 'number',
          min: 1,
          default: 3,
        },
        enabled: { kind: 'authored', control: 'consumer', default: true },
      };
      const entries = surface(probe);
      const byName = (name) => entries.find((entry) => entry.name === name);
      expect(byName(surface === reactSurface ? 'defaultProse' : 'prose')?.default).toBe(
        "It's ready",
      );
      expect(byName(surface === reactSurface ? 'defaultAmount' : 'amount')?.default).toBe(3);
      expect(byName('enabled')?.default).toBe(true);
    }
  });

  it('gates the control rather than rendering an inert one', () => {
    expect(tsx()).toMatch(/hidden=\{!\(removable\)\}/);
  });
});

describe('the emitted markup is valid HTML', () => {
  it('uses phrasing containers inside a phrasing root', () => {
    // `<span><div/></span>` is not rejected by the parser, it is RESTRUCTURED — the div is hoisted
    // out — so the emitted tree and the rendered tree stop matching with no error anywhere.
    const out = tsx();
    expect(out).toMatch(/<span[^>]*data-juro-part="root"/s);
    expect(out).toMatch(/<span data-juro-part="label">/);
    expect(out).not.toMatch(/<div/);
  });

  it('renders the glyph inside the control, and demands one', () => {
    // A visible, focusable, named button with nothing drawn in it is an affordance nobody can see.
    // The slot was optional until the only justification offered — that a theme could paint it via
    // `background-image` or `mask` — turned out to name channels `dismiss` does not declare.
    expect(tsx()).toMatch(/data-juro-part="dismiss"[^>]*>\s*\{removeIcon\}/s);
    expect(tsx()).toMatch(/removeIcon: ReactNode;/);
    expect(tsx()).not.toMatch(/removeIcon\?: /);
  });

  it('puts a phrasing container inside a NESTED activatable, not just inside the root', () => {
    // `renderPart` is recursive and the HTML content model belongs to the immediate parent. Passing
    // the root element at every depth fixed `span > div` and left `button > div` one level down, in
    // AccordionItem — the very component used to validate the fix above it.
    const item = readJson(contractPaths('AccordionItem').contract);
    const out = emitTsx(
      'AccordionItem',
      item,
      {
        ...readJson(contractPaths('AccordionItem').binding),
        element: elementFor('AccordionItem'),
      },
      'juro',
    );
    expect(out).toMatch(/<span data-juro-part="indicator"/);
    expect(out).not.toMatch(/<div data-juro-part="indicator"/);
  });
});

describe('where a part-level pseudo-class lands', () => {
  const theme = () => emitTheme('Tag', tag(), 'juro', WEB);

  it('puts it on the part when the PART is the interactive one', () => {
    expect(theme()).toMatch(
      /\[data-juro-component='Tag'\] \[data-juro-part='dismiss'\]:focus-visible/,
    );
    expect(theme()).not.toMatch(/\[data-juro-component='Tag'\]:focus-visible \[data-juro-part=/);
  });

  it('puts it on the root when the ROOT is the interactive one', () => {
    // Slider's thumb and RadioItem's control take the root's focus; AccordionItem's trigger carries
    // its own. The rule is derived from which element declares `role` or `activates`, and it
    // reproduces every hand-filled theme in the repository.
    const base = "[data-juro-component='X'] [data-juro-part='p']";
    expect(stateSelector(base, 'focus-visible', 'juro', WEB, true)).toBe(
      "[data-juro-component='X'] [data-juro-part='p']:focus-visible",
    );
    expect(stateSelector(base, 'focus-visible', 'juro', WEB, false)).toBe(
      "[data-juro-component='X']:focus-visible [data-juro-part='p']",
    );
  });

  it('never moves an attribute marker, which is written on the root', () => {
    const base = "[data-juro-component='X'] [data-juro-part='p']";
    for (const owns of [true, false]) {
      expect(stateSelector(base, 'selected', 'juro', WEB, owns)).toMatch(
        /^\[data-juro-component='X'\](\[|\s)/,
      );
    }
  });
});

describe('the surface stays emittable', () => {
  it('refuses two parts asking for the same action', () => {
    // One callback cannot say which control the user pressed, and the emitted identifiers would
    // collide. `verify:contract` rejects it; this pins the shape that made it collide.
    const twin = tag();
    twin.anatomy.root.parts.clear = JSON.parse(JSON.stringify(twin.anatomy.root.parts.dismiss));
    twin.anatomy.root.parts.clear.part = 'clear';
    expect(() => reactSurface(twin)).toThrow(/surface derives/);
  });

  it('refuses request names that collide with another public contract fact', () => {
    const stateCollision = tag();
    stateCollision.states['remove-label'] = { kind: 'authored', control: 'consumer' };
    expect(() => reactSurface(stateCollision)).toThrow(/removeLabel/);

    const slotCollision = tag();
    slotCollision.composition.slots.onRemoveRequest = { accepts: ['node'] };
    expect(() => reactSurface(slotCollision)).toThrow(/onRemoveRequest/);
  });

  it('exposes no prop for an internal state', () => {
    expect(reactSurface(tag()).map((p) => p.name)).not.toContain('hover');
  });

  it('carries both axes with their defaults', () => {
    const out = tsx();
    expect(out).toMatch(/variant = 'neutral'/);
    expect(out).toMatch(/treatment = 'solid'/);
    expect(out).toMatch(/data-juro-treatment=\{treatment\}/);
  });
});

describe('requests compile in every backend', () => {
  const backendBinding = () => ({ element: elementFor('Tag') });

  it('emits each backend-native request and the required accessible label', () => {
    const contract = tag();
    const vue = emitSfc('Tag', contract, backendBinding(), 'juro');
    const angular = emitAngular('Tag', contract, backendBinding(), 'juro');
    const wc = emitWc('Tag', contract, backendBinding(), 'juro');

    expect(vue).toMatch(/'remove-request': \[\]/);
    expect(vue).toMatch(/removable: true/);
    expect(vue).toMatch(/@click="removeRequest"/);
    expect(vue).toMatch(/:aria-label="removeLabel"/);
    expect(angular).toMatch(/readonly removeRequest = output<void>\(\)/);
    expect(angular).toMatch(/\(click\)="removeRequest\.emit\(\)"/);
    expect(angular).toMatch(/input\.required<string>\(\)/);
    expect(wc).toContain("new CustomEvent('juro-remove-request'");
    expect(wc).toContain("getAttribute('remove-label')");
    expect(wc).not.toContain('throw new Error');
    expect(wc).toContain("if (!removeLabelValue?.trim()) this.#part('dismiss')");
    expect(wc).toContain('this.removable && Boolean(this.removeLabel.trim())');
    expect(wc).toMatch(
      /if \(!\(this\.removable && Boolean\(this\.removeLabel\.trim\(\)\)\)\) return; this\.dispatchEvent/,
    );
    expect(wc).toMatch(
      /toggleAttribute\('hidden', !\(this\.removable && Boolean\(this\.removeLabel\.trim\(\)\)\)\)/,
    );
    expect(wc.indexOf("setAttribute('variant', 'neutral')")).toBeLessThan(
      wc.indexOf("toggleAttribute('hidden'"),
    );
    expect(wc).not.toContain('const root = this.#root');
    expect(wc).toContain("return this.getAttribute('removable') !== 'false'");
  });

  it('reports the request-listener limitation wherever the backend cannot express it', () => {
    expect(requestConformance(tag(), 'react').status).toBe('implemented');
    for (const backend of ['vue', 'angular', 'wc']) {
      const result = requestConformance(tag(), backend);
      expect(result).toMatchObject({
        status: 'non-conforming',
        scope: 'required request listener',
      });
      if (backend === 'wc') expect(result.detail).toContain('suppresses its event');
    }
  });

  it('emits a Tag custom element that passes TypeScript with unused locals forbidden', () => {
    const directory = mkdtempSync(join(tmpdir(), 'juro-tag-wc-'));
    try {
      const source = join(directory, 'Tag.ts');
      const declarations = join(directory, 'styles.d.ts');
      writeFileSync(source, emitWc('Tag', tag(), backendBinding(), 'juro'));
      writeFileSync(
        declarations,
        "declare module '*.css?inline' { const css: string; export default css; }\n",
      );
      const program = ts.createProgram({
        rootNames: [source, declarations],
        options: {
          module: ts.ModuleKind.ESNext,
          moduleResolution: ts.ModuleResolutionKind.Bundler,
          noEmit: true,
          noUnusedLocals: true,
          noUnusedParameters: true,
          skipLibCheck: true,
          strict: true,
          target: ts.ScriptTarget.ES2022,
        },
      });
      const diagnostics = ts
        .getPreEmitDiagnostics(program)
        .map((diagnostic) => ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'));
      expect(diagnostics).toEqual([]);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});

describe('what a request obliges the contract to state, and who checks it', () => {
  // ADR 0007 decision 6. These are the conditions that made the primitive acceptable: a request
  // part is a real control, so it is named and it is reachable. A contract that took `requests`
  // and skipped them kept the affordance and dropped the argument for allowing it — and for a
  // while both obligations were prose in the ADR and nothing else.
  it('rejects a requesting part that declares no role', () => {
    const c = tag();
    delete c.anatomy.root.parts.dismiss.role;
    expect(validate(c)).toBe(false);

    // A TOGGLING part is unaffected: it may be the root's own element, which carries the role.
    const toggling = tag();
    toggling.anatomy.root.parts.dismiss.activates = { toggles: 'removable' };
    delete toggling.anatomy.root.parts.dismiss.role;
    expect(validate(toggling)).toBe(true);
  });

  it('names the control only when its content is GUARANTEED to name it', () => {
    // The question is not "can this part hold text?" but "will it?". An optional text slot used
    // to drop the label prop from all four backends, so a consumer who left it empty shipped a
    // focusable button with no accessible name and nothing to fall back on.
    const optional = tag();
    optional.composition.slots.removeIcon.accepts = ['text'];
    optional.composition.slots.removeIcon.required = false;
    expect(partHasOwnText(optional, 'dismiss')).toBe(false);
    expect(reactSurface(optional).map((p) => p.name)).toContain('removeLabel');

    const required = tag();
    required.composition.slots.removeIcon.accepts = ['text'];
    required.composition.slots.removeIcon.required = true;
    expect(partHasOwnText(required, 'dismiss')).toBe(true);
    expect(reactSurface(required).map((p) => p.name)).not.toContain('removeLabel');

    // `composition.children` carries the same two cases.
    const loose = tag();
    loose.composition.children = { part: 'dismiss', accepts: ['text'], required: false };
    expect(partHasOwnText(loose, 'dismiss')).toBe(false);
    loose.composition.children.required = true;
    expect(partHasOwnText(loose, 'dismiss')).toBe(true);
  });
});

describe('a numeric default is a value the state can hold', () => {
  // The schema types `default` against the state's shape and stops there — it cannot compare one
  // field to another, so `min: 0, max: 100, default: 200` is legal there and always will be.
  // `verify:contract` owns the comparison; these pin what it must reject.
  const slider = () => readJson(contractPaths('Slider').contract);

  it('is legal to the schema, which is why a gate has to own it', () => {
    const c = slider();
    c.states.value.default = 200;
    expect(validate(c)).toBe(true);
  });

  it('is caught by verify:contract, in all three ways it can be wrong', () => {
    const run = (value) => {
      const c = slider();
      c.states.value.default = value;
      return numericDefaultProblems(c);
    };
    expect(run(200)[0]).toMatch(/above its max of 100/);
    expect(run(-50)[0]).toMatch(/below its min of 0/);
    expect(run(0.5)[0]).toMatch(/not on a step of 1 from 0/);
    expect(run(50)).toEqual([]);
    // An absent default is not a violation; it is the ordinary case.
    const none = slider();
    delete none.states.value.default;
    expect(numericDefaultProblems(none)).toEqual([]);
  });
});
