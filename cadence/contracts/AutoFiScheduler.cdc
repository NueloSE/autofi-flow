/// AutoFiScheduler.cdc
/// Bridges AutoFi strategies with Flow Scheduled Transactions.
/// Provides a TransactionHandler that auto-executes strategies on schedule
/// and re-schedules the next execution (self-recurring loop).

import "FlowTransactionScheduler"
import "FlowTransactionSchedulerUtils"
import "AutoFi"
import "FungibleToken"
import "FlowToken"

access(all) contract AutoFiScheduler {

    // Storage paths for the handler resource
    access(all) let HandlerStoragePath: StoragePath
    access(all) let HandlerPublicPath: PublicPath

    /// Handler resource — implements FlowTransactionScheduler.TransactionHandler.
    /// Stored in each user's account. Holds capabilities to:
    ///   - AutoFi Vault (Execute entitlement) — to call executeStrategy
    ///   - FLOW Vault (Withdraw) — to pay scheduling fees
    ///   - Scheduler Manager (Owner) — to schedule the next execution
    access(all) resource Handler: FlowTransactionScheduler.TransactionHandler {
        access(self) let vaultCap: Capability<auth(AutoFi.Execute) &AutoFi.Vault>
        access(self) let flowVaultCap: Capability<auth(FungibleToken.Withdraw) &FlowToken.Vault>
        access(self) let managerCap: Capability<auth(FlowTransactionSchedulerUtils.Owner) &{FlowTransactionSchedulerUtils.Manager}>

        init(
            vaultCap: Capability<auth(AutoFi.Execute) &AutoFi.Vault>,
            flowVaultCap: Capability<auth(FungibleToken.Withdraw) &FlowToken.Vault>,
            managerCap: Capability<auth(FlowTransactionSchedulerUtils.Owner) &{FlowTransactionSchedulerUtils.Manager}>
        ) {
            self.vaultCap = vaultCap
            self.flowVaultCap = flowVaultCap
            self.managerCap = managerCap
        }

        /// Called by Flow's scheduler when the scheduled time arrives.
        /// data contains the strategy ID as UInt64.
        access(FlowTransactionScheduler.Execute) fun executeTransaction(id: UInt64, data: AnyStruct?) {
            // Borrow AutoFi vault
            let vault = self.vaultCap.borrow()
                ?? panic("Cannot borrow AutoFi vault")

            // Skip if emergency stopped (avoid panic from pre-condition)
            if vault.isEmergencyStopped() {
                return
            }

            // Get strategy ID from data
            let strategyID = data! as! UInt64

            // Check strategy is still active before executing
            let strategyBefore = vault.getStrategy(id: strategyID)
            if strategyBefore == nil {
                return
            }
            if strategyBefore!.status.rawValue != 0 {
                // Not ACTIVE (paused or cancelled) — stop the loop
                return
            }

            // Execute the strategy (deducts funds, updates counters)
            vault.executeStrategy(id: strategyID)

            // Check if still active after execution for re-scheduling
            let strategyAfter = vault.getStrategy(id: strategyID)
            if strategyAfter == nil || strategyAfter!.status.rawValue != 0 {
                return
            }

            // --- Self-recurring: schedule the NEXT execution ---
            let nextTimestamp = strategyAfter!.nextExecution
            let priority = FlowTransactionScheduler.Priority.Medium
            let executionEffort: UInt64 = 5000

            let fee = FlowTransactionScheduler.calculateFee(
                executionEffort: executionEffort,
                priority: priority,
                dataSizeMB: 0.0
            )

            // Borrow FLOW vault for fee payment
            if let flowVault = self.flowVaultCap.borrow() {
                if flowVault.balance >= fee {
                    let fees <- flowVault.withdraw(amount: fee) as! @FlowToken.Vault

                    if let manager = self.managerCap.borrow() {
                        // Re-schedule using same handler
                        let _ = manager.scheduleByHandler(
                            handlerTypeIdentifier: self.getType().identifier,
                            handlerUUID: self.uuid,
                            data: strategyID,
                            timestamp: nextTimestamp,
                            priority: priority,
                            executionEffort: executionEffort,
                            fees: <-fees
                        )
                    } else {
                        // Can't borrow manager — deposit fees back
                        flowVault.deposit(from: <-fees)
                    }
                }
                // If insufficient balance for fee, the loop stops silently
            }
        }

        access(all) view fun getViews(): [Type] {
            return [Type<StoragePath>(), Type<PublicPath>()]
        }

        access(all) fun resolveView(_ view: Type): AnyStruct? {
            switch view {
                case Type<StoragePath>():
                    return AutoFiScheduler.HandlerStoragePath
                case Type<PublicPath>():
                    return AutoFiScheduler.HandlerPublicPath
                default:
                    return nil
            }
        }
    }

    /// Factory function — creates a new Handler resource
    access(all) fun createHandler(
        vaultCap: Capability<auth(AutoFi.Execute) &AutoFi.Vault>,
        flowVaultCap: Capability<auth(FungibleToken.Withdraw) &FlowToken.Vault>,
        managerCap: Capability<auth(FlowTransactionSchedulerUtils.Owner) &{FlowTransactionSchedulerUtils.Manager}>
    ): @Handler {
        return <- create Handler(
            vaultCap: vaultCap,
            flowVaultCap: flowVaultCap,
            managerCap: managerCap
        )
    }

    init() {
        self.HandlerStoragePath = /storage/AutoFiScheduledHandler
        self.HandlerPublicPath = /public/AutoFiScheduledHandler
    }
}
