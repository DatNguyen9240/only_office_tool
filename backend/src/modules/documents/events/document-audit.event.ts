export class DocumentAuditEvent {
  constructor(
    public readonly userId: string,
    public readonly action: string,
    public readonly documentId: string,
    public readonly documentName: string,
  ) {}
}
