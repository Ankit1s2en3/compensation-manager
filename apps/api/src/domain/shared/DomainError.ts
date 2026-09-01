/**
 * Base class for a broken domain rule. Carries the concrete subclass name so
 * callers (and tests) can discriminate without a manual `this.name =` in each.
 */
export class DomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}
