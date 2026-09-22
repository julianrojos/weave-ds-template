// The public prop surface a contract implies, derived with no source at all.
//
// Extracted from emit.mjs so the contract TOOLING can reuse it. `pnpm contract <Name>` used to
// answer "what IS this component" by merging the contract, the binding and the implementation read
// from hand-written source — and there is no hand-written source any more. This is what replaces
// that third half: not what the code happens to do, but what the contract SAYS the surface is.
//
// Framework-specific on purpose, and it stays in packages/react: `defaultOpen`, `onOpenChange` and
// the controlled/uncontrolled trio are React's spelling of a `shared` state. ADR 0004 is the
// decision, and each framework's own rules live beside its emitter.
//
// Pure: no fs, no profile, no module state.

import {
  camel,
  partHasOwnText,
  pascal,
  requestingParts,
  stateTypeAndDefault,
  uniqueSurface,
} from '@juro/emit-web';

// Exported because emit.mjs needs the same two, and one home beats two copies that can drift.
export { camel, pascal };

// ---------------------------------------------------------------------------------------
// states -> the public prop surface, per ADR 0004's controlRules
// slots  -> content props
// ---------------------------------------------------------------------------------------
export function surfaceFrom(contract) {
  const props = [];

  for (const [state, def] of Object.entries(contract.states ?? {})) {
    const n = camel(state);
    // A state with `values` is an enumeration, not a boolean. Everything downstream — the prop
    // type, the default, the comparison in a `visibleWhen` — follows from this one fact.
    // Three shapes: enumerated, free (string/number), or — saying nothing — boolean.
    const { type: t, default: dflt } = stateTypeAndDefault(def);
    // `declared` keeps an explicit default apart from the fallback every state shape carries, so
    // only a contract that actually said something changes a consumer-only prop's destructuring.
    const declared = def.default !== undefined;
    if (def.control === 'shared') {
      props.push(
        { name: n, type: t, from: state, origin: 'state', role: 'controlled' },
        {
          name: `default${pascal(state)}`,
          type: t,
          from: state,
          origin: 'state',
          role: 'uncontrolled',
          default: dflt,
        },
        {
          name: `on${pascal(state)}Change`,
          type: `(${n}: ${t}) => void`,
          from: state,
          origin: 'state',
          role: 'callback',
        },
      );
    } else if (def.control === 'consumer') {
      props.push({
        name: n,
        type: t,
        from: state,
        origin: 'state',
        role: 'input',
        default: dflt,
        declaredDefault: declared,
      });
    }
    // `internal` emits nothing. That is the whole point of the value.
  }

  // An axis is a closed set of values the consumer chooses from. It is not a state — nothing is
  // IN it — so ADR 0004's controlRules do not cover it, and this mapping is recorded nowhere.
  for (const [axis, def] of Object.entries(contract.axes ?? {})) {
    props.push({
      name: axis,
      type: def.values.map((v) => `'${v}'`).join(' | '),
      from: axis,
      origin: 'axis',
      role: 'axis',
      default: def.default,
      description: def.description,
    });
  }

  // A collection's selection compiles exactly like a `shared` state, except its value is a set
  // of member identities rather than a boolean. Same three props, different type.
  const sel = contract.collection?.selection;
  if (sel && sel.control === 'shared') {
    const many = sel.cardinality === 'many';
    const t = many ? 'string[]' : 'string';
    props.push(
      // `from: 'selection'` is a SENTINEL, not a state name — see `origin`. A reader that looked
      // the string up in `contract.states` would find nothing today and the wrong thing the day a
      // contract declares a state actually called `selection`.
      { name: 'value', type: t, from: 'selection', origin: 'selection', role: 'controlled' },
      {
        name: 'defaultValue',
        type: t,
        from: 'selection',
        origin: 'selection',
        role: 'uncontrolled',
      },
      {
        name: 'onValueChange',
        type: `(value: ${t}) => void`,
        from: 'selection',
        origin: 'selection',
        role: 'callback',
      },
    );
  }

  // A member's identity is a required prop. It is not a state — nothing is IN it — so ADR 0004's
  // controlRules do not cover it, and this mapping is recorded nowhere.
  if (contract.member) {
    props.push({
      name: contract.member.identity,
      type: 'string',
      from: 'member',
      origin: 'member',
      role: 'identity',
      required: true,
      description: `Distinguishes this ${contract.component} from its siblings. The ancestor ${contract.member.of} compares against it to decide whether this one is in the selection.`,
    });
  }

  // A named slot becomes a content prop. ADR 0004 covers states only; this is the obvious
  // analogue and is NOT recorded anywhere, which is itself worth reporting.
  for (const [slot, def] of Object.entries(contract.composition?.slots ?? {})) {
    props.push({
      name: camel(slot),
      // An `image` slot takes a source the platform loads, not something the consumer renders.
      type: def.accepts?.includes('image') ? 'string' : 'ReactNode',
      from: slot,
      origin: 'slot',
      role: 'slot',
      accepts: def.accepts ?? [],
      part: def.part,
      required: def.required === true,
      description: def.description,
    });
  }

  // A part that declares `activates.requests` asks its CONSUMER to perform something the component
  // cannot perform itself — ADR 0007. One callback per request, by rule, so a contract that uses it
  // adds no mapping work here.
  //
  // The `Request` suffix is load-bearing, not decoration. `onRemove` reads as "it was removed",
  // which is exactly the fact the component can never know: it asked, and whoever owns the list
  // decided. It also keeps the name clear of a future `remove` state, whose callback under ADR
  // 0004 would be `onRemoveChange`.
  for (const { key, action } of requestingParts(contract)) {
    // REQUIRED, unlike a state's `on…Change`, and the difference is the primitive rather than
    // taste. A toggling callback NOTIFIES: Dialog owns `open`, so without `onOpenChange` the
    // dialog still opens and closes and only the outside is left uninformed. A request owns
    // nothing by design (ADR 0007), so without its callback the control is not under-reported —
    // it is inert. A focusable, named button that provably does nothing is worth a type error.
    props.push({
      name: `on${pascal(action)}Request`,
      type: '() => void',
      from: key,
      origin: 'request',
      role: 'request',
      action,
      required: true,
      description: `Asks the consumer to ${action} this ${contract.component}. The component does not ${action} itself and cannot observe whether it happened.`,
    });

    // A control with nothing rendered into it has no accessible name, and an unnamed button is a
    // defect however well the contract documents the intent. Where the part is contentless, the
    // name becomes a REQUIRED prop, so the type checker asks for it instead of a note hoping
    // somebody reads it. It reaches the DOM as the platform's literal-name attribute.
    //
    // A request part that DOES render content — a "Retry" button with its own text — gets no such
    // prop: naming it again would override the text it already shows.
    if (!partHasOwnText(contract, key)) {
      props.push({
        name: `${camel(action)}Label`,
        type: 'string',
        from: key,
        origin: 'request',
        role: 'requestLabel',
        action,
        required: true,
        description: `The accessible name of the control that asks to ${action} this ${contract.component}. Required because that control shows no text of its own, and the ${contract.component}'s own label does not name it: ten of them would give ten identical controls.`,
      });
    }
  }

  return uniqueSurface(props, 'React');
}
