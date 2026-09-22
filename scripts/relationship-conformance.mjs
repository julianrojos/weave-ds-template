import { partHasOwnText, requestingParts } from '../packages/emit-web/contract.mjs';

/** Known structural gaps only. An empty list is not an accessibility certification. */
export function relationshipConformance(contract, backend) {
  const gaps = [];
  const slots = contract.composition?.slots ?? {};
  function visit(node, path) {
    for (const relation of ['controls', 'namedBy', 'describedBy']) {
      const values =
        node[relation] === undefined
          ? []
          : Array.isArray(node[relation])
            ? node[relation]
            : [node[relation]];
      for (const target of values) {
        const slot = Object.entries(slots).find(
          ([key, value]) => (value.part ?? key) === path.split('.').at(-1),
        );
        const passedControl = slot?.[1].accepts?.some((kind) =>
          ['input', 'select', 'textarea', 'Switch'].includes(kind),
        );
        if (passedControl)
          gaps.push({
            path: `${path}.${relation}`,
            target,
            reason: 'wrapper-not-control',
            detail:
              'The relationship is emitted on the containing region, not the supplied control.',
          });
        else if (backend === 'wc' && typeof target === 'object')
          gaps.push({
            path: `${path}.${relation}`,
            target,
            reason: 'omitted-cross-shadow-reference',
            detail:
              'The target semantic part is inside a sibling shadow root; the emitter omits this relationship.',
          });
      }
    }
    for (const [key, child] of Object.entries(node.parts ?? {})) visit(child, `${path}.${key}`);
  }
  visit(contract.anatomy.root, 'root');
  return {
    status: gaps.length ? 'non-conforming' : 'not-evaluated',
    scope: 'anatomy relationships',
    gaps,
  };
}

/** Whether the backend can make a request listener mandatory, as ADR 0007 requires. */
export function requestConformance(contract, backend) {
  const requests = requestingParts(contract);
  if (!requests.length) return { status: 'not-applicable' };
  if (backend === 'react')
    return {
      status: 'implemented',
      scope: 'required request callback',
    };
  const requiresExternalLabel = requests.some(({ key }) => !partHasOwnText(contract, key));
  const labelGap =
    backend === 'wc' && requiresExternalLabel
      ? ' It also cannot statically require the non-empty label attribute; the generated fallback hides the request control and suppresses its event until one is present.'
      : '';
  return {
    status: 'non-conforming',
    scope: 'required request listener',
    detail:
      `${backend} emits ${requests.map(({ action }) => action).join(', ')} as an event, ` +
      'but its public API cannot require a consumer to listen for it.' +
      labelGap,
  };
}

export function formConformance(contract, backend) {
  if (!contract.form) return { status: 'not-applicable' };
  if (backend === 'wc')
    return {
      status: 'implemented',
      scope: 'named answer, required/custom validation, reset and restore lifecycle',
    };
  return {
    status: 'non-conforming',
    detail:
      contract.component === 'TextField'
        ? 'The native input submits, but the full declared reset/validation lifecycle is not implemented by this backend.'
        : 'This backend does not emit a form contribution for this custom control.',
  };
}
