/// get_user_rules.cdc
/// Returns all automation rules for a given address.

import AutoFiEngine from "../contracts/AutoFiEngine.cdc"

pub fun main(address: Address): [AutoFiEngine.AutomationRule] {
    let account = getAccount(address)

    let storage = account.getCapability(AutoFiEngine.AutoFiPublicPath)
        .borrow<&AutoFiEngine.AutoFiStorage>()

    if storage == nil {
        return []
    }

    return storage!.getUserRules()
}
