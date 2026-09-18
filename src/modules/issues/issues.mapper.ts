import type { Paginated } from '../../common/pagination.dto';
import type { Issue } from '../../database/schema';
import type {
  IssueResponseDto,
  PaginatedIssuesResponseDto,
} from './issues.dto';

export function toPaginatedIssuesResponse(
  paginated: Paginated<Issue>,
): PaginatedIssuesResponseDto {
  return { ...paginated, items: paginated.items.map(toIssueResponse) };
}

export function toIssueResponse(issue: Issue): IssueResponseDto {
  return {
    id: issue.id,
    systemId: issue.systemId,
    fingerprint: issue.fingerprint,
    type: issue.type,
    message: issue.message,
    level: issue.level,
    environment: issue.environment,
    release: issue.release,
    status: issue.status,
    count: issue.count,
    firstSeen: issue.firstSeen,
    lastSeen: issue.lastSeen,
  };
}
