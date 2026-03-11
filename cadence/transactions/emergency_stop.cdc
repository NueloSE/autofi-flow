/// emergency_stop.cdc
/// Activates emergency stop — pauses all active strategies.

import "AutoFi"

transaction {
    prepare(signer: auth(Storage, BorrowValue) &Account) {
        let vault = signer.storage.borrow<auth(AutoFi.Owner) &AutoFi.Vault>(
            from: AutoFi.VaultStoragePath
        ) ?? panic("AutoFi vault not found.")

        vault.emergencyStop()
    }
}
