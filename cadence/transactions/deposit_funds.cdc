/// deposit_funds.cdc
/// Deposits funds into the user's AutoFi vault.
/// In production this would transfer actual FLOW/USDC tokens.

import AutoFiEngine from "../contracts/AutoFiEngine.cdc"

transaction(amount: UFix64) {
    prepare(signer: AuthAccount) {
        // Initialize AutoFiStorage if it doesn't exist
        if signer.borrow<&AutoFiEngine.AutoFiStorage>(from: AutoFiEngine.AutoFiStoragePath) == nil {
            let storage <- AutoFiEngine.createAutoFiStorage()
            signer.save(<-storage, to: AutoFiEngine.AutoFiStoragePath)
        }

        let storage = signer.borrow<&AutoFiEngine.AutoFiStorage>(from: AutoFiEngine.AutoFiStoragePath)
            ?? panic("Could not borrow AutoFiStorage")

        // In production: transfer tokens from signer's vault to AutoFi escrow
        // For demo: directly record deposit in AutoFi vault
        storage.depositFunds(amount: amount)
    }
}
