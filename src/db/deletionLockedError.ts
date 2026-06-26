/**
 * Thrown when a non-admin user attempts to delete a collection or environment
 * that has deletion protection enabled.
 */
export class DeletionLockedError extends Error {
  /**
   * @param entityType - Human-readable entity kind shown in the error message.
   */
  constructor(entityType: 'collection' | 'environment') {
    super(`Deletion is locked for this ${entityType}.`);
    this.name = 'DeletionLockedError';
  }
}
