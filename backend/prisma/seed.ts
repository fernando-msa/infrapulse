import { PrismaClient, Prisma, UserRole, TicketStatus, TicketPriority, SlaStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const TICKET_COUNT = 1200;
const BATCH_SIZE = 200;

type SeedAnalyst = {
  id: string;
  name: string;
  email: string;
  weight: number;
  slaOkRate: number;
  fastResolutionMultiplier: number;
};

type IssueTemplate = {
  title: string;
  description: string;
  category: string;
  priority: TicketPriority;
  sectorOptions: string[];
};

type WeightedOption<T> = {
  value: T;
  weight: number;
};

function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60000);
}

function addDays(date: Date, days: number): Date {
  return addMinutes(date, days * 24 * 60);
}

function subtractMinutes(date: Date, minutes: number): Date {
  return addMinutes(date, -minutes);
}

function createPrng(seed: number): () => number {
  let state = seed;

  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

function randomInt(random: () => number, min: number, max: number): number {
  return Math.floor(random() * (max - min + 1)) + min;
}

function randomFloat(random: () => number, min: number, max: number): number {
  return random() * (max - min) + min;
}

function pickWeighted<T>(random: () => number, options: Array<WeightedOption<T>>): T {
  const totalWeight = options.reduce((sum, option) => sum + option.weight, 0);
  let cursor = random() * totalWeight;

  for (const option of options) {
    cursor -= option.weight;
    if (cursor <= 0) {
      return option.value;
    }
  }

  return options[options.length - 1].value;
}

function pickFromList<T>(random: () => number, items: T[]): T {
  return items[Math.floor(random() * items.length)];
}

function chunkArray<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];

  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }

  return chunks;
}

function formatTicketNumber(index: number): string {
  return String(index + 1).padStart(4, '0');
}

