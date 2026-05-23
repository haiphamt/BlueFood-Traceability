import { ethers, ZeroHash } from 'ethers';

const BATCH_REGISTRY_ABI = [
  'function anchor(bytes32 dataHash, string calldata lotId, string calldata eventType, bytes32 prevHash) external',
  'function getRecord(bytes32 dataHash) external view returns (tuple(bytes32 dataHash, string lotId, string eventType, bytes32 prevHash, uint256 timestamp, address submitter))',
  'function getLotHistory(string calldata lotId) external view returns (bytes32[])',
  'event BatchAnchored(bytes32 indexed dataHash, string indexed lotId, string eventType, uint256 timestamp)',
];

export interface OnChainRecord {
  dataHash: string;
  lotId: string;
  eventType: string;
  prevHash: string;
  timestamp: bigint;
  submitter: string;
}

function getProvider(): ethers.JsonRpcProvider {
  const rpcUrl = process.env.POLYGON_RPC_URL;
  if (!rpcUrl) throw new Error('POLYGON_RPC_URL is not set');
  return new ethers.JsonRpcProvider(rpcUrl);
}

function getSigner(): ethers.Wallet {
  const key = process.env.BLOCKCHAIN_SUBMITTER_PRIVATE_KEY;
  if (!key) throw new Error('BLOCKCHAIN_SUBMITTER_PRIVATE_KEY is not set');
  return new ethers.Wallet(key, getProvider());
}

function getContract(signerOrProvider?: ethers.Signer | ethers.Provider): ethers.Contract {
  const address = process.env.CONTRACT_ADDRESS;
  if (!address) throw new Error('CONTRACT_ADDRESS is not set');
  return new ethers.Contract(address, BATCH_REGISTRY_ABI, signerOrProvider ?? getProvider());
}

export async function anchorOnChain(
  dataHash: string,
  lotId: string,
  eventType: string,
  prevHash?: string
): Promise<ethers.TransactionReceipt> {
  const signer = getSigner();
  const contract = getContract(signer);
  const tx = await contract.anchor(dataHash, lotId, eventType, prevHash ?? ZeroHash);
  const receipt = await tx.wait(1);
  if (!receipt) throw new Error('Transaction receipt is null');
  return receipt;
}

export async function getOnChainRecord(dataHash: string): Promise<OnChainRecord | null> {
  const contract = getContract();
  const rec = await contract.getRecord(dataHash);
  if (rec.timestamp === BigInt(0)) return null;
  return {
    dataHash: rec.dataHash,
    lotId: rec.lotId,
    eventType: rec.eventType,
    prevHash: rec.prevHash,
    timestamp: rec.timestamp,
    submitter: rec.submitter,
  };
}

export async function getLotHistoryOnChain(lotId: string): Promise<string[]> {
  const contract = getContract();
  return contract.getLotHistory(lotId);
}
