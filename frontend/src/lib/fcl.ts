// FCL configuration for Flow Client Library
import * as fcl from "@onflow/fcl";

const FLOW_NETWORK = process.env.NEXT_PUBLIC_FLOW_NETWORK || "testnet";

const config = {
  testnet: {
    "accessNode.api": "https://rest-testnet.onflow.org",
    "discovery.wallet": "https://fcl-discovery.onflow.org/testnet/authn",
    "flow.network": "testnet",
  },
  mainnet: {
    "accessNode.api": "https://rest-mainnet.onflow.org",
    "discovery.wallet": "https://fcl-discovery.onflow.org/authn",
    "flow.network": "mainnet",
  },
  emulator: {
    "accessNode.api": "http://localhost:8888",
    "discovery.wallet": "http://localhost:8701/fcl/authn",
    "flow.network": "local",
  },
};

const networkConfig = config[FLOW_NETWORK as keyof typeof config] || config.testnet;

fcl.config({
  ...networkConfig,
  "app.detail.title": "AutoFi – Autopilot Finance",
  "app.detail.icon": `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/autofi-logo.svg`,
  "app.detail.description": "Automate investing, subscriptions, savings, and trading on Flow.",
});

export { fcl };
export default fcl;
