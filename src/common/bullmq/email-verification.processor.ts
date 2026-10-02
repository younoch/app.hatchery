import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { UserService } from '@/modules/user/user.service';
import { EmailService } from '../email/email.service';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { Prisma } from '@prisma/client';

interface RegisterJobData {
  email: string;
  hashedPassword: string;
}

interface ResendVerificationJobData {
  email: string;
  token: string;
}

@Injectable()
@Processor('email-verification')
export class EmailVerificationProcessor extends WorkerHost {
  private readonly logger = new Logger(EmailVerificationProcessor.name);

  constructor(
    private readonly userService: UserService,
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
  ) {
    super();
  }

  async process(job: Job): Promise<void> {
    switch (job.name) {
      case 'register-user':
        return this.handleRegisterUser(job.data as RegisterJobData);
      case 'resend-verification':
        return this.handleResendVerification(
          job.data as ResendVerificationJobData,
        );
      default:
        this.logger.warn(`[worker] unknown job name: ${job.name}`);
    }
  }

  private async handleRegisterUser(data: RegisterJobData): Promise<void> {
    const { email, hashedPassword } = data;
    this.logger.log(`[worker] received registration job for: ${email}`);

    try {
      let user = await this.userService.findByEmail(email);
      let token: string;

      if (!user) {
        // প্রথম attempt — নতুন user + verification তৈরি করো
        token = crypto.randomBytes(32).toString('base64url');
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

        user = await this.userService.createUserWithVerification(
          email,
          hashedPassword,
          token,
          expiresAt,
        );
      } else {
        // retry — আগের attempt-এ user তৈরি হয়ে গিয়েছিল, email send fail করেছিল
        // নতুন করে user/token বানানোর দরকার নেই, পুরনো token পুনর্ব্যবহার করো
        const verification = await this.userService.getVerificationByUserId(
          user.id,
        );

        if (!verification) {
          // এটা হওয়ার কথা না, কিন্তু defensive check
          this.logger.error(
            `[worker] user exists but verification record missing: ${email}`,
          );
          return;
        }

        token = verification.token;
      }

      await this.emailService.sendMail(
        email,
        'Verify your email',
        `Your verification link: ${this.getVerificationUrl(token)}`,
      );

      this.logger.log(
        `[worker] user created + verification email sent: ${email}`,
      );
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        // race condition-এর জন্য এখনো রাখছি, কিন্তু normal retry flow-এ এখন আর হওয়ার কথা না
        this.logger.error(
          `[worker] duplicate email, not retrying: ${email}`,
          error.stack,
        );
        return;
      }

      this.logger.error(
        `[worker] failed to process registration for ${email}, will retry`,
        error instanceof Error ? error.stack : String(error),
      );
      throw error;
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
