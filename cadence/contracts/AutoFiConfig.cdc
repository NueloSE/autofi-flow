/// AutoFiConfig.cdc
/// Stores extended strategy configuration that couldn't be added to the
/// existing AutoFi.Strategy struct (Cadence disallows new fields on updates).
/// Keyed by "ownerAddress_strategyID".

access(all) contract AutoFiConfig {

    /// Recipient address for SUBSCRIPTION_PAYMENT strategies
    access(all) var strategyRecipients: {String: String}

    /// Minimum output tokens for PRICE_DIP_BUY / TAKE_PROFIT strategies
    access(all) var strategyPriceThresholds: {String: UFix64}

    /// Build composite key from owner + strategy ID
    access(all) view fun key(owner: Address, strategyID: UInt64): String {
        return owner.toString().concat("_").concat(strategyID.toString())
    }

    /// Store recipient for a subscription strategy
    access(all) fun setRecipient(owner: Address, strategyID: UInt64, recipient: String) {
        self.strategyRecipients[self.key(owner: owner, strategyID: strategyID)] = recipient
    }

    /// Store price threshold for a price-gated strategy
    access(all) fun setPriceThreshold(owner: Address, strategyID: UInt64, threshold: UFix64) {
        self.strategyPriceThresholds[self.key(owner: owner, strategyID: strategyID)] = threshold
    }

    /// Get recipient (empty string if not set)
    access(all) view fun getRecipient(owner: Address, strategyID: UInt64): String {
        return self.strategyRecipients[self.key(owner: owner, strategyID: strategyID)] ?? ""
    }

    /// Get price threshold (0.0 if not set)
    access(all) view fun getPriceThreshold(owner: Address, strategyID: UInt64): UFix64 {
        return self.strategyPriceThresholds[self.key(owner: owner, strategyID: strategyID)] ?? 0.0
    }

    init() {
        self.strategyRecipients = {}
        self.strategyPriceThresholds = {}
    }
}
