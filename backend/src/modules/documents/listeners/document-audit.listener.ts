import { Injectable, Logger, OnModuleDestroy, Optional } from "@nestjs/common";
import { Subject, Subscription } from "rxjs";
import { concatMap } from "rxjs/operators";
import { AuditService } from "../../../core/audit/audit.service";
import { DocumentAuditEvent } from "../events/document-audit.event";

@Injectable()
export class DocumentAuditListener implements OnModuleDestroy {
  private readonly logger = new Logger(DocumentAuditListener.name);
  private readonly event$ = new Subject<DocumentAuditEvent>();
  private readonly subscription: Subscription;

  constructor(@Optional() private readonly audit?: AuditService) {
    this.subscription = this.event$
      .pipe(
        concatMap(async (event) => {
          try {
            if (this.audit) {
              await this.audit.record({
                actorId: event.userId,
                action: event.action,
                resourceType: "DOCUMENT",
                resourceId: event.documentId,
                metadata: { name: event.documentName },
              });
            }
          } catch (error) {
            this.logger.error(
              `[Async Audit Non-Blocking Error] Action ${event.action} for doc ${event.documentId} failed`,
              error,
            );
          }
        }),
      )
      .subscribe();
  }

  emit(event: DocumentAuditEvent): void {
    this.event$.next(event);
  }

  onModuleDestroy() {
    this.event$.complete();
    this.subscription.unsubscribe();
  }
}
