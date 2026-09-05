export interface ProductionDto {
  id?: number | null;
  style: string;
  manPowerAllocated: number;
  target: number;
  checked: number;
  pass: number;
  defects: number;
  defectPercentage: number;
  offeredBeyondTarget: number;
  remarks: string;
}

export interface ProcessDto {
  id?: number | null;
  processDate: string; // Format: YYYY-MM-DD
  hour: number;
  manPowerAllocated: number;
  target: number;
  checked: number;
  pass: number;
  defects: number;
  defectPercentage: number;
  productionDtos?: ProductionDto[];
  productionList?: ProductionDto[];
}

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  success: boolean;
}
