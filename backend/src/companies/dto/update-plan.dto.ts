import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';

const companyPlans = ['TRIAL', 'STARTER', 'GROWTH', 'ENTERPRISE'] as const;
const subscriptionStatuses = ['TRIALING', 'ACTIVE', 'PAST_DUE', 'CANCELED'] as const;

export class UpdatePlanDto {
  @ApiProperty({ enum: companyPlans })
  @IsString()
  @IsIn(companyPlans)
  plan: (typeof companyPlans)[number];

  @ApiProperty({ enum: subscriptionStatuses, required: false })
  @IsOptional()
  @IsString()
  @IsIn(subscriptionStatuses)
  subscriptionStatus?: (typeof subscriptionStatuses)[number];
}
