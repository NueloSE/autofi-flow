/// resume_strategy.cdc
/// Resumes a paused strategy.

import "AutoFi"

transaction(strategyID: UInt64) {
    prepare(signer: auth(Storage, BorrowValue) &Account) {
        let vault = signer.storage.borrow<auth(AutoFi.Owner) &AutoFi.Vault>(
            from: AutoFi.VaultStoragePath
        ) ?? panic("AutoFi vault not found.")

        vault.resumeStrategy(id: strategyID)
    }
}
