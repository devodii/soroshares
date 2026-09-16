import { Horizon, rpc } from "@stellar/stellar-sdk";
import { HORIZON_URL, RPC_URL } from "./env";

export const horizonServer = new Horizon.Server(HORIZON_URL);
export const rpcServer = new rpc.Server(RPC_URL);
