import type { EventType } from '../types';

export interface SwineAiSafetyDecision {
  details: Record<string, unknown>;
  lifecycleActionable: boolean;
  safetyReason?: string;
}

export const applySwineAiSafetyGate = (
  eventType: EventType,
  rawDetails: Record<string, unknown> | null | undefined,
): SwineAiSafetyDecision => {
  const details = { ...(rawDetails ?? {}) };
  const aiAssisted = details.ai_assisted === true;

  if (!aiAssisted) {
    return { details, lifecycleActionable: true };
  }

  if (eventType === 'ULTRASOUND') {
    const result = details.result;
    if (result === 'POSITIVE' || result === 'NEGATIVE') {
      return { details, lifecycleActionable: true };
    }

    const safetyReason = result === 'ABORTION'
      ? 'AI_CANNOT_CONFIRM_ABORTION'
      : 'AI_ULTRASOUND_UNCERTAIN';

    return {
      lifecycleActionable: false,
      safetyReason,
      details: {
        ...details,
        result: 'UNCERTAIN',
        safetyGate: safetyReason,
        requiresHumanReview: true,
      },
    };
  }

  if (eventType === 'HEAT_RETURN') {
    if (details.result === 'ACTIVE') {
      return { details, lifecycleActionable: true };
    }

    return {
      lifecycleActionable: false,
      safetyReason: 'AI_ESTRUS_NOT_CONFIRMED',
      details: {
        ...details,
        result: 'NONE',
        safetyGate: 'AI_ESTRUS_NOT_CONFIRMED',
        requiresHumanReview: true,
      },
    };
  }

  return { details, lifecycleActionable: true };
};
