/// AutoFi.cdc
/// On-chain financial automation on Flow.
/// Manages user vaults, DCA strategies, and scheduled executions.
///
/// Architecture:
///   - Users save a @Vault resource to their account storage
///   - Each Vault holds deposited funds and a collection of strategies
///   - Strategies are executed on-chain via scheduled transactions or manual trigger
///   - Events emitted for every state change (frontend subscribes to these)

import "FungibleToken"
import "FlowToken"

access(all) contract AutoFi {

    // ──────────────────────────────────────────────
    // Entitlements
    // ──────────────────────────────────────────────

    access(all) entitlement Owner
    access(all) entitlement Execute

    // ──────────────────────────────────────────────
    // Events
    // ──────────────────────────────────────────────

    access(all) event ContractInitialized()

    // Vault lifecycle
    access(all) event VaultCreated(owner: Address)
    access(all) event FundsDeposited(owner: Address, amount: UFix64, newBalance: UFix64)
    access(all) event FundsWithdrawn(owner: Address, amount: UFix64, newBalance: UFix64)

    // Strategy lifecycle
    access(all) event StrategyCreated(
        strategyID: UInt64,
        owner: Address,
        strategyType: UInt8,
        token: String,
        amount: UFix64,
        intervalSeconds: UInt64
    )
    access(all) event StrategyPaused(strategyID: UInt64, owner: Address)
    access(all) event StrategyResumed(strategyID: UInt64, owner: Address)
    access(all) event StrategyCancelled(strategyID: UInt64, owner: Address)

    // Execution
    access(all) event StrategyExecuted(
        strategyID: UInt64,
        owner: Address,
        amountSpent: UFix64,
        executionCount: UInt64,
        nextExecution: UFix64
    )

    // Safety
    access(all) event EmergencyStopActivated(owner: Address)
    access(all) event EmergencyStopDeactivated(owner: Address)
    access(all) event SafetyGuardTriggered(strategyID: UInt64, owner: Address, reason: String)

    // ──────────────────────────────────────────────
    // Enums
    // ──────────────────────────────────────────────

    access(all) enum StrategyType: UInt8 {
        access(all) case DCA_INVEST
        access(all) case SAVINGS_TRANSFER
        access(all) case SUBSCRIPTION_PAYMENT
        access(all) case PRICE_DIP_BUY
        access(all) case TAKE_PROFIT
    }

    access(all) enum StrategyStatus: UInt8 {
        access(all) case ACTIVE
        access(all) case PAUSED
        access(all) case CANCELLED
    }

    // ──────────────────────────────────────────────
    // Interfaces
    // ──────────────────────────────────────────────

    /// Public interface — anyone can read vault data
    access(all) resource interface VaultPublic {
        access(all) view fun getBalance(): UFix64
        access(all) view fun getStrategies(): [Strategy]
        access(all) view fun getStrategy(id: UInt64): Strategy?
        access(all) view fun getExecutionLog(): [ExecutionRecord]
        access(all) view fun isEmergencyStopped(): Bool
    }

    // ──────────────────────────────────────────────
    // Data Structures
    // ──────────────────────────────────────────────

    /// Immutable record of a strategy execution
    access(all) struct ExecutionRecord {
        access(all) let strategyID: UInt64
        access(all) let amount: UFix64
        access(all) let timestamp: UFix64
        access(all) let executionNumber: UInt64

        init(
            strategyID: UInt64,
            amount: UFix64,
            timestamp: UFix64,
            executionNumber: UInt64
        ) {
            self.strategyID = strategyID
            self.amount = amount
            self.timestamp = timestamp
            self.executionNumber = executionNumber
        }
    }

    /// Strategy definition — stored as a struct inside the Vault
    access(all) struct Strategy {
        access(all) let id: UInt64
        access(all) let strategyType: StrategyType
        access(all) let token: String
        access(all) let amountPerExecution: UFix64
        access(all) let intervalSeconds: UInt64
        access(all) let maxMonthlySpend: UFix64
        access(all) let slippageTolerance: UFix64
        access(all) let createdAt: UFix64
        access(all) let description: String

        // Mutable fields
        access(all) var status: StrategyStatus
        access(all) var nextExecution: UFix64
        access(all) var executionCount: UInt64
        access(all) var totalSpent: UFix64
        access(all) var monthlySpent: UFix64

        init(
            id: UInt64,
            strategyType: StrategyType,
            token: String,
            amountPerExecution: UFix64,
            intervalSeconds: UInt64,
            maxMonthlySpend: UFix64,
            slippageTolerance: UFix64,
            createdAt: UFix64,
            nextExecution: UFix64,
            description: String
        ) {
            self.id = id
            self.strategyType = strategyType
            self.token = token
            self.amountPerExecution = amountPerExecution
            self.intervalSeconds = intervalSeconds
            self.maxMonthlySpend = maxMonthlySpend
            self.slippageTolerance = slippageTolerance
            self.createdAt = createdAt
            self.nextExecution = nextExecution
            self.description = description

            self.status = StrategyStatus.ACTIVE
            self.executionCount = 0
            self.totalSpent = 0.0
            self.monthlySpent = 0.0
        }

        access(all) fun pause() {
            self.status = StrategyStatus.PAUSED
        }

        access(all) fun resume() {
            self.status = StrategyStatus.ACTIVE
        }

        access(all) fun cancel() {
            self.status = StrategyStatus.CANCELLED
        }

        access(all) fun recordExecution(amount: UFix64, timestamp: UFix64) {
            self.executionCount = self.executionCount + 1
            self.totalSpent = self.totalSpent + amount
            self.monthlySpent = self.monthlySpent + amount
            self.nextExecution = timestamp + UFix64(self.intervalSeconds)
        }
    }

    // ──────────────────────────────────────────────
    // Vault Resource
    // ──────────────────────────────────────────────

    /// Per-user vault resource holding funds and strategies
    access(all) resource Vault: VaultPublic {
        /// FLOW token vault for deposited funds
        access(self) var flowVault: @FlowToken.Vault

        /// Strategies indexed by ID
        access(self) var strategies: {UInt64: Strategy}

        /// Auto-incrementing strategy ID
        access(self) var nextStrategyID: UInt64

        /// Execution history
        access(self) var executionLog: [ExecutionRecord]

        /// Emergency stop flag
        access(self) var emergencyStopped: Bool

        init() {
            self.flowVault <- FlowToken.createEmptyVault(vaultType: Type<@FlowToken.Vault>())
            self.strategies = {}
            self.nextStrategyID = 1
            self.executionLog = []
            self.emergencyStopped = false
        }

        // ── Public reads (VaultPublic) ──

        access(all) view fun getBalance(): UFix64 {
            return self.flowVault.balance
        }

        access(all) view fun getStrategies(): [Strategy] {
            return self.strategies.values
        }

        access(all) view fun getStrategy(id: UInt64): Strategy? {
            return self.strategies[id]
        }

        access(all) view fun getExecutionLog(): [ExecutionRecord] {
            return self.executionLog
        }

        access(all) view fun isEmergencyStopped(): Bool {
            return self.emergencyStopped
        }

        // ── Owner actions (require Owner entitlement) ──

        /// Deposit FLOW tokens into the vault
        access(Owner) fun deposit(from: @{FungibleToken.Vault}) {
            let amount = from.balance
            self.flowVault.deposit(from: <-from)
            emit FundsDeposited(
                owner: self.owner!.address,
                amount: amount,
                newBalance: self.flowVault.balance
            )
        }

        /// Withdraw FLOW tokens from the vault
        access(Owner) fun withdraw(amount: UFix64): @{FungibleToken.Vault} {
            pre {
                amount > 0.0: "Withdraw amount must be positive"
                self.flowVault.balance >= amount: "Insufficient vault balance"
            }
            let vault <- self.flowVault.withdraw(amount: amount)
            emit FundsWithdrawn(
                owner: self.owner!.address,
                amount: amount,
                newBalance: self.flowVault.balance
            )
            return <-vault
        }

        /// Create a new DCA strategy
        access(Owner) fun createStrategy(
            strategyType: StrategyType,
            token: String,
            amountPerExecution: UFix64,
            intervalSeconds: UInt64,
            maxMonthlySpend: UFix64,
            slippageTolerance: UFix64,
            description: String
        ): UInt64 {
            pre {
                amountPerExecution > 0.0: "Amount must be positive"
                intervalSeconds > 0: "Interval must be positive"
                self.flowVault.balance >= amountPerExecution: "Insufficient balance for first execution"
            }

            let now = getCurrentBlock().timestamp
            let id = self.nextStrategyID

            let strategy = Strategy(
                id: id,
                strategyType: strategyType,
                token: token,
                amountPerExecution: amountPerExecution,
                intervalSeconds: intervalSeconds,
                maxMonthlySpend: maxMonthlySpend,
                slippageTolerance: slippageTolerance,
                createdAt: now,
                nextExecution: now + UFix64(intervalSeconds),
                description: description
            )

            self.strategies[id] = strategy
            self.nextStrategyID = self.nextStrategyID + 1

            emit StrategyCreated(
                strategyID: id,
                owner: self.owner!.address,
                strategyType: strategyType.rawValue,
                token: token,
                amount: amountPerExecution,
                intervalSeconds: intervalSeconds
            )

            return id
        }

        /// Pause a strategy
        access(Owner) fun pauseStrategy(id: UInt64) {
            pre {
                self.strategies[id] != nil: "Strategy not found"
            }
            self.strategies[id]!.pause()
            emit StrategyPaused(strategyID: id, owner: self.owner!.address)
        }

        /// Resume a paused strategy
        access(Owner) fun resumeStrategy(id: UInt64) {
            pre {
                self.strategies[id] != nil: "Strategy not found"
            }
            self.strategies[id]!.resume()
            emit StrategyResumed(strategyID: id, owner: self.owner!.address)
        }

        /// Cancel a strategy permanently
        access(Owner) fun cancelStrategy(id: UInt64) {
            pre {
                self.strategies[id] != nil: "Strategy not found"
            }
            self.strategies[id]!.cancel()
            emit StrategyCancelled(strategyID: id, owner: self.owner!.address)
        }

        /// Emergency stop — pause all strategies
        access(Owner) fun emergencyStop() {
            self.emergencyStopped = true
            for id in self.strategies.keys {
                if self.strategies[id]!.status == StrategyStatus.ACTIVE {
                    self.strategies[id]!.pause()
                }
            }
            emit EmergencyStopActivated(owner: self.owner!.address)
        }

        /// Resume from emergency stop
        access(Owner) fun resumeAll() {
            self.emergencyStopped = false
            for id in self.strategies.keys {
                if self.strategies[id]!.status == StrategyStatus.PAUSED {
                    self.strategies[id]!.resume()
                }
            }
            emit EmergencyStopDeactivated(owner: self.owner!.address)
        }

        // ── Execution (require Execute entitlement) ──

        /// Execute a strategy — called by scheduled transaction or manual trigger
        access(Execute) fun executeStrategy(id: UInt64) {
            pre {
                self.strategies[id] != nil: "Strategy not found"
                !self.emergencyStopped: "Emergency stop is active"
            }

            let strategy = self.strategies[id]!

            // Must be active
            if strategy.status != StrategyStatus.ACTIVE {
                return
            }

            // Check timing
            let now = getCurrentBlock().timestamp
            if now < strategy.nextExecution {
                return
            }

            // Safety: monthly spend cap
            if strategy.maxMonthlySpend > 0.0 {
                if strategy.monthlySpent + strategy.amountPerExecution > strategy.maxMonthlySpend {
                    emit SafetyGuardTriggered(
                        strategyID: id,
                        owner: self.owner!.address,
                        reason: "Monthly spend cap reached"
                    )
                    return
                }
            }

            // Check balance
            if self.flowVault.balance < strategy.amountPerExecution {
                emit SafetyGuardTriggered(
                    strategyID: id,
                    owner: self.owner!.address,
                    reason: "Insufficient vault balance"
                )
                return
            }

            // Execute: deduct funds from AutoFi vault
            // In production: this would swap via IncrementFi and deposit the target token
            // For MVP: we withdraw FLOW from the vault back to the user's main wallet
            let spent = strategy.amountPerExecution
            let withdrawn <- self.flowVault.withdraw(amount: spent)

            // Deposit back to user's main FLOW wallet
            let ownerAccount = getAccount(self.owner!.address)
            let receiverRef = ownerAccount.capabilities.borrow<&{FungibleToken.Receiver}>(
                /public/flowTokenReceiver
            )
            if receiverRef != nil {
                receiverRef!.deposit(from: <-withdrawn)
            } else {
                // Fallback: if receiver not available, re-deposit to vault
                self.flowVault.deposit(from: <-withdrawn)
            }

            self.strategies[id]!.recordExecution(amount: spent, timestamp: now)

            // Log execution
            self.executionLog.append(ExecutionRecord(
                strategyID: id,
                amount: spent,
                timestamp: now,
                executionNumber: self.strategies[id]!.executionCount
            ))

            emit StrategyExecuted(
                strategyID: id,
                owner: self.owner!.address,
                amountSpent: spent,
                executionCount: self.strategies[id]!.executionCount,
                nextExecution: self.strategies[id]!.nextExecution
            )
        }
    }

    // ──────────────────────────────────────────────
    // Storage Paths
    // ──────────────────────────────────────────────

    access(all) let VaultStoragePath: StoragePath
    access(all) let VaultPublicPath: PublicPath

    // ──────────────────────────────────────────────
    // Contract Functions
    // ──────────────────────────────────────────────

    /// Create a new empty vault resource
    access(all) fun createVault(): @Vault {
        return <- create Vault()
    }

    /// Helper: get strategy type name from raw value
    access(all) view fun strategyTypeName(_ t: StrategyType): String {
        switch t {
            case StrategyType.DCA_INVEST:
                return "DCA"
            case StrategyType.SAVINGS_TRANSFER:
                return "SAVE"
            case StrategyType.SUBSCRIPTION_PAYMENT:
                return "SUB"
            case StrategyType.PRICE_DIP_BUY:
                return "DIP"
            case StrategyType.TAKE_PROFIT:
                return "PROFIT"
        }
        return "UNKNOWN"
    }

    // ──────────────────────────────────────────────
    // Contract Init
    // ──────────────────────────────────────────────

    init() {
        self.VaultStoragePath = /storage/AutoFiVault
        self.VaultPublicPath = /public/AutoFiVault

        emit ContractInitialized()
    }
}
