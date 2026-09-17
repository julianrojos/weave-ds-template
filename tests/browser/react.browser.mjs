import { stylingRegressions } from './styling.mjs';
stylingRegressions('react');

import { editingRegressions } from './editing.mjs';
editingRegressions();

import { browserConformance } from './conformance.mjs';
browserConformance();

import {
  avatarGeometry,
  avatarRegressions,
  avatarReturnToLoadedSource,
  avatarSourceSwap,
} from './avatar.mjs';
avatarRegressions();
avatarSourceSwap();
avatarReturnToLoadedSource();
avatarGeometry();
