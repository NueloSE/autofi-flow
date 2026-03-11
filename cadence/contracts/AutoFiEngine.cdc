/// AutoFiEngine.cdc
/// Core smart contract for AutoFi – Autopilot Finance on Flow
/// Manages user vaults, automation rules, and safety guards.

pub contract AutoFiEngine {

    // ─────────────────────────────────────────────
    // MARK: Events
    // ─────────────────────────────────────────────
    pub event VaultCreated(owner: Address)
    pub event FundsDeposited(owner: Address, amount: UFix64)
    pub event FundsWithdrawn(owner: Address, amount: UFix64)
    pub event RuleCreated(owner: Address, ruleID: UInt64, ruleType: String)
    pub event RuleExecuted(owner: Address, ruleID: UInt64, amount: UFix64)
    pub event RuleCancelled(owner: Address, ruleID: UInt64)
    pub event AllRulesPaused(owner: Address)
    pub event SafetyGuardTriggered(owner: Address, ruleID: UInt64, reason: String)

    // ─────────────────────────────────────────────
    // MARK: Enums
    // ─────────────────────────────────────────────

    pub enum RuleType: UInt8 {
        pub case DCA_INVEST
        pub case SUBSCRIPTION_PAYMENT
        pub case SAVINGS_TRANSFER
        pub case PRICE_DIP_BUY
        pub case PROFIT_SELL
    }

    pub enum TriggerType: UInt8 {
        pub case TIME
        pub case PRICE
    }

    // ─────────────────────────────────────────────
    // MARK: AutomationRule Struct
    // ─────────────────────────────────────────────

    pub struct AutomationRule {
        pub let id: UInt64
        pub let owner: Address
        pub let ruleType: RuleType
        pub let triggerType: TriggerType
        pub let token: String          // e.g. "FLOW" or "USDC"
        pub var amount: UFix64
        pub let receiver: Address?     // for subscription payments
        pub let interval: UInt64       // seconds between executions (for TIME triggers)
        pub var nextExecution: UFix64  // unix timestamp
        pub var referencePrice: UFix64 // price at rule creation (for PRICE triggers)
        pub let priceChangePercent: UFix64 // % drop/rise to trigger
        pub let notifyBeforeExecution: Bool
        pub let notificationEmail: String
        pub var active: Bool
        pub var monthlySpent: UFix64
        pub let maxMonthlySpend: UFix64  // safety guard: max monthly spend
        pub let slippageTolerance: UFix64 // safety guard: max % slippage allowed

        init(
            id: UInt64,
            owner: Address,
            ruleType: RuleType,
            triggerType: TriggerType,
            token: String,
            amount: UFix64,
            receiver: Address?,
            interval: UInt64,
            nextExecution: UFix64,
            referencePrice: UFix64,
            priceChangePercent: UFix64,
            notifyBeforeExecution: Bool,
            notificationEmail: String,
            maxMonthlySpend: UFix64,
            slippageTolerance: UFix64
        ) {
            self.id = id
            self.owner = owner
            self.ruleType = ruleType
            self.triggerType = triggerType
            self.token = token
            self.amount = amount
            self.receiver = receiver
            self.interval = interval
            self.nextExecution = nextExecution
            self.referencePrice = referencePrice
            self.priceChangePercent = priceChangePercent
            self.notifyBeforeExecution = notifyBeforeExecution
            self.notificationEmail = notificationEmail
            self.active = true
            self.monthlySpent = 0.0
            self.maxMonthlySpend = maxMonthlySpend
            self.slippageTolerance = slippageTolerance
        }

        pub fun deactivate() {
            self.active = false
        }

        pub fun recordSpend(amount: UFix64) {
            self.monthlySpent = self.monthlySpent + amount
        }

        pub fun updateNextExecution(timestamp: UFix64) {
            self.nextExecution = timestamp + UFix64(self.interval)
        }
    }

    // ─────────────────────────────────────────────
    // MARK: AutoFiStorage Resource (per-account)
    // ─────────────────────────────────────────────

    pub resource AutoFiStorage {
        pub var vaultBalance: UFix64
        pub var rules: {UInt64: AutomationRule}
        pub var nextRuleID: UInt64
        pub var allPaused: Bool

        init() {
            self.vaultBalance = 0.0
            self.rules = {}
            self.nextRuleID = 1
            self.allPaused = false

            emit AutoFiEngine.VaultCreated(owner: self.owner)
        }

        // Returns the account address that holds this resource
        pub fun owner(): Address {
            return self.storage.address
        }

        /// Deposit funds into the AutoFi vault
        pub fun depositFunds(amount: UFix64) {
            pre {
                amount > 0.0: "Amount must be greater than zero"
            }
            self.vaultBalance = self.vaultBalance + amount
            emit AutoFiEngine.FundsDeposited(owner: self.storage.address, amount: amount)
        }

        /// Withdraw unused funds from the AutoFi vault
        pub fun withdrawFunds(amount: UFix64) {
            pre {
                amount > 0.0: "Amount must be greater than zero"
                self.vaultBalance >= amount: "Insufficient vault balance"
            }
            self.vaultBalance = self.vaultBalance - amount
            emit AutoFiEngine.FundsWithdrawn(owner: self.storage.address, amount: amount)
        }

        /// Create a new automation rule
        pub fun createRule(
            ruleType: RuleType,
            triggerType: TriggerType,
            token: String,
            amount: UFix64,
            receiver: Address?,
            interval: UInt64,
            nextExecution: UFix64,
            referencePrice: UFix64,
            priceChangePercent: UFix64,
            notifyBeforeExecution: Bool,
            notificationEmail: String,
            maxMonthlySpend: UFix64,
            slippageTolerance: UFix64
        ): UInt64 {
            pre {
                amount > 0.0: "Rule amount must be positive"
                self.vaultBalance >= amount: "Insufficient vault balance to create rule"
            }

            let id = self.nextRuleID
            let rule = AutomationRule(
                id: id,
                owner: self.storage.address,
                ruleType: ruleType,
                triggerType: triggerType,
                token: token,
                amount: amount,
                receiver: receiver,
                interval: interval,
                nextExecution: nextExecution,
                referencePrice: referencePrice,
                priceChangePercent: priceChangePercent,
                notifyBeforeExecution: notifyBeforeExecution,
                notificationEmail: notificationEmail,
                maxMonthlySpend: maxMonthlySpend,
                slippageTolerance: slippageTolerance
            )
            self.rules[id] = rule
            self.nextRuleID = self.nextRuleID + 1

            let ruleTypeName = AutoFiEngine.ruleTypeName(ruleType: ruleType)
            emit AutoFiEngine.RuleCreated(owner: self.storage.address, ruleID: id, ruleType: ruleTypeName)

            return id
        }

        /// Execute an automation rule (called by scheduled transaction or keeper)
        pub fun executeRule(ruleID: UInt64, currentPrice: UFix64, currentTimestamp: UFix64) {
            pre {
                self.rules[ruleID] != nil: "Rule not found"
                !self.allPaused: "All rules are paused (emergency stop)"
            }

            let rule = self.rules[ruleID]!

            // Check rule is active
            if !rule.active {
                return
            }

            // TIME trigger: check if it's time to execute
            if rule.triggerType == TriggerType.TIME {
                if currentTimestamp < rule.nextExecution {
                    return
                }
            }

            // PRICE trigger: check price condition
            if rule.triggerType == TriggerType.PRICE {
                if rule.ruleType == RuleType.PRICE_DIP_BUY {
                    let dropPercent = (rule.referencePrice - currentPrice) / rule.referencePrice * 100.0
                    if dropPercent < rule.priceChangePercent {
                        return
                    }
                    // Slippage check
                    if dropPercent > (rule.priceChangePercent + rule.slippageTolerance) {
                        emit AutoFiEngine.SafetyGuardTriggered(
                            owner: self.storage.address,
                            ruleID: ruleID,
                            reason: "Slippage protection triggered"
                        )
                        return
                    }
                } else if rule.ruleType == RuleType.PROFIT_SELL {
                    let risePercent = (currentPrice - rule.referencePrice) / rule.referencePrice * 100.0
                    if risePercent < rule.priceChangePercent {
                        return
                    }
                }
            }

            // Safety guard: monthly spending cap
            if rule.maxMonthlySpend > 0.0 {
                if rule.monthlySpent + rule.amount > rule.maxMonthlySpend {
                    emit AutoFiEngine.SafetyGuardTriggered(
                        owner: self.storage.address,
                        ruleID: ruleID,
                        reason: "Monthly spending cap reached"
                    )
                    return
                }
            }

            // Check vault has enough balance
            if self.vaultBalance < rule.amount {
                emit AutoFiEngine.SafetyGuardTriggered(
                    owner: self.storage.address,
                    ruleID: ruleID,
                    reason: "Insufficient vault balance"
                )
                return
            }

            // Execute: deduct from vault
            self.vaultBalance = self.vaultBalance - rule.amount

            // Record monthly spend
            self.rules[ruleID]!.recordSpend(amount: rule.amount)

            // Update next execution time (for TIME-based rules)
            if rule.triggerType == TriggerType.TIME {
                self.rules[ruleID]!.updateNextExecution(timestamp: currentTimestamp)
            }

            emit AutoFiEngine.RuleExecuted(owner: self.storage.address, ruleID: ruleID, amount: rule.amount)
        }

        /// Cancel / deactivate a rule
        pub fun cancelRule(ruleID: UInt64) {
            pre {
                self.rules[ruleID] != nil: "Rule not found"
            }
            self.rules[ruleID]!.deactivate()
            emit AutoFiEngine.RuleCancelled(owner: self.storage.address, ruleID: ruleID)
        }

        /// Emergency stop – pause ALL rules
        pub fun pauseAllRules() {
            self.allPaused = true
            for id in self.rules.keys {
                self.rules[id]!.deactivate()
            }
            emit AutoFiEngine.AllRulesPaused(owner: self.storage.address)
        }

        /// Resume all paused rules
        pub fun resumeAllRules() {
            self.allPaused = false
        }

        /// Get all rules for this user
        pub fun getUserRules(): [AutomationRule] {
            return self.rules.values
        }

        /// Get vault balance
        pub fun getBalance(): UFix64 {
            return self.vaultBalance
        }
    }

    // ─────────────────────────────────────────────
    // MARK: Storage Path
    // ─────────────────────────────────────────────

    pub let AutoFiStoragePath: StoragePath
    pub let AutoFiPublicPath: PublicPath

    // ─────────────────────────────────────────────
    // MARK: Helper Functions
    // ─────────────────────────────────────────────

    pub fun ruleTypeName(ruleType: RuleType): String {
        switch ruleType {
            case RuleType.DCA_INVEST:
                return "DCA_INVEST"
            case RuleType.SUBSCRIPTION_PAYMENT:
                return "SUBSCRIPTION_PAYMENT"
            case RuleType.SAVINGS_TRANSFER:
                return "SAVINGS_TRANSFER"
            case RuleType.PRICE_DIP_BUY:
                return "PRICE_DIP_BUY"
            case RuleType.PROFIT_SELL:
                return "PROFIT_SELL"
        }
        return "UNKNOWN"
    }

    /// Create a new AutoFiStorage resource for a user account
    pub fun createAutoFiStorage(): @AutoFiStorage {
        return <- create AutoFiStorage()
    }

    // ─────────────────────────────────────────────
    // MARK: Contract Init
    // ─────────────────────────────────────────────

    init() {
        self.AutoFiStoragePath = /storage/AutoFiStorage
        self.AutoFiPublicPath = /public/AutoFiStorage
    }
}
