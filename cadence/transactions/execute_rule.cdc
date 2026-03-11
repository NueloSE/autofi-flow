/// execute_rule.cdc
/// Executes an automation rule (triggered by scheduled transaction or keeper).

import AutoFiEngine from "../contracts/AutoFiEngine.cdc"

transaction(targetAddress: Address, ruleID: UInt64, currentPrice: UFix64, currentTimestamp: UFix64) {
    prepare(signer: AuthAccount) {
        // In production, the keeper/scheduler calls this with proper authority
        let account = getAccount(targetAddress)
        // Note: In real deployment, the target user's capability would be used
        // For demo, we borrow from the signer's own storage
        let storage = signer.borrow<&AutoFiEngine.AutoFiStorage>(from: AutoFiEngine.AutoFiStoragePath)
            ?? panic("AutoFiStorage not found")

        storage.executeRule(
            ruleID: ruleID,
            currentPrice: currentPrice,
            currentTimestamp: currentTimestamp
        )
    }
}
