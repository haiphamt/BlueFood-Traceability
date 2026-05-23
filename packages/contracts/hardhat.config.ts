import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "../../apps/web/.env.local") });

const PRIVATE_KEY = process.env.BLOCKCHAIN_SUBMITTER_PRIVATE_KEY!;
const RPC_URL = process.env.POLYGON_RPC_URL!;

const config: HardhatUserConfig = {
  solidity: "0.8.24",
  networks: {
    hardhat: {},
    amoy: {
      url: RPC_URL ?? "https://rpc-amoy.polygon.technology",
      accounts: [PRIVATE_KEY],
      chainId: 80002,
    },
  },
};

export default config;
