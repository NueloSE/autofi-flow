/// get_strategies.cdc
/// Returns all strategies for a user's AutoFi vault.

import "AutoFi"

access(all) fun main(address: Address): [AutoFi.Strategy] {
    let account = getAccount(address)

    let vaultRef = account.capabilities.borrow<&{AutoFi.VaultPublic}>(AutoFi.VaultPublicPath)
        ?? panic("AutoFi vault not found for this address")

    return vaultRef.getStrategies()
}
