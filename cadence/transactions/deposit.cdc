/// deposit.cdc
/// Deposits FLOW tokens into the user's AutoFi vault.

import "FungibleToken"
import "FlowToken"
import "AutoFi"

transaction(amount: UFix64) {
    prepare(signer: auth(Storage, BorrowValue) &Account) {
        // Borrow the user's FLOW vault
        let flowVault = signer.storage.borrow<auth(FungibleToken.Withdraw) &FlowToken.Vault>(
            from: /storage/flowTokenVault
        ) ?? panic("Could not borrow FLOW vault")

        // Withdraw the deposit amount
        let deposit <- flowVault.withdraw(amount: amount)

        // Borrow the AutoFi vault
        let autoFiVault = signer.storage.borrow<auth(AutoFi.Owner) &AutoFi.Vault>(
            from: AutoFi.VaultStoragePath
        ) ?? panic("AutoFi vault not found. Run setup_account first.")

        // Deposit into AutoFi
        autoFiVault.deposit(from: <-deposit)
    }
}
