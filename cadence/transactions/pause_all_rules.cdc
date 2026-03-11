/// pause_all_rules.cdc
/// Emergency stop – pauses ALL automation rules immediately.

import AutoFiEngine from "../contracts/AutoFiEngine.cdc"

transaction {
    prepare(signer: AuthAccount) {
        let storage = signer.borrow<&AutoFiEngine.AutoFiStorage>(from: AutoFiEngine.AutoFiStoragePath)
            ?? panic("AutoFiStorage not found.")

        storage.pauseAllRules()

        log("All AutoFi rules have been paused.")
    }
}
