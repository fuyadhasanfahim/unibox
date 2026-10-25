import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { createTenantSchema, setTenantStatusSchema, tenantParamsSchema } from '@repo/shared';
import { createZodDto } from 'nestjs-zod';
import { PlatformAdmin } from '../tenancy/guards.js';
import { CurrentActor, type Actor } from '../tenancy/tenant-context.js';
import { PlatformTenantsService } from './platform-tenants.service.js';

class CreateTenantDto extends createZodDto(createTenantSchema) {}
class SetTenantStatusDto extends createZodDto(setTenantStatusSchema) {}
class TenantParams extends createZodDto(tenantParamsSchema) {}

@PlatformAdmin()
@Controller('platform/tenants')
export class PlatformTenantsController {
  constructor(private readonly tenants: PlatformTenantsService) {}

  @Get()
  list() {
    return this.tenants.list();
  }

  @Post()
  create(@CurrentActor() actor: Actor, @Body() body: CreateTenantDto) {
    return this.tenants.create(actor, body);
  }

  @Patch(':tenantId/status')
  setStatus(@CurrentActor() actor: Actor, @Param() params: TenantParams, @Body() body: SetTenantStatusDto) {
    return this.tenants.setStatus(actor, params.tenantId, body);
  }
}
