/// get_execution_history.cdc
/// Returns the execution log for a user's AutoFi vault.

import "AutoFi"

access(all) fun main(address: Address): [AutoFi.ExecutionRecord] {
    let account = getAccount(address)

    let vaultRef = account.capabilities.borrow<&{AutoFi.VaultPublic}>(AutoFi.VaultPublicPath)
        ?? panic("AutoFi vault not found for this address")

    return vaultRef.getExecutionLog()
}
