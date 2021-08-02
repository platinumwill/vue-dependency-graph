import { watch } from 'vue'
import * as gremlinManager from "@/composables/gremlinManager"
import * as targetPatternPieceManager from "@/composables/targetPatternPieceManager"

export default function(
    targetPattern
    ) {

    watch(targetPattern.selected, (newValue, oldValue) => {
        console.log('watching target pattern change: ', newValue, oldValue)

        if (newValue == undefined || newValue.id == undefined) return

        const targetPatternBeginnningVertexId = newValue.id
        const gremlinInvoke = 
        new gremlinManager.GremlinInvoke()
        .call("V", targetPatternBeginnningVertexId)
        .call("repeat", new gremlinManager.GremlinInvoke(true).call("out"))
        .call("until", new gremlinManager.GremlinInvoke(true).call("out").call("count").call("is", 0))
        .call("limit", 20)
        .call("path")
        console.log(gremlinInvoke.command)
        gremlinManager.submit(gremlinInvoke.command).then( (resultData) => {
            console.log('query target pattern result: ', resultData)
            const piece = new targetPatternPieceManager.LinearTargetPatternPiece(targetPatternPieceManager.LinearTargetPatternPiece.types.token)
            console.log('piece type: ', piece.type)
            console.log('piece type compare: ', piece.type === targetPatternPieceManager.LinearTargetPatternPiece.types.token)
        })

    })

    return {
        targetPatternContent: {
        }
    }

}
