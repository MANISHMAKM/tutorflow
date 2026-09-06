import { SessionStatus } from '@/types';

export class StateTransitionError extends Error {
  statusCode: number;
  currentStatus: SessionStatus;
  requestedStatus: SessionStatus;

  constructor(currentStatus: SessionStatus, requestedStatus: SessionStatus) {
    const message = `Invalid state transition: Cannot transition session from '${currentStatus}' directly to '${requestedStatus}'. Valid sequence is: scheduled → in_progress → completed → ai_reviewed.`;
    super(message);
    this.name = 'StateTransitionError';
    this.statusCode = 409;
    this.currentStatus = currentStatus;
    this.requestedStatus = requestedStatus;
  }
}

/**
 * Validates session lifecycle status transitions.
 * Strict linear transition sequence: scheduled -> in_progress -> completed -> ai_reviewed.
 * No skipping or rewinding permitted.
 */
export function validateStateTransition(
  currentStatus: SessionStatus,
  newStatus: SessionStatus
): void {
  if (currentStatus === newStatus) {
    return; // No-op change allowed
  }

  const stateOrder: SessionStatus[] = ['scheduled', 'in_progress', 'completed', 'ai_reviewed'];
  const currentIndex = stateOrder.indexOf(currentStatus);
  const newIndex = stateOrder.indexOf(newStatus);

  if (currentIndex === -1 || newIndex === -1) {
    throw new StateTransitionError(currentStatus, newStatus);
  }

  // Allow adjacent forward (+1) and backward (-1) step transitions
  const stepDiff = Math.abs(newIndex - currentIndex);
  if (stepDiff > 1) {
    throw new StateTransitionError(currentStatus, newStatus);
  }
}

/**
 * Checks if notes editing is allowed for a given session status.
 * Notes can ONLY be edited during 'in_progress'.
 */
export function isNotesEditable(status: SessionStatus): boolean {
  return status === 'in_progress';
}
