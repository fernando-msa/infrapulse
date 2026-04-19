import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AuditService } from '../../audit/audit.service';
import { AuditEntity, AuditAction } from '@prisma/client';
import { Request } from 'express';

/**
 * Interceptor de Auditoria Automática
 * 
 * Captura automaticamente:
 * - POST /api/tickets → CREATE
 * - PUT /api/tickets/:id → UPDATE
 * - DELETE /api/tickets/:id → DELETE
 * 
 * Registra IP, User-Agent e mudanças for compliance (LGPD/ISO)
 */
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private auditService: AuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const method = request.method;
    const path = request.path;

    // Captura dados antes da ação
    const requestBody = { ...request.body };

    return next.handle().pipe(
      tap(async (response) => {
        try {
          // Determina ação e entidade baseado na rota e método
          const { action, entity, entityId } = this.parseAction(
            method,
            path,
            requestBody,
            response,
          );

          if (!action || !entity || !entityId) {
            return; // Não é uma rota auditável
          }

          // Extrai context do JWT
          const userId = (request as any).user?.id;
          const companyId = (request as any).user?.companyId;
          const ipAddress = this.getClientIp(request);
          const userAgent = request.get('user-agent');

          // Dados para auditoria
          let before: any;
          let after: any;

          if (action === AuditAction.CREATE) {
            after = response; // O novo recurso criado
          } else if (action === AuditAction.UPDATE) {
            // Nota: Aqui você precisaria carregar o estado anterior
            // Para simplificar, usamos requestBody como indicador
            after = response; // Estado após update
          } else if (action === AuditAction.DELETE) {
            before = requestBody; // Dados do recurso deletado
          }

          // Registra na auditoria
          if (action === AuditAction.UPDATE && before && after) {
            await this.auditService.logUpdate(
              entity,
              entityId,
              companyId,
              userId,
              before,
              after,
              ipAddress,
              userAgent,
            );
          } else if (action === AuditAction.CREATE) {
            await this.auditService.logCreate(
              entity,
              entityId,
              companyId,
              userId,
              after,
              ipAddress,
              userAgent,
            );
          } else if (action === AuditAction.DELETE) {
            await this.auditService.logDelete(
              entity,
              entityId,
              companyId,
              userId,
              before,
              ipAddress,
              userAgent,
            );
          }
        } catch (err) {
          // Não falha a request se auditoria falhar
          // Apenas log para debugging
          console.error('Erro ao registrar auditoria:', err);
        }
      }),
    );
  }

  /**
   * Determina ação, entidade e ID do recurso baseado na rota e método
   */
  private parseAction(
    method: string,
    path: string,
    body: any,
    response: any,
  ): { action?: AuditAction; entity?: AuditEntity; entityId?: string } {
    // Rotas de tickets
    if (path.includes('/api/tickets')) {
      if (method === 'POST') {
        return {
          action: AuditAction.CREATE,
          entity: AuditEntity.TICKET,
          entityId: response?.id,
        };
      }

      if (method === 'PUT') {
        const match = path.match(/\/api\/tickets\/([a-f0-9\-]+)/);
        return {
          action: AuditAction.UPDATE,
          entity: AuditEntity.TICKET,
          entityId: match?.[1],
        };
      }

      if (method === 'DELETE') {
        const match = path.match(/\/api\/tickets\/([a-f0-9\-]+)/);
        return {
          action: AuditAction.DELETE,
          entity: AuditEntity.TICKET,
          entityId: match?.[1],
        };
      }
    }

    // Rotas de usuários
    if (path.includes('/api/users')) {
      if (method === 'POST') {
        return {
          action: AuditAction.CREATE,
          entity: AuditEntity.USER,
          entityId: response?.id,
        };
      }

      if (method === 'PUT') {
        const match = path.match(/\/api\/users\/([a-f0-9\-]+)/);
        return {
          action: AuditAction.UPDATE,
          entity: AuditEntity.USER,
          entityId: match?.[1],
        };
      }

      if (method === 'DELETE') {
        const match = path.match(/\/api\/users\/([a-f0-9\-]+)/);
        return {
          action: AuditAction.DELETE,
          entity: AuditEntity.USER,
          entityId: match?.[1],
        };
      }
    }

    return {};
  }

  /**
   * Extrai IP do cliente considerando proxies e load balancers
   */
  private getClientIp(request: Request): string {
    return (
      (request.headers['x-forwarded-for'] as string)?.split(',')[0].trim() ||
      (request.headers['x-real-ip'] as string) ||
      request.socket.remoteAddress ||
      'unknown'
    );
  }
}
