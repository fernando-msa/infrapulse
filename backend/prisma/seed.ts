import { PrismaClient, UserRole, TicketStatus, TicketPriority, SlaStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60000);
}

function subtractHours(date: Date, hours: number): Date {
  return new Date(date.getTime() - hours * 3600000);
}

async function main() {
  console.log('🌱 Iniciando seed...');

  // Empresa
  const company = await prisma.company.upsert({
    where: { slug: 'infrapulse-demo' },
    update: {},
    create: {
      name: 'InfraPulse Demo',
      slug: 'infrapulse-demo',
      cnpj: '00.000.000/0001-00',
      plan: 'GROWTH',
      subscriptionStatus: 'ACTIVE',
      seatLimit: 50,
      monthlyTicketLimit: 10000,
      currentPeriodStart: new Date(),
      currentPeriodEnd: addMinutes(new Date(), 43200),
    },
  });

  // Usuários
  const adminPassword = await bcrypt.hash('admin123', 10);
  const gestorPassword = await bcrypt.hash('gestor123', 10);
  const analistaPassword = await bcrypt.hash('analista123', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@infrapulse.com' },
    update: {},
    create: {
      name: 'Administrador',
      email: 'admin@infrapulse.com',
      password: adminPassword,
      role: UserRole.ADMIN,
      companyId: company.id,
    },
  });

  const gestor = await prisma.user.upsert({
    where: { email: 'gestor@infrapulse.com' },
    update: {},
    create: {
      name: 'Carlos Gestor',
      email: 'gestor@infrapulse.com',
      password: gestorPassword,
      role: UserRole.GESTOR,
      companyId: company.id,
    },
  });

  const analista1 = await prisma.user.upsert({
    where: { email: 'analista@infrapulse.com' },
    update: {},
    create: {
      name: 'Ana Analista',
      email: 'analista@infrapulse.com',
      password: analistaPassword,
      role: UserRole.ANALISTA,
      companyId: company.id,
    },
  });

  const analista2 = await prisma.user.upsert({
    where: { email: 'joao@infrapulse.com' },
    update: {},
    create: {
      name: 'João Silva',
      email: 'joao@infrapulse.com',
      password: analistaPassword,
      role: UserRole.ANALISTA,
      companyId: company.id,
    },
  });

  const analista3 = await prisma.user.upsert({
    where: { email: 'maria@infrapulse.com' },
    update: {},
    create: {
      name: 'Maria Santos',
      email: 'maria@infrapulse.com',
      password: analistaPassword,
      role: UserRole.ANALISTA,
      companyId: company.id,
    },
  });

  // Regras de SLA
  const slaBaixa = await prisma.slaRule.upsert({
    where: { id: 'sla-baixa' },
    update: {},
    create: {
      id: 'sla-baixa',
      name: 'SLA Baixa Prioridade',
      priority: TicketPriority.BAIXA,
      responseTime: 240,
      resolutionTime: 2880,
      companyId: company.id,
    },
  });

  const slaMedia = await prisma.slaRule.upsert({
    where: { id: 'sla-media' },
    update: {},
    create: {
      id: 'sla-media',
      name: 'SLA Média Prioridade',
      priority: TicketPriority.MEDIA,
      responseTime: 120,
      resolutionTime: 1440,
      companyId: company.id,
    },
  });

  const slaAlta = await prisma.slaRule.upsert({
    where: { id: 'sla-alta' },
    update: {},
    create: {
      id: 'sla-alta',
      name: 'SLA Alta Prioridade',
      priority: TicketPriority.ALTA,
      responseTime: 60,
      resolutionTime: 480,
      companyId: company.id,
    },
  });

  const slaCritica = await prisma.slaRule.upsert({
    where: { id: 'sla-critica' },
    update: {},
    create: {
      id: 'sla-critica',
      name: 'SLA Crítica',
      priority: TicketPriority.CRITICA,
      responseTime: 30,
      resolutionTime: 120,
      companyId: company.id,
    },
  });

  // Chamados fictícios
  const now = new Date();
  const tickets = [
    {
      title: 'Sistema de prontuário fora do ar',
      description: 'O sistema de prontuário eletrônico está inacessível para todos os usuários',
      status: TicketStatus.ABERTO,
      priority: TicketPriority.CRITICA,
      category: 'Infraestrutura',
      sector: 'UTI',
      slaRuleId: slaCritica.id,
      slaStatus: SlaStatus.EM_RISCO,
      openedAt: subtractHours(now, 1.5),
      slaDeadline: addMinutes(subtractHours(now, 1.5), 120),
      assignedToId: analista1.id,
    },
    {
      title: 'Impressora da recepção não funciona',
      description: 'A impressora da recepção principal apresenta erro de driver',
      status: TicketStatus.EM_ANDAMENTO,
      priority: TicketPriority.MEDIA,
      category: 'Hardware',
      sector: 'Recepção',
      slaRuleId: slaMedia.id,
      slaStatus: SlaStatus.OK,
      openedAt: subtractHours(now, 3),
      slaDeadline: addMinutes(subtractHours(now, 3), 1440),
      firstResponseAt: subtractHours(now, 2.5),
      assignedToId: analista2.id,
    },
    {
      title: 'Email corporativo não sincroniza',
      description: 'Vários usuários relatam que o email não está sincronizando no celular',
      status: TicketStatus.CONCLUIDO,
      priority: TicketPriority.ALTA,
      category: 'E-mail',
      sector: 'RH',
      slaRuleId: slaAlta.id,
      slaStatus: SlaStatus.OK,
      openedAt: subtractHours(now, 8),
      slaDeadline: addMinutes(subtractHours(now, 8), 480),
      firstResponseAt: subtractHours(now, 7.5),
      resolvedAt: subtractHours(now, 4),
      assignedToId: analista1.id,
    },
    {
      title: 'Senha do sistema bloqueada',
      description: 'Usuário da farmácia está com senha bloqueada após 3 tentativas',
      status: TicketStatus.CONCLUIDO,
      priority: TicketPriority.MEDIA,
      category: 'Acesso',
      sector: 'Farmácia',
      slaRuleId: slaMedia.id,
      slaStatus: SlaStatus.OK,
      openedAt: subtractHours(now, 5),
      slaDeadline: addMinutes(subtractHours(now, 5), 1440),
      firstResponseAt: subtractHours(now, 4.8),
      resolvedAt: subtractHours(now, 4),
      assignedToId: analista3.id,
    },
    {
      title: 'Computador não liga - Sala de Cirurgia',
      description: 'Computador da sala de cirurgia não responde ao ligar',
      status: TicketStatus.ABERTO,
      priority: TicketPriority.CRITICA,
      category: 'Hardware',
      sector: 'Centro Cirúrgico',
      slaRuleId: slaCritica.id,
      slaStatus: SlaStatus.VIOLADO,
      openedAt: subtractHours(now, 3),
      slaDeadline: addMinutes(subtractHours(now, 3), 120),
      assignedToId: analista2.id,
    },
    {
      title: 'VPN sem conexão para home office',
      description: 'Equipe administrativa em home office relata falha na VPN',
      status: TicketStatus.EM_ANDAMENTO,
      priority: TicketPriority.ALTA,
      category: 'Rede',
      sector: 'Administrativo',
      slaRuleId: slaAlta.id,
      slaStatus: SlaStatus.EM_RISCO,
      openedAt: subtractHours(now, 5),
      slaDeadline: addMinutes(subtractHours(now, 5), 480),
      firstResponseAt: subtractHours(now, 4.5),
      assignedToId: analista1.id,
    },
    {
      title: 'Atualização de sistema operacional',
      description: 'Executar atualização programada do Windows em 10 estações',
      status: TicketStatus.PENDENTE,
      priority: TicketPriority.BAIXA,
      category: 'Manutenção',
      sector: 'TI',
      slaRuleId: slaBaixa.id,
      slaStatus: SlaStatus.OK,
      openedAt: subtractHours(now, 24),
      slaDeadline: addMinutes(subtractHours(now, 24), 2880),
      assignedToId: analista3.id,
    },
    {
      title: 'Câmera de segurança offline',
      description: 'Câmera do corredor principal está offline desde ontem',
      status: TicketStatus.ABERTO,
      priority: TicketPriority.ALTA,
      category: 'Segurança',
      sector: 'Segurança Patrimonial',
      slaRuleId: slaAlta.id,
      slaStatus: SlaStatus.EM_RISCO,
      openedAt: subtractHours(now, 6),
      slaDeadline: addMinutes(subtractHours(now, 6), 480),
      assignedToId: analista2.id,
    },
    {
      title: 'Sistema de ponto eletrônico com erro',
      description: 'Funcionários não conseguem registrar ponto no sistema biométrico',
      status: TicketStatus.EM_ANDAMENTO,
      priority: TicketPriority.ALTA,
      category: 'Software',
      sector: 'RH',
      slaRuleId: slaAlta.id,
      slaStatus: SlaStatus.OK,
      openedAt: subtractHours(now, 4),
      slaDeadline: addMinutes(subtractHours(now, 4), 480),
      firstResponseAt: subtractHours(now, 3.5),
      assignedToId: analista1.id,
    },
    {
      title: 'Notebook da diretoria com tela quebrada',
      description: 'Tela do notebook do diretor financeiro está trincada',
      status: TicketStatus.CONCLUIDO,
      priority: TicketPriority.MEDIA,
      category: 'Hardware',
      sector: 'Diretoria',
      slaRuleId: slaMedia.id,
      slaStatus: SlaStatus.OK,
      openedAt: subtractHours(now, 48),
      slaDeadline: addMinutes(subtractHours(now, 48), 1440),
      firstResponseAt: subtractHours(now, 47),
      resolvedAt: subtractHours(now, 24),
      assignedToId: analista3.id,
    },
    {
      title: 'Servidor de arquivos sem espaço',
      description: 'Servidor de arquivos da clínica está com menos de 5% de espaço livre',
      status: TicketStatus.ABERTO,
      priority: TicketPriority.CRITICA,
      category: 'Infraestrutura',
      sector: 'TI',
      slaRuleId: slaCritica.id,
      slaStatus: SlaStatus.EM_RISCO,
      openedAt: subtractHours(now, 0.5),
      slaDeadline: addMinutes(subtractHours(now, 0.5), 120),
      assignedToId: analista2.id,
    },
    {
      title: 'Wi-Fi fraco no ambulatório',
      description: 'Sinal de Wi-Fi está muito fraco no ambulatório B',
      status: TicketStatus.ABERTO,
      priority: TicketPriority.BAIXA,
      category: 'Rede',
      sector: 'Ambulatório',
      slaRuleId: slaBaixa.id,
      slaStatus: SlaStatus.OK,
      openedAt: subtractHours(now, 12),
      slaDeadline: addMinutes(subtractHours(now, 12), 2880),
      assignedToId: analista3.id,
    },
  ];

  for (const ticket of tickets) {
    await prisma.ticket.create({
      data: {
        ...ticket,
        companyId: company.id,
        createdById: gestor.id,
      },
    });
  }

  console.log('✅ Seed concluído com sucesso!');
  console.log('');
  console.log('👤 Usuários criados:');
  console.log('   admin@infrapulse.com / admin123 (Admin)');
  console.log('   gestor@infrapulse.com / gestor123 (Gestor)');
  console.log('   analista@infrapulse.com / analista123 (Analista)');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
