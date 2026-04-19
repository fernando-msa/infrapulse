import { Injectable, NestMiddleware, ForbiddenException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

/**
 * Middleware de isolamento multi-tenant
 * 
 * Garante que TODAS as requisições tenham um companyId extraído do JWT
 * Injeta o companyId na requisição para que os controllers/services não precisem fazer isso
 * 
 * Padrão SaaS: Isolamento de dados por tenant é CRÍTICO
 */
@Injectable()
export class TenantIsolationMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    // Endpoints públicos que não precisam de isolamento
    const publicRoutes = [
      '/api/metrics/sla',
      '/api/metrics',
      '/api/teams/performance',
      '/api/incidents',
      '/api/auth/login',
      '/api/auth/signup-company',
      '/api/docs',
    ];

    const isPublicRoute = publicRoutes.some(route => req.path.startsWith(route));

    if (isPublicRoute) {
      return next();
    }

    // Para rotas protegidas, EXIGIR que haja um usuário autenticado com companyId
    const user = (req as any).user;

    if (!user) {
      // Se não há user (ainda não passou por JwtAuthGuard), deixa passar
      // O JwtAuthGuard vai rejeitar se necessário
      return next();
    }

    // GARANTIR que o companyId existe e está no usuário
    if (!user.companyId) {
      throw new ForbiddenException('Isolamento multi-tenant: companyId não encontrado no JWT');
    }

    // Injetar o companyId na requisição para fácil acesso
    (req as any).companyId = user.companyId;

    next();
  }
}
