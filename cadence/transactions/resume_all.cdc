/// resume_all.cdc
/// Deactivates emergency stop and resumes all paused strategies.

import "AutoFi"

transaction {
    prepare(signer: auth(Storage, BorrowValue) &Account) {
        let vault = signer.storage.borrow<auth(AutoFi.Owner) &AutoFi.Vault>(
            from: AutoFi.VaultStoragePath
        ) ?? panic("AutoFi vault not found.")

        vault.resumeAll()
    }
}
