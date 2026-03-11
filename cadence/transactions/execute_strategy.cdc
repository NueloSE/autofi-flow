/// execute_strategy.cdc
/// Executes a strategy — called by scheduled transaction or manual trigger.

import "AutoFi"

transaction(strategyID: UInt64) {
    prepare(signer: auth(Storage, BorrowValue) &Account) {
        let vault = signer.storage.borrow<auth(AutoFi.Execute) &AutoFi.Vault>(
            from: AutoFi.VaultStoragePath
        ) ?? panic("AutoFi vault not found.")

        vault.executeStrategy(id: strategyID)
    }
}
