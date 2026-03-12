/// Creates an AutoFi strategy AND schedules the first execution
/// using Flow Scheduled Transactions. The handler auto-reschedules
/// each subsequent execution (self-recurring loop).

import AutoFi from "AutoFi"
import AutoFiScheduler from "AutoFiScheduler"
import FlowTransactionScheduler from "FlowTransactionScheduler"
import FlowTransactionSchedulerUtils from "FlowTransactionSchedulerUtils"
import FungibleToken from "FungibleToken"
import FlowToken from "FlowToken"

transaction(
    strategyTypeRaw: UInt8,
    token: String,
    amountPerExecution: UFix64,
    intervalSeconds: UInt64,
    maxMonthlySpend: UFix64,
    slippageTolerance: UFix64,
    description: String
) {
    prepare(signer: auth(Storage, Capabilities, BorrowValue) &Account) {

        // ── 1. Create the strategy (same as regular create) ──
        let vault = signer.storage.borrow<auth(AutoFi.Owner) &AutoFi.Vault>(
            from: AutoFi.VaultStoragePath
        ) ?? panic("AutoFi vault not found. Run setup_account first.")

        let strategyType = AutoFi.StrategyType(rawValue: strategyTypeRaw)
            ?? panic("Invalid strategy type")

        let strategyID = vault.createStrategy(
            strategyType: strategyType,
            token: token,
            amountPerExecution: amountPerExecution,
            intervalSeconds: intervalSeconds,
            maxMonthlySpend: maxMonthlySpend,
            slippageTolerance: slippageTolerance,
            description: description
        )

        // ── 2. Setup Scheduler Manager (once per account) ──
        if !signer.storage.check<@{FlowTransactionSchedulerUtils.Manager}>(
            from: FlowTransactionSchedulerUtils.managerStoragePath
        ) {
            let manager <- FlowTransactionSchedulerUtils.createManager()
            signer.storage.save(<-manager, to: FlowTransactionSchedulerUtils.managerStoragePath)
            let managerCap = signer.capabilities.storage.issue<
                &{FlowTransactionSchedulerUtils.Manager}
            >(FlowTransactionSchedulerUtils.managerStoragePath)
            signer.capabilities.publish(managerCap, at: FlowTransactionSchedulerUtils.managerPublicPath)
        }

        // ── 3. Setup AutoFi Scheduled Handler (once per account) ──
        let handlerPath = AutoFiScheduler.HandlerStoragePath
        if !signer.storage.check<@AutoFiScheduler.Handler>(from: handlerPath) {
            // Issue capabilities the handler needs for autonomous execution
            let vaultCap = signer.capabilities.storage.issue<
                auth(AutoFi.Execute) &AutoFi.Vault
            >(AutoFi.VaultStoragePath)

            let flowVaultCap = signer.capabilities.storage.issue<
                auth(FungibleToken.Withdraw) &FlowToken.Vault
            >(/storage/flowTokenVault)

            let managerCap = signer.capabilities.storage.issue<
                auth(FlowTransactionSchedulerUtils.Owner) &{FlowTransactionSchedulerUtils.Manager}
            >(FlowTransactionSchedulerUtils.managerStoragePath)

            let handler <- AutoFiScheduler.createHandler(
                vaultCap: vaultCap,
                flowVaultCap: flowVaultCap,
                managerCap: managerCap
            )
            signer.storage.save(<-handler, to: handlerPath)

            // Public capability so the scheduler can find the handler
            let publicCap = signer.capabilities.storage.issue<
                &{FlowTransactionScheduler.TransactionHandler}
            >(handlerPath)
            signer.capabilities.publish(publicCap, at: AutoFiScheduler.HandlerPublicPath)
        }

        // ── 4. Get Execute-entitled capability for the handler ──
        var handlerCap: Capability<auth(FlowTransactionScheduler.Execute) &{FlowTransactionScheduler.TransactionHandler}>? = nil
        let controllers = signer.capabilities.storage.getControllers(forPath: handlerPath)
        for controller in controllers {
            if let cap = controller.capability as? Capability<
                auth(FlowTransactionScheduler.Execute) &{FlowTransactionScheduler.TransactionHandler}
            > {
                handlerCap = cap
                break
            }
        }
        // Issue one if none exists yet
        if handlerCap == nil {
            handlerCap = signer.capabilities.storage.issue<
                auth(FlowTransactionScheduler.Execute) &{FlowTransactionScheduler.TransactionHandler}
            >(handlerPath)
        }

        // ── 5. Calculate scheduling fee ──
        let priority = FlowTransactionScheduler.Priority.Medium
        let executionEffort: UInt64 = 5000
        let fee = FlowTransactionScheduler.calculateFee(
            executionEffort: executionEffort,
            priority: priority,
            dataSizeMB: 0.0
        )

        // ── 6. Withdraw fee from user's FLOW wallet ──
        let flowVault = signer.storage.borrow<auth(FungibleToken.Withdraw) &FlowToken.Vault>(
            from: /storage/flowTokenVault
        ) ?? panic("Could not borrow FLOW vault for scheduling fee")
        let fees <- flowVault.withdraw(amount: fee) as! @FlowToken.Vault

        // ── 7. Get strategy's nextExecution time ──
        let strategy = vault.getStrategy(id: strategyID)
            ?? panic("Strategy just created but not found")

        // ── 8. Schedule first execution ──
        let manager = signer.storage.borrow<
            auth(FlowTransactionSchedulerUtils.Owner) &{FlowTransactionSchedulerUtils.Manager}
        >(from: FlowTransactionSchedulerUtils.managerStoragePath)
            ?? panic("Could not borrow Scheduler Manager")

        let _ = manager.schedule(
            handlerCap: handlerCap!,
            data: strategyID,
            timestamp: strategy.nextExecution,
            priority: priority,
            executionEffort: executionEffort,
            fees: <-fees
        )
    }
}
