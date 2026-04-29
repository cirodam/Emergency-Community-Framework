# Emergency Community Framework

Software infrastructure for community-run mutual aid economies.

## The idea

When formal economies fail — or for the billions of people they never served — communities don't stop having needs, and people don't stop being willing to work. What breaks down is the infrastructure for finding each other and keeping track.

This project is that infrastructure.

It gives communities a banking system, a market, a mail system, and a shared budget — run by the community itself, not a bank or a government. The community issues its own currency, backed not by a state or a commodity but by the members' commitment to meet each other's needs. The money supply is anchored to one thing: the number of people in the community. More members, more money. No debt. No interest. No central authority.

Communities can federate — joining together into networks so that trade and mutual aid can flow across a wider circle. The architecture scales from a neighborhood to a city to a globe, with each layer accountable to the one above it.

## Inspirations

**Great Depression-era mutual aid societies** — Fraternal orders and community lodges ran their own insurance, healthcare, and unemployment support through member dues and solidarity. They worked because membership was real: you were vouched in, you had obligations, and the community was the safety net. They collapsed not from failure but because the New Deal nationalized their function.

**Argentinian creditos** — When the peso collapsed in 2001 and the government froze bank accounts, millions of Argentinians turned to community exchange clubs (*clubes de trueque*) that issued their own scrip, backed by the labor and goods members brought to market. At the peak, an estimated six million people were participating. It worked because it was simple, local, and trusted.

**M-Pesa** — Mobile money in Kenya, built on the insight that most people don't need a bank — they need a way to store and send value using the device they already have. It worked because it met people where they were, required no existing financial infrastructure, and spread through social trust networks.

## What's in the repo

- `packages/community` — the core community node: bank, market, mail, census, governance
- `packages/federation` — federates communities; runs a clearing house for inter-community trade
- `packages/commonwealth` — federates federations
- `packages/globe` — the top-level network layer
- `packages/bank` — the underlying banking ledger, shared by all layers
- `packages/mail` — inter-node messaging
- `packages/market` — goods and labour exchange
- `packages/core` — shared identity, cryptography, and networking primitives

## Documentation

- [Organizing a community](docs/organizing-a-community.md)
- [Architecture](architecture.md)
