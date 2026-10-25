import { Body, Controller, Get, HttpCode, Post, Query } from '@nestjs/common';
import { acceptInvitationSchema, invitationLookupQuerySchema } from '@repo/shared';
import { AllowAnonymous } from '@thallesp/nestjs-better-auth';
import { createZodDto } from 'nestjs-zod';
import { InvitesService } from './invites.service.js';

class AcceptInvitationDto extends createZodDto(acceptInvitationSchema) {}
class InvitationLookupQuery extends createZodDto(invitationLookupQuerySchema) {}

// Public by design: the bearer of a valid invite token is the only authority here.
@AllowAnonymous()
@Controller('invites')
export class InvitesController {
  constructor(private readonly invites: InvitesService) {}

  @Get('lookup')
  lookup(@Query() query: InvitationLookupQuery) {
    return this.invites.preview(query.token);
  }

  @Post('accept')
  @HttpCode(201)
  accept(@Body() body: AcceptInvitationDto) {
    return this.invites.accept(body);
  }
}
