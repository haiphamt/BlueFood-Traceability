export type ProofStatus = 'confirmed' | 'pending' | 'failed' | 'tampered';

export interface BlockchainProof {
  txHash: string;
  status: ProofStatus;
  blockNumber?: number | null;
}

export interface TraceTimelineStep {
  key: 'harvest' | 'packaging' | 'qc' | 'transport' | 'received';
  name: string;
  date?: string | null;
  location?: string | null;
  notes?: string | null;
  certLabel?: string | null;
  carrierName?: string | null;
  proof?: BlockchainProof | null;
}

export interface TraceCertificate {
  id: string;
  type: string;
  issuer?: string | null;
  certNumber?: string | null;
  validFrom?: string | null;
  validUntil?: string | null;
  fileUrl?: string | null;
}
