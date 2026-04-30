import { BaseLoader } from "@ecf/core";
import { Marketplace } from "./Marketplace.js";

export class MarketplaceLoader extends BaseLoader<Marketplace, Marketplace> {
    protected serialize(m: Marketplace): Marketplace { return m; }
    protected deserialize(d: Marketplace): Marketplace { return d; }
}
