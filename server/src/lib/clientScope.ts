/**
 * A company is anchored by its primary CLIENT user. Extra founders/team members
 * are User rows whose `companyOwnerId` points at that primary client. Every data
 * access for a CLIENT therefore resolves to a single "company scope" id:
 *   - team member  → their companyOwnerId (the primary client)
 *   - primary/other → their own id
 */
export function clientScopeId(user: { userId: number; companyOwnerId?: number | null }): number {
  return user.companyOwnerId ?? user.userId;
}
