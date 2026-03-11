/// get_vault_balance.cdc
/// Returns the AutoFi vault balance for a given address.

import AutoFiEngine from "../contracts/AutoFiEngine.cdc"

pub fun main(address: Address): UFix64 {
    let account = getAccount(address)

    let storage = account.getCapability(AutoFiEngine.AutoFiPublicPath)
        .borrow<&AutoFiEngine.AutoFiStorage>()

    if storage == nil {
        return 0.0
    }

    return storage!.getBalance()
}
