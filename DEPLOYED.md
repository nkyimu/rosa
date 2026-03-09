# IntentCircles — Deployed Contracts

**Network**: Celo Sepolia (Chain ID: 11142220)
**RPC**: `https://forno.celo-sepolia.celo-testnet.org`
**Explorer**: `https://celo-sepolia.blockscout.com`
**Deployer**: `0xa62C2EA1Aa2Ae36C9dFb329E3B194Dc6125758eB`

## Contracts

| Contract | Address | Status |
|----------|---------|--------|
| **IntentRegistry** | `0x6Bddd66698206c9956e5ac65F9083A132B574844` | ✅ Deployed |
| **CircleTrust** | `0x0c2098e90A078b2183b765eFB38Bd912FcDBb8Ba` | ✅ Deployed |
| **DemoCircle (SaveCircle)** | `0xfaDA25f4CD0f311d7F512B748E3242976e7AD3CF` | ✅ Deployed |
| **AgentRegistry8004** | `0xDaCE1481D99fb8184196e5Db28A16d7FcF006CA7` | ✅ Deployed |
| **AgentPayment** | `0x5F1fD5655C42f77253E17Ec1FB9F65AC86400Ed4` | ✅ Deployed |

## Tokens

| Token | Address |
|-------|---------|
| **cUSD** | `0xEF4d55D6dE8e8d73232827Cd1e9b2F2dBb45bC80` |

## Notes
- CircleFactory exceeded 24KB size limit — deployed SaveCircle directly instead
- Agent registered as "IntentCircles Keeper" on AgentRegistry8004
- AgentPayment fee: 0.01 cUSD per intent
- DemoCircle config: circleId=1, 7-day rounds, no yield vault, min trust=0
