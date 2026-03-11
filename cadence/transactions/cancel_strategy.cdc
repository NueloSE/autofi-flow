/// cancel_strategy.cdc
/// Permanently cancels a strategy.

import "AutoFi"

transaction(strategyID: UInt64) {
    prepare(signer: auth(Storage, BorrowValue) &Account) {
        let vault = signer.storage.borrow<auth(AutoFi.Owner) &AutoFi.Vault>(
            from: AutoFi.VaultStoragePath
        ) ?? panic("AutoFi vault not found.")

        vault.cancelStrategy(id: strategyID)
    }
}
