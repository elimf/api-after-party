import { BacPhase } from '../../types';

const allowedTransitions: Record<BacPhase, BacPhase[]> = {
  lobby: ['playing'],
  playing: ['review'],
  review: ['scored'],
  scored: ['lobby', 'playing'],
};

export function transitionBacPhase(current: BacPhase, next: BacPhase): BacPhase {
  if (!allowedTransitions[current].includes(next)) {
    throw new Error(`Invalid Bac phase transition from ${current} to ${next}`);
  }
  return next;
}
