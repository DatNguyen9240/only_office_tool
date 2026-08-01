import { forwardRef, Inject, Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import nodemailer, { type Transporter } from "nodemailer";
import { OperationsService } from "../operations/operations.service";

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter?: Transporter;
  private readonly from: string;

  constructor(
    @Inject(ConfigService) config: ConfigService,
    @Inject(forwardRef(() => OperationsService))
    private readonly operations: OperationsService,
  ) {
    const smtpUrl = config.get<string>("SMTP_URL");
    this.from = config.get<string>(
      "MAIL_FROM",
      "Meridian DMS <no-reply@meridian.local>",
    );
    if (smtpUrl) {
      this.transporter = nodemailer.createTransport(smtpUrl);
    } else {
      this.logger.warn("SMTP_URL is not configured; outbound email is disabled");
    }
  }

  async sendPasswordReset(to: string, resetUrl: string) {
    const subject = "Reset your Meridian DMS password";
    const text = [
      "A password reset was requested for your Meridian DMS account.",
      `Reset your password: ${resetUrl}`,
      "This link expires in 30 minutes. If you did not request it, ignore this email.",
    ].join("\n\n");
    const html = `<p>A password reset was requested for your Meridian DMS account.</p><p><a href="${this.escape(resetUrl)}">Reset your password</a></p><p>This link expires in 30 minutes. If you did not request it, ignore this email.</p>`;

    await this.operations.enqueueEmailSend(to, subject, text, html);
    return true;
  }

  async sendDocumentShared(
    to: string,
    actorName: string,
    documentName: string,
    documentUrl: string,
  ) {
    const subject = `${actorName} shared ${documentName} with you`;
    const text = `${actorName} shared "${documentName}" with you.\n\nOpen: ${documentUrl}`;
    const html = `<p>${this.escape(actorName)} shared <strong>${this.escape(documentName)}</strong> with you.</p><p><a href="${this.escape(documentUrl)}">Open document</a></p>`;

    await this.operations.enqueueEmailSend(to, subject, text, html);
    return true;
  }

  async sendMailDirect(to: string, subject: string, text: string, html: string) {
    if (!this.transporter) {
      this.logger.warn("Outbound email is disabled (SMTP_URL not configured)");
      return false;
    }
    try {
      await this.transporter.sendMail({
        from: this.from,
        to,
        subject,
        text,
        html,
      });
      return true;
    } catch (error) {
      this.logger.error(`Failed to send email to ${to}: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  private escape(value: string) {
    return value.replace(
      /[&<>"']/g,
      (character) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#039;",
        })[character]!,
    );
  }
}
