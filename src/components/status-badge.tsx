import { Badge, type BadgeTone } from '@/components/badge';
import type { ClientStatus, SurveyStatus } from '@/types/domain';

/** Any lifecycle/status value the badge can render. */
type BadgeStatus = ClientStatus | SurveyStatus;

interface StatusBadgeProps {
  /** The client or survey status to display. */
  status: BadgeStatus;
}

/** Maps each domain status value to a semantic badge tone. */
const STATUS_TONES: Record<BadgeStatus, BadgeTone> = {
  active: 'positive',
  inactive: 'neutral',
  draft: 'caution',
  published: 'positive',
  archived: 'neutral',
};

/**
 * A pill badge communicating a client's active state or a survey's
 * draft-vs-live lifecycle status.
 */
export function StatusBadge({ status }: StatusBadgeProps) {
  return <Badge tone={STATUS_TONES[status]}>{status}</Badge>;
}