async function main() {
  console.log('Iniciando seed...');

  const company = await prisma.company.upsert({
    where: { slug: 'infrapulse-demo' },
    update: {
      name: 'InfraPulse Demo',
      cnpj: '00.000.000/0001-00',
      plan: 'GROWTH',
      subscriptionStatus: 'ACTIVE',
      seatLimit: 50,
      monthlyTicketLimit: 10000,
      currentPeriodStart: new Date(),
      currentPeriodEnd: addDays(new Date(), 30),
      active: true,
    },
    create: {
      name: 'InfraPulse Demo',
      slug: 'infrapulse-demo',
      cnpj: '00.000.000/0001-00',
      plan: 'GROWTH',
      subscriptionStatus: 'ACTIVE',
      seatLimit: 50,
      monthlyTicketLimit: 10000,
      currentPeriodStart: new Date(),
      currentPeriodEnd: addDays(new Date(), 30),
    },
  });

  const adminPassword = await bcrypt.hash('admin123', 10);
  const gestorPassword = await bcrypt.hash('gestor123', 10);
  const analistaPassword = await bcrypt.hash('analista123', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@infrapulse.com' },
    update: {
      name: 'Administrador',
      password: adminPassword,
      role: UserRole.ADMIN,
      companyId: company.id,
      active: true,
    },
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
    update: {
      name: 'Carlos Gestor',
      password: gestorPassword,
      role: UserRole.GESTOR,
      companyId: company.id,
      active: true,
    },
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
    update: {
      name: 'Ana Martins',
      password: analistaPassword,
      role: UserRole.ANALISTA,
      companyId: company.id,
      active: true,
    },
    create: {
      name: 'Ana Martins',
      email: 'analista@infrapulse.com',
      password: analistaPassword,
      role: UserRole.ANALISTA,
      companyId: company.id,
    },
  });

  const analista2 = await prisma.user.upsert({
    where: { email: 'joao@infrapulse.com' },
    update: {
      name: 'João Silva',
      password: analistaPassword,
      role: UserRole.ANALISTA,
      companyId: company.id,
      active: true,
    },
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
    update: {
      name: 'Maria Santos',
      password: analistaPassword,
      role: UserRole.ANALISTA,
      companyId: company.id,
      active: true,
    },
    create: {
      name: 'Maria Santos',
      email: 'maria@infrapulse.com',
      password: analistaPassword,
      role: UserRole.ANALISTA,
      companyId: company.id,
    },
  });

  const analista4 = await prisma.user.upsert({
    where: { email: 'pedro@infrapulse.com' },
    update: {
      name: 'Pedro Costa',
      password: analistaPassword,
      role: UserRole.ANALISTA,
      companyId: company.id,
      active: true,
    },
    create: {
      name: 'Pedro Costa',
      email: 'pedro@infrapulse.com',
      password: analistaPassword,
      role: UserRole.ANALISTA,
      companyId: company.id,
    },
  });

  const analista5 = await prisma.user.upsert({
    where: { email: 'juliana@infrapulse.com' },
    update: {
      name: 'Juliana Rocha',
      password: analistaPassword,
      role: UserRole.ANALISTA,
      companyId: company.id,
      active: true,
    },
    create: {
      name: 'Juliana Rocha',
      email: 'juliana@infrapulse.com',
      password: analistaPassword,
      role: UserRole.ANALISTA,
      companyId: company.id,
    },
  });

  const analista6 = await prisma.user.upsert({
    where: { email: 'bruno@infrapulse.com' },
    update: {
      name: 'Bruno Almeida',
      password: analistaPassword,
      role: UserRole.ANALISTA,
      companyId: company.id,
      active: true,
    },
    create: {
      name: 'Bruno Almeida',
      email: 'bruno@infrapulse.com',
      password: analistaPassword,
      role: UserRole.ANALISTA,
      companyId: company.id,
    },
  });

  const analysts: SeedAnalyst[] = [
    { id: analista1.id, name: 'Ana Martins', email: 'analista@infrapulse.com', weight: 28, slaOkRate: 0.84, fastResolutionMultiplier: 0.82 },
    { id: analista2.id, name: 'João Silva', email: 'joao@infrapulse.com', weight: 24, slaOkRate: 0.76, fastResolutionMultiplier: 0.95 },
    { id: analista3.id, name: 'Maria Santos', email: 'maria@infrapulse.com', weight: 18, slaOkRate: 0.73, fastResolutionMultiplier: 1.02 },
    { id: analista4.id, name: 'Pedro Costa', email: 'pedro@infrapulse.com', weight: 14, slaOkRate: 0.69, fastResolutionMultiplier: 1.08 },
    { id: analista5.id, name: 'Juliana Rocha', email: 'juliana@infrapulse.com', weight: 10, slaOkRate: 0.81, fastResolutionMultiplier: 0.88 },
    { id: analista6.id, name: 'Bruno Almeida', email: 'bruno@infrapulse.com', weight: 6, slaOkRate: 0.71, fastResolutionMultiplier: 1.1 },
  ];

  const slaBaixa = await prisma.slaRule.upsert({
    where: { id: 'sla-baixa' },
    update: {
      name: 'SLA Baixa Prioridade',
      priority: TicketPriority.BAIXA,
      responseTime: 240,
      resolutionTime: 2880,
      companyId: company.id,
    },
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
    update: {
      name: 'SLA Média Prioridade',
      priority: TicketPriority.MEDIA,
      responseTime: 120,
      resolutionTime: 1440,
      companyId: company.id,
    },
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
    update: {
      name: 'SLA Alta Prioridade',
      priority: TicketPriority.ALTA,
      responseTime: 60,
      resolutionTime: 480,
      companyId: company.id,
    },
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
    update: {
      name: 'SLA Crítica',
      priority: TicketPriority.CRITICA,
      responseTime: 30,
      resolutionTime: 120,
      companyId: company.id,
    },
    create: {
      id: 'sla-critica',
      name: 'SLA Crítica',
      priority: TicketPriority.CRITICA,
      responseTime: 30,
      resolutionTime: 120,
      companyId: company.id,
    },
  });

  await prisma.ticket.deleteMany({
    where: {
      companyId: company.id,
    },
  });

  const now = new Date();

  const issueTemplates: IssueTemplate[] = [
    {
      title: 'Sistema de prontuario fora do ar',
      description: 'O sistema de prontuario eletronico ficou indisponivel para a area assistencial.',
      category: 'Infraestrutura',
      priority: TicketPriority.CRITICA,
      sectorOptions: ['UTI', 'Centro Cirurgico', 'Pronto Atendimento', 'Internacao'],
    },
    {
      title: 'Impressora da recepcao sem resposta',
      description: 'A fila de impressao travou e a recepcao nao consegue emitir etiquetas nem senhas.',
      category: 'Hardware',
      priority: TicketPriority.MEDIA,
      sectorOptions: ['Recepcao', 'Internacao', 'Ambulatorio', 'Farmacia'],
    },
    {
      title: 'Email corporativo nao sincroniza',
      description: 'Usuarios reportam atraso no recebimento de mensagens no desktop e no celular.',
      category: 'E-mail',
      priority: TicketPriority.ALTA,
      sectorOptions: ['Administrativo', 'RH', 'Diretoria', 'Faturamento'],
    },
    {
      title: 'VPN com instabilidade para acesso remoto',
      description: 'A conexao remota oscila e derruba a sessao de equipes em home office.',
      category: 'Rede',
      priority: TicketPriority.ALTA,
      sectorOptions: ['Administrativo', 'Compras', 'Financeiro', 'Comercial'],
    },
    {
      title: 'Senha bloqueada no sistema legado',
      description: 'Usuario nao consegue autenticar apos varias tentativas malsucedidas.',
      category: 'Acesso',
      priority: TicketPriority.MEDIA,
      sectorOptions: ['Farmacia', 'Recepcao', 'Laboratorio', 'Financeiro'],
    },
    {
      title: 'Camera de seguranca offline',
      description: 'Um dos pontos de monitoramento do corredor principal parou de responder.',
      category: 'Seguranca',
      priority: TicketPriority.ALTA,
      sectorOptions: ['Seguranca Patrimonial', 'Portaria', 'Estacionamento', 'Acesso Principal'],
    },
    {
      title: 'Atualizacao de estacoes pendente',
      description: 'Pacote de atualizacao do Windows ficou represado em um lote de maquinas.',
      category: 'Manutencao',
      priority: TicketPriority.BAIXA,
      sectorOptions: ['TI', 'Recepcao', 'Administrativo', 'Laboratorio'],
    },
    {
      title: 'Servidor de arquivos com pouco espaco',
      description: 'Volume de rede atingiu nivel critico e a operacao precisa de limpeza imediata.',
      category: 'Infraestrutura',
      priority: TicketPriority.CRITICA,
      sectorOptions: ['TI', 'Diretoria', 'Financeiro', 'RH'],
    },
    {
      title: 'Sistema de ponto com erro de leitura',
      description: 'A coleta biometrica apresenta falhas intermitentes em varios turnos.',
      category: 'Software',
      priority: TicketPriority.ALTA,
      sectorOptions: ['RH', 'Administrativo', 'Operacoes', 'Pessoal'],
    },
    {
      title: 'Notebook de executivos com tela trincada',
      description: 'Equipamento utilizado em reunioes apresenta dano fisico e precisa de troca.',
      category: 'Hardware',
      priority: TicketPriority.MEDIA,
      sectorOptions: ['Diretoria', 'Financeiro', 'Comercial', 'Juridico'],
    },
    {
      title: 'Wi-Fi fraco no ambulatorio',
      description: 'Sinal sem fio nao cobre completamente a area de atendimento externo.',
      category: 'Rede',
      priority: TicketPriority.BAIXA,
      sectorOptions: ['Ambulatorio', 'Triagem', 'Exames', 'Recepcao'],
    },
    {
      title: 'Sistema de laboratorio com lentidao',
      description: 'Consulta de resultados e emissao de laudos estao abaixo do tempo esperado.',
      category: 'Software',
      priority: TicketPriority.ALTA,
      sectorOptions: ['Laboratorio', 'Imagem', 'Patologia', 'Internacao'],
    },
    {
      title: 'Falha na impressao de etiquetas',
      description: 'Etiquetas de amostras e prontuarios nao estao sendo impressas corretamente.',
      category: 'Hardware',
      priority: TicketPriority.MEDIA,
      sectorOptions: ['Laboratorio', 'Farmacia', 'Recepcao', 'Internacao'],
    },
    {
      title: 'Chave de acesso expirada',
      description: 'Integracao interna parou de responder apos expiracao da credencial.',
      category: 'Integracao',
      priority: TicketPriority.ALTA,
      sectorOptions: ['TI', 'Dados', 'Integracoes', 'BI'],
    },
    {
      title: 'Backup noturno falhou',
      description: 'Rotina de backup apresentou erro e precisa de validacao antes do proximo turno.',
      category: 'Infraestrutura',
      priority: TicketPriority.CRITICA,
      sectorOptions: ['TI', 'Seguranca da Informacao', 'Datacenter', 'Operacoes'],
    },
    {
      title: 'Tablet da enfermagem sem bateria',
      description: 'Dispositivo de mobilidade nao segura carga suficiente para o turno completo.',
      category: 'Hardware',
      priority: TicketPriority.BAIXA,
      sectorOptions: ['Enfermagem', 'UTI', 'Centro Cirurgico', 'Internacao'],
    },
  ];

  const sectorFallbacks = [
    'TI',
    'Administrativo',
    'Financeiro',
    'RH',
    'Recepcao',
    'Farmacia',
    'Laboratorio',
    'UTI',
    'Centro Cirurgico',
    'Internacao',
    'Ambulatorio',
    'Diretoria',
  ];

  const statusOptions: Array<WeightedOption<TicketStatus>> = [
    { value: TicketStatus.ABERTO, weight: 31 },
    { value: TicketStatus.EM_ANDAMENTO, weight: 26 },
    { value: TicketStatus.PENDENTE, weight: 12 },
    { value: TicketStatus.CONCLUIDO, weight: 26 },
    { value: TicketStatus.CANCELADO, weight: 5 },
  ];

  const tickets: Prisma.TicketCreateManyInput[] = [];

  for (let index = 0; index < TICKET_COUNT; index += 1) {
    const random = createPrng(20260419 + index * 97);
    const template = pickFromList(random, issueTemplates);
    const analyst = pickWeighted(random, analysts.map((item) => ({ value: item, weight: item.weight })));
    const status = pickWeighted(random, statusOptions);
    const sector = pickFromList(random, template.sectorOptions.length > 0 ? template.sectorOptions : sectorFallbacks);
    const createdBy = random() < 0.78 ? gestor : admin;
    const rule =
      template.priority === TicketPriority.BAIXA
        ? slaBaixa
        : template.priority === TicketPriority.MEDIA
          ? slaMedia
          : template.priority === TicketPriority.ALTA
            ? slaAlta
            : slaCritica;

    const slaWindowMinutes = rule.resolutionTime;
    const responseWindowMinutes = rule.responseTime;
    const slaResult = pickWeighted(random, [
      { value: SlaStatus.OK, weight: Math.max(1, Math.round(analyst.slaOkRate * 100)) },
      { value: SlaStatus.EM_RISCO, weight: Math.max(1, Math.round((1 - analyst.slaOkRate) * 55)) },
      { value: SlaStatus.VIOLADO, weight: Math.max(1, Math.round((1 - analyst.slaOkRate) * 35)) },
    ]);

    const ageFactorByStatus: Record<TicketStatus, Record<SlaStatus, { min: number; max: number }>> = {
      [TicketStatus.ABERTO]: {
        [SlaStatus.OK]: { min: 0.2, max: 0.78 },
        [SlaStatus.EM_RISCO]: { min: 0.82, max: 1.03 },
        [SlaStatus.VIOLADO]: { min: 1.05, max: 1.7 },
      },
      [TicketStatus.EM_ANDAMENTO]: {
        [SlaStatus.OK]: { min: 0.3, max: 0.85 },
        [SlaStatus.EM_RISCO]: { min: 0.85, max: 1.05 },
        [SlaStatus.VIOLADO]: { min: 1.05, max: 1.8 },
      },
      [TicketStatus.PENDENTE]: {
        [SlaStatus.OK]: { min: 0.55, max: 0.92 },
        [SlaStatus.EM_RISCO]: { min: 0.9, max: 1.08 },
        [SlaStatus.VIOLADO]: { min: 1.1, max: 2 },
      },
      [TicketStatus.CONCLUIDO]: {
        [SlaStatus.OK]: { min: 0.35, max: 0.9 },
        [SlaStatus.EM_RISCO]: { min: 0.9, max: 1.08 },
        [SlaStatus.VIOLADO]: { min: 1.08, max: 1.7 },
      },
      [TicketStatus.CANCELADO]: {
        [SlaStatus.OK]: { min: 0.25, max: 0.8 },
        [SlaStatus.EM_RISCO]: { min: 0.8, max: 1.02 },
        [SlaStatus.VIOLADO]: { min: 1.02, max: 1.4 },
      },
    };

    const windowRange = ageFactorByStatus[status][slaResult];
    const baseOpenedMinutes = randomInt(
      random,
      Math.max(1, Math.round(slaWindowMinutes * windowRange.min)),
      Math.max(2, Math.round(slaWindowMinutes * windowRange.max)),
    );
    const openedAt = subtractMinutes(now, baseOpenedMinutes);

    const shouldHaveResponse = status !== TicketStatus.ABERTO || random() < 0.4;
    const responseDelayBase =
      slaResult === SlaStatus.OK
        ? randomInt(random, 8, Math.max(12, Math.floor(responseWindowMinutes * 0.7)))
        : slaResult === SlaStatus.EM_RISCO
          ? randomInt(random, Math.max(10, Math.floor(responseWindowMinutes * 0.7)), Math.max(15, Math.floor(responseWindowMinutes * 1.15)))
          : randomInt(random, Math.max(15, Math.floor(responseWindowMinutes * 1.1)), Math.max(20, Math.floor(responseWindowMinutes * 2.1)));

    const firstResponseAt = shouldHaveResponse ? addMinutes(openedAt, responseDelayBase) : undefined;

    let resolvedAt: Date | undefined;
    if (status === TicketStatus.CONCLUIDO || status === TicketStatus.CANCELADO) {
      const completedFactor =
        slaResult === SlaStatus.OK
          ? randomFloat(random, 0.45, 0.9)
          : slaResult === SlaStatus.EM_RISCO
            ? randomFloat(random, 0.9, 1.08)
            : randomFloat(random, 1.08, 1.7);
      const resolutionMinutes = Math.max(15, Math.round(slaWindowMinutes * completedFactor * analyst.fastResolutionMultiplier));
      resolvedAt = addMinutes(openedAt, resolutionMinutes);
    }

    const slaDeadline = addMinutes(openedAt, slaWindowMinutes);
    const slaResponseDeadline = addMinutes(openedAt, responseWindowMinutes);

    tickets.push({
      title: `${template.title} #${formatTicketNumber(index)}`,
      description: template.description,
      status,
      priority: template.priority,
      category: template.category,
      sector,
      companyId: company.id,
      assignedToId: analyst.id,
      createdById: createdBy.id,
      slaRuleId: rule.id,
      slaStatus: slaResult,
      openedAt,
      firstResponseAt,
      resolvedAt,
      slaDeadline,
      slaResponseDeadline,
      externalId: `IMP-${formatTicketNumber(index)}`,
    });
  }

  for (const ticketChunk of chunkArray(tickets, BATCH_SIZE)) {
    await prisma.ticket.createMany({
      data: ticketChunk,
    });
  }

  console.log('Seed concluido com sucesso!');
  console.log('');
  console.log('Usuarios criados:');
  console.log('   admin@infrapulse.com / admin123 (Admin)');
  console.log('   gestor@infrapulse.com / gestor123 (Gestor)');
  console.log('   analista@infrapulse.com / analista123 (Analista)');
  console.log('   joao@infrapulse.com / analista123 (Analista)');
  console.log('   maria@infrapulse.com / analista123 (Analista)');
  console.log('   pedro@infrapulse.com / analista123 (Analista)');
  console.log('   juliana@infrapulse.com / analista123 (Analista)');
  console.log('   bruno@infrapulse.com / analista123 (Analista)');
  console.log('');
  console.log(`Chamados gerados: ${tickets.length}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
