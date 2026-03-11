/// create_strategy.cdc
/// Creates a new automation strategy in the user's AutoFi vault.

import "AutoFi"

transaction(
    strategyTypeRaw: UInt8,
    token: String,
    amountPerExecution: UFix64,
    intervalSeconds: UInt64,
    maxMonthlySpend: UFix64,
    slippageTolerance: UFix64,
    description: String
) {
    prepare(signer: auth(Storage, BorrowValue) &Account) {
        let vault = signer.storage.borrow<auth(AutoFi.Owner) &AutoFi.Vault>(
            from: AutoFi.VaultStoragePath
        ) ?? panic("AutoFi vault not found. Run setup_account first.")

        let strategyType = AutoFi.StrategyType(rawValue: strategyTypeRaw)
            ?? panic("Invalid strategy type")

        let _ = vault.createStrategy(
            strategyType: strategyType,
            token: token,
            amountPerExecution: amountPerExecution,
            intervalSeconds: intervalSeconds,
            maxMonthlySpend: maxMonthlySpend,
            slippageTolerance: slippageTolerance,
            description: description
        )
    }
}
