import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import nodemailer, { type Transporter } from "nodemailer";

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter?: Transporter;
  private readonly from: string;

  constructor(config: ConfigService) {
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
    if (!this.transporter) return false;
    await this.transporter.sendMail({
      from: this.from,
      to,
      subject: "Reset your Meridian DMS password",
      text: [
        "A password reset was requested for your Meridian DMS account.",
        `Reset your password: ${resetUrl}`,
        "This link expires in 30 minutes. If you did not request it, ignore this email.",
      ].join("\n\n"),
      html: `<p>A password reset was requested for your Meridian DMS account.</p><p><a href="${this.escape(resetUrl)}">Reset your password</a></p><p>This link expires in 30 minutes. If you did not request it, ignore this email.</p>`,
    });
    return true;
  }

  async sendDocumentShared(
    to: string,
    actorName: string,
    documentName: string,
    documentUrl: string,
  ) {
    if (!this.transporter) return false;
    await this.transporter.sendMail({
      from: this.from,
      to,
      subject: `${actorName} shared ${documentName} with you`,
      text: `${actorName} shared "${documentName}" with you.\n\nOpen: ${documentUrl}`,
      html: `<p>${this.escape(actorName)} shared <strong>${this.escape(documentName)}</strong> with you.</p><p><a href="${this.escape(documentUrl)}">Open document</a></p>`,
    });
    return true;
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
