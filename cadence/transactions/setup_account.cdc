/// setup_account.cdc
/// Initializes a user's AutoFi vault and publishes the public capability.

import "AutoFi"

transaction {
    prepare(signer: auth(Storage, Capabilities) &Account) {
        // Only create if vault doesn't already exist
        if signer.storage.borrow<&AutoFi.Vault>(from: AutoFi.VaultStoragePath) != nil {
            return
        }

        // Create and save the vault
        let vault <- AutoFi.createVault()
        signer.storage.save(<-vault, to: AutoFi.VaultStoragePath)

        // Publish public capability
        let cap = signer.capabilities.storage.issue<&{AutoFi.VaultPublic}>(AutoFi.VaultStoragePath)
        signer.capabilities.publish(cap, at: AutoFi.VaultPublicPath)
    }
}
