/// cancel_rule.cdc
/// Cancels (deactivates) an automation rule.

import AutoFiEngine from "../contracts/AutoFiEngine.cdc"

transaction(ruleID: UInt64) {
    prepare(signer: AuthAccount) {
        let storage = signer.borrow<&AutoFiEngine.AutoFiStorage>(from: AutoFiEngine.AutoFiStoragePath)
            ?? panic("AutoFiStorage not found. Deposit funds first.")

        storage.cancelRule(ruleID: ruleID)
    }
}
