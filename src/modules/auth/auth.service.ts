import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  HttpStatus,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';
import { AppException } from '@/common/errors/app.exception';
import { ErrorCode } from '@/common/errors/error-codes';
import { UserService } from '../user/user.service';
import { User } from '@prisma/client';
import { SafeUser } from '../user/types/safe-user.type';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PasswordResetTokenRepository } from '@/common/repositories/password-reset-token.repository';
import { EmailService } from '@/common/email/email.service';
import { ConfigService } from '@nestjs/config';
import { RefreshTokenRepository } from '@/common/repositories/refresh-token.repository';
@Injectable()
export class AuthService {
  constructor(
    private jwtService: JwtService,
    private userService: UserService,
    @InjectQueue('email-verification') private emailQueue: Queue,
    private passwordResetTokenRepository: PasswordResetTokenRepository,
    private refreshTokenRepository: RefreshTokenRepository,
    private emailService: EmailService,
    private configService: ConfigService,
  ) {}

  async validateUser(username: string, password: string): Promise<User | null> {
    const user = await this.userService.findByUsernameForAuth(username);
    if (!user) return null;

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return null;

    return user;
  }

  async login(username: string, password: string) {
    const user = await this.validateUser(username, password);

    if (!user) {
      throw new AppException(
        HttpStatus.UNAUTHORIZED,
        ErrorCode.INVALID_CREDENTIALS,
        'Invalid credentials',
      );
    }
    // Checked after the password, so a wrong password never reveals the state.
    if (!user.isActive) {
      throw new AppException(
        HttpStatus.UNAUTHORIZED,
        ErrorCode.USER_INACTIVE,
        'Account is deactivated',
      );
    }

    const payload = { email: user.email, sub: user.id };
    const refreshToken = await this.issueRefreshToken(user.id);

    return {
      access_token: this.jwtService.sign(payload),
      refresh_token: refreshToken,
    };
  }

  async register(
    email: string,
    username: string,
    password: string,
  ): Promise<SafeUser> {
    const existingUser = await this.userService.findByEmail(email);

    if (existingUser) {
      throw new BadRequestException('Email already exists');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    return this.userService.createUser(email, username, hashedPassword);
  }
  async registerAsync(
    email: string,
    username: string,
    password: string,
  ): Promise<{ message: string }> {
    const existingUser = await this.userService.findByEmail(email);

    if (existingUser) {
      if (existingUser.emailVerified) {
        throw new BadRequestException('Email already exists');
      }

      // unverified — resend flow
      const token = crypto.randomBytes(32).toString('base64url');
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

      await this.userService.regenerateVerificationToken(
        existingUser.id,
        token,
        expiresAt,
      );

      await this.emailQueue.add(
        'resend-verification',
        {
          email,
          token,
        },
        {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
        },
      );

      return { message: 'Verification email resent' };
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await this.emailQueue.add(
      'register-user',
      { email, username, hashedPassword },
      {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      },
    );

    return { message: 'Registration accepted, processing in background' };
  }
  async verifyEmail(token: string): Promise<{ message: string }> {
    return this.userService.verifyEmail(token);
  }
  async forgotPassword(email: string): Promise<{ message: string }> {
    const genericMessage = {
      message: 'If this email exists, a reset link has been sent',
    };

    const user = await this.userService.findByEmail(email);
    if (!user) {
      return genericMessage; // enumeration prevention — একই response
    }

    const token = crypto.randomBytes(32).toString('base64url');
    const expirationMinutes = this.configService.get<number>(
      'PASSWORD_RESET_EXPIRATION',
      15,
    );
    const expiresAt = new Date(Date.now() + expirationMinutes * 60 * 1000);

    await this.passwordResetTokenRepository.create(user.id, token, expiresAt);

    const resetLink = `${this.configService.get<string>('APP_URL')}/auth/reset-password?token=${token}`;
    await this.emailService.sendMail(
      email,
      'Reset your password',
      `Your password reset link: ${resetLink}`,
    );

    return genericMessage;
  }

  async resetPassword(
    token: string,
    newPassword: string,
  ): Promise<{ message: string }> {
    const resetToken =
      await this.passwordResetTokenRepository.findByToken(token);

    if (!resetToken) {
      throw new BadRequestException('Invalid or expired reset link');
    }
    if (resetToken.used) {
      throw new BadRequestException('This reset link has already been used');
    }
    if (resetToken.expiresAt < new Date()) {
      throw new BadRequestException('This reset link has expired');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await this.userService.setPassword(resetToken.userId, hashedPassword);
    await this.passwordResetTokenRepository.markUsed(resetToken.id);

    return { message: 'Password reset successfully' };
  }

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  private async issueRefreshToken(userId: string): Promise<string> {
    const rawToken = crypto.randomBytes(32).toString('base64url');
    const hashedToken = this.hashToken(rawToken);
    const ttlMs = this.configService.getOrThrow<number>('refreshTokenTtlMs');
    const expiresAt = new Date(Date.now() + ttlMs);

    await this.refreshTokenRepository.create(userId, hashedToken, expiresAt);
    return rawToken;
  }

  async refresh(rawToken: string) {
    const hashedToken = this.hashToken(rawToken);
    const stored =
      await this.refreshTokenRepository.findByHashedToken(hashedToken);

    if (!stored || stored.revoked || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    // Rotation: পুরনোটা revoke, নতুন pair issue
    await this.refreshTokenRepository.revoke(stored.id);

    const user = await this.userService.findById(stored.userId);
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const payload = { email: user.email, sub: user.id };
    const newRefreshToken = await this.issueRefreshToken(user.id);

    return {
      access_token: this.jwtService.sign(payload),
      refresh_token: newRefreshToken,
    };
  }

  async logout(rawToken: string): Promise<{ message: string }> {
    const hashedToken = this.hashToken(rawToken);
    const stored =
      await this.refreshTokenRepository.findByHashedToken(hashedToken);

    if (stored) {
      await this.refreshTokenRepository.revoke(stored.id);
    }

    return { message: 'Logged out successfully' };
  }
}
