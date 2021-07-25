import { ref, watch } from 'vue'
import gremlinApi, * as gremlinUtils from "@/composables/api/gremlin-api"

class TargetPatternPiece {

    static types = Object.freeze({
        token: {
            caption: "Token"
        }
    })

    constructor(type) {
        this.type = type
    }

    get displayText () {
        return this.appliedText
    }
}

export default function(targetPattern) {

    watch(targetPattern.selected, (newValue, oldValue) => {
        console.log('watching target pattern change: ', newValue, oldValue)

        if (newValue == undefined || newValue.id == undefined) return

        const targetPatternBeginnningVertexId = newValue.id
        const gremlinInvoke = 
        new gremlinUtils.GremlinInvoke()        
        .call("V", targetPatternBeginnningVertexId)
        .nest("repeat", new gremlinUtils.GremlinInvoke(true).call("out").command)
        .nest("until", new gremlinUtils.GremlinInvoke(true).call("out").call("count").call("is", 0).command)
        .call("limit", 20)
        .call("path")
        console.log(gremlinInvoke.command)
        gremlinApi(gremlinInvoke.command).then( (resultData) => {
            console.log('query target pattern result: ', resultData)
            const piece = new TargetPatternPiece(TargetPatternPiece.types.token)
            console.log('piece type: ', piece.type)
            console.log('piece type compare: ', piece.type === TargetPatternPiece.types.token)
        })

    })

    const targetPatternPieces = ref([])
    const targetPatternPiecesForRevert = []

    return {
        targetPatternContent: {
            targetPatternPieces: targetPatternPieces
            , targetPatternPiecesForRevert: targetPatternPiecesForRevert
        }
    }

}
