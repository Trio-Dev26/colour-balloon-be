import { applyDecorators, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ADMIN_ROLE } from '../auth.service';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from './roles.decorator';

/** Restricts a controller or route to authenticated users with the admin role. */
export const AdminOnly = () =>
  applyDecorators(
    ApiBearerAuth(),
    UseGuards(JwtAuthGuard, RolesGuard),
    Roles(ADMIN_ROLE),
    ApiUnauthorizedResponse({ description: 'Missing or invalid access token' }),
    ApiForbiddenResponse({ description: 'Authenticated user is not an admin' }),
  );
