import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { EmailService } from '../email/email.service';
import { ConfigService } from '@nestjs/config';
interface ResendVerificationJobData {
  email: string;
  token: string;
}

@Injectable()
@Processor('email-verification')
export class EmailVerificationProcessor extends WorkerHost {
  private readonly logger = new Logger(EmailVerificationProcessor.name);

  constructor(
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
  ) {
    super();
  }

  async process(job: Job): Promise<void> {
    switch (job.name) {
      case 'resend-verification':
        return this.handleResendVerification(
          job.data as ResendVerificationJobData,
        );
      default:
        this.logger.warn(`[worker] unknown job name: ${job.name}`);
    }
  }

  private async handleResendVerification(
    data: ResendVerificationJobData,
  ): Promise<void> {
    const { email, token } = data;

    try {
      await this.emailService.sendMail(
        email,
        'Verify your email',
        `Your verification link: ${this.getVerificationUrl(token)}`,
      );
      this.logger.log(`[worker] resend verification email sent: ${email}`);
    } catch (error) {
      // sendMail failures here are almost always transient (SMTP down/network) — rethrow
      this.logger.error(
        `[worker] failed to resend verification for ${email}, will retry`,
        error instanceof Error ? error.stack : String(error),
      );
      throw error;
    }
  }

  private getVerificationUrl(token: string): string {
    const appUrl = this.configService.getOrThrow<string>('appUrl');
    return `${appUrl}/auth/verify-email?token=${token}`;
  }
}
