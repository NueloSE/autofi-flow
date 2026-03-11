/// withdraw.cdc
/// Withdraws FLOW tokens from the user's AutoFi vault back to their wallet.

import "FungibleToken"
import "FlowToken"
import "AutoFi"

transaction(amount: UFix64) {
    prepare(signer: auth(Storage, BorrowValue) &Account) {
        // Borrow the AutoFi vault
        let autoFiVault = signer.storage.borrow<auth(AutoFi.Owner) &AutoFi.Vault>(
            from: AutoFi.VaultStoragePath
        ) ?? panic("AutoFi vault not found.")

        // Withdraw from AutoFi
        let withdrawn <- autoFiVault.withdraw(amount: amount)

        // Deposit back to user's FLOW vault
        let flowVault = signer.storage.borrow<&FlowToken.Vault>(
            from: /storage/flowTokenVault
        ) ?? panic("Could not borrow FLOW vault")

        flowVault.deposit(from: <-withdrawn)
    }
}
