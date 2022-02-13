import { watch } from "vue";
import { ModifiedSpacyToken } from "./sentenceManager";

export function createSegmentManager(token: ModifiedSpacyToken): SegmentManager {
    watch(token, (newValue, oldValue) => {
        // PROGRESS
    })

    return {}
}

export type SegmentManager = {

}
