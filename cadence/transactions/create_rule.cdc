/// create_rule.cdc
/// Creates a new automation rule in the user's AutoFiStorage.

import AutoFiEngine from "../contracts/AutoFiEngine.cdc"

transaction(
    ruleTypeRaw: UInt8,
    triggerTypeRaw: UInt8,
    token: String,
    amount: UFix64,
    receiver: Address?,
    interval: UInt64,
    nextExecution: UFix64,
    referencePrice: UFix64,
    priceChangePercent: UFix64,
    notifyBeforeExecution: Bool,
    notificationEmail: String,
    maxMonthlySpend: UFix64,
    slippageTolerance: UFix64
) {
    prepare(signer: AuthAccount) {
        if signer.borrow<&AutoFiEngine.AutoFiStorage>(from: AutoFiEngine.AutoFiStoragePath) == nil {
            let storage <- AutoFiEngine.createAutoFiStorage()
            signer.save(<-storage, to: AutoFiEngine.AutoFiStoragePath)
        }

        let storage = signer.borrow<&AutoFiEngine.AutoFiStorage>(from: AutoFiEngine.AutoFiStoragePath)
            ?? panic("Could not borrow AutoFiStorage")

        let ruleType = AutoFiEngine.RuleType(rawValue: ruleTypeRaw)
            ?? panic("Invalid rule type")
        let triggerType = AutoFiEngine.TriggerType(rawValue: triggerTypeRaw)
            ?? panic("Invalid trigger type")

        let ruleID = storage.createRule(
            ruleType: ruleType,
            triggerType: triggerType,
            token: token,
            amount: amount,
            receiver: receiver,
            interval: interval,
            nextExecution: nextExecution,
            referencePrice: referencePrice,
            priceChangePercent: priceChangePercent,
            notifyBeforeExecution: notifyBeforeExecution,
            notificationEmail: notificationEmail,
            maxMonthlySpend: maxMonthlySpend,
            slippageTolerance: slippageTolerance
        )

        log("Rule created with ID: ".concat(ruleID.toString()))
    }
}
