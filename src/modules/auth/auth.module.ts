import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { BullModule } from '@nestjs/bullmq';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './jwt.strategy/jwt.strategy';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { UserModule } from '../user/user.module';
import { EmailVerificationProcessor } from '@/common/bullmq/email-verification.processor';
import { EmailModule } from '@/common/email/email.module';
import { BullBoardModule } from '@bull-board/nestjs';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { RepositoriesModule } from '@/common/repositories/repositories.module';
import { PrismaModule } from '@/common/prisma/prisma.module';

@Module({
  imports: [
    ConfigModule,
    PassportModule,
    UserModule,
    EmailModule,
    RepositoriesModule,
    PrismaModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const secret = configService.get<string>('JWT_SECRET');
        const expiresIn = configService.get<string>('TOKEN_EXPIRATION', '24h');
        return {
          secret: secret,
          signOptions: {
            expiresIn: expiresIn as `${number}${'s' | 'm' | 'h' | 'd'}`,
          },
        };
      },
    }),
    BullModule.registerQueue({
      name: 'email-verification',
    }),
    BullBoardModule.forFeature({
      name: 'email-verification',
      adapter: BullMQAdapter,
    }),
  ],
  providers: [AuthService, JwtStrategy, EmailVerificationProcessor],
  controllers: [AuthController],
})
export class AuthModule {}
