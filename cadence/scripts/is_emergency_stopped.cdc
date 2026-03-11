/// is_emergency_stopped.cdc
/// Returns whether a user's AutoFi vault has emergency stop active.

import "AutoFi"

access(all) fun main(address: Address): Bool {
    let account = getAccount(address)

    let vaultRef = account.capabilities.borrow<&{AutoFi.VaultPublic}>(AutoFi.VaultPublicPath)
        ?? panic("AutoFi vault not found for this address")

    return vaultRef.isEmergencyStopped()
}
