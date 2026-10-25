import { Module } from '@nestjs/common';
import { TokenVaultService } from './token-vault.service.js';

@Module({ providers: [TokenVaultService], exports: [TokenVaultService] })
export class ChannelsModule {}
