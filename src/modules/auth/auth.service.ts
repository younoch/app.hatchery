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
import { Prisma, User } from '@prisma/client';
import { PasswordResetTokenRepository } from '@/common/repositories/password-reset-token.repository';
import { EmailService } from '@/common/email/email.service';
import { ConfigService } from '@nestjs/config';
import { RefreshTokenRepository } from '@/common/repositories/refresh-token.repository';
import { PrismaService } from '@/common/prisma/prisma.service';

@Injectable()
export class AuthService {
  constructor(
    private jwtService: JwtService,
    private userService: UserService,
    private passwordResetTokenRepository: PasswordResetTokenRepository,
    private refreshTokenRepository: RefreshTokenRepository,
    private emailService: EmailService,
    private configService: ConfigService,
    private prisma: PrismaService,
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
    // Single session: a new login ends every older session of this user.
    const refreshToken = await this.prisma.$transaction(async (tx) => {
      await this.refreshTokenRepository.revokeAllForUser(user.id, tx);
      return this.issueRefreshToken(user.id, crypto.randomUUID(), tx);
    });

    return {
      access_token: this.jwtService.sign(payload),
      refresh_token: refreshToken.rawToken,
    };
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ) {
    const { user, refreshToken } = await this.prisma.$transaction(
      async (tx) => {
        const user = await this.userService.updatePassword(
          userId,
          currentPassword,
          newPassword,
          tx,
        );
        // Every older session ends; the caller gets a fresh pair.
        await this.refreshTokenRepository.revokeAllForUser(userId, tx);
        const refreshToken = await this.issueRefreshToken(
          userId,
          crypto.randomUUID(),
          tx,
        );
        return { user, refreshToken };
      },
    );

    return {
      message: 'Password updated successfully',
      access_token: this.jwtService.sign({ email: user.email, sub: user.id }),
      refresh_token: refreshToken.rawToken,
    };
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
    await this.refreshTokenRepository.revokeAllForUser(resetToken.userId);
    await this.passwordResetTokenRepository.markUsed(resetToken.id);

    return { message: 'Password reset successfully' };
  }

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  private async issueRefreshToken(
    userId: string,
    familyId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<{ id: string; rawToken: string }> {
    const rawToken = crypto.randomBytes(32).toString('base64url');
    const hashedToken = this.hashToken(rawToken);
    const ttlMs = this.configService.getOrThrow<number>('refreshTokenTtlMs');
    const expiresAt = new Date(Date.now() + ttlMs);

    const row = await this.refreshTokenRepository.create(
      userId,
      hashedToken,
      expiresAt,
      familyId,
      tx,
    );
    return { id: row.id, rawToken };
  }

  async refresh(rawToken: string) {
    const hashedToken = this.hashToken(rawToken);
    const stored =
      await this.refreshTokenRepository.findByHashedToken(hashedToken);

    if (!stored || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const user = await this.userService.findById(stored.userId);
    if (!user) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
    if (!user.isActive) {
      throw new AppException(
        HttpStatus.UNAUTHORIZED,
        ErrorCode.USER_INACTIVE,
        'Account is deactivated',
      );
    }

    const graceMs = this.configService.getOrThrow<number>('refreshGraceMs');

    // Every session_revoked outcome is decided inside the transaction and
    // returned as null, so a family revoke is committed, not rolled back.
    const issued = await this.prisma.$transaction(async (tx) => {
      const rotated =
        !stored.revoked &&
        (await this.refreshTokenRepository.revokeIfActive(stored.id, tx)) === 1;

      if (rotated) {
        const child = await this.issueRefreshToken(
          user.id,
          stored.familyId,
          tx,
        );
        await this.refreshTokenRepository.setReplacedBy(
          stored.id,
          child.id,
          tx,
        );
        return child;
      }

      // Already revoked: by an earlier rotation, a takeover, or a concurrent
      // request that won the race a moment ago.
      const current = await this.refreshTokenRepository.findByHashedToken(
        hashedToken,
        tx,
      );
      const successor = current?.replacedBy;
      const inGrace =
        !!successor &&
        !successor.revoked &&
        Date.now() - successor.createdAt.getTime() < graceMs;

      if (!current || !inGrace) {
        // Reuse outside the grace window: end the whole family.
        await this.refreshTokenRepository.revokeFamily(stored.familyId, tx);
        return null;
      }

      // Grace is single-use. A second attempt does not revoke the family,
      // because that would log out the client that already succeeded.
      const claimed = await this.refreshTokenRepository.claimGrace(
        current.id,
        tx,
      );
      if (claimed === 0) return null;

      return this.issueRefreshToken(user.id, current.familyId, tx);
    });

    if (!issued) {
      throw new AppException(
        HttpStatus.UNAUTHORIZED,
        ErrorCode.SESSION_REVOKED,
        'Session has ended',
      );
    }

    const payload = { email: user.email, sub: user.id };
    return {
      access_token: this.jwtService.sign(payload),
      refresh_token: issued.rawToken,
    };
  }

  async logout(rawToken: string): Promise<{ message: string }> {
    const hashedToken = this.hashToken(rawToken);
    const stored =
      await this.refreshTokenRepository.findByHashedToken(hashedToken);

    if (stored) {
      await this.refreshTokenRepository.revokeFamily(stored.familyId);
    }

    return { message: 'Logged out successfully' };
  }
}
