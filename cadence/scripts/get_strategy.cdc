/// get_strategy.cdc
/// Returns a single strategy by ID from a user's AutoFi vault.

import "AutoFi"

access(all) fun main(address: Address, strategyID: UInt64): AutoFi.Strategy? {
    let account = getAccount(address)

    let vaultRef = account.capabilities.borrow<&{AutoFi.VaultPublic}>(AutoFi.VaultPublicPath)
        ?? panic("AutoFi vault not found for this address")

    return vaultRef.getStrategy(id: strategyID)
}
