/// pause_strategy.cdc
/// Pauses an active strategy.

import "AutoFi"

transaction(strategyID: UInt64) {
    prepare(signer: auth(Storage, BorrowValue) &Account) {
        let vault = signer.storage.borrow<auth(AutoFi.Owner) &AutoFi.Vault>(
            from: AutoFi.VaultStoragePath
        ) ?? panic("AutoFi vault not found.")

        vault.pauseStrategy(id: strategyID)
    }
}
