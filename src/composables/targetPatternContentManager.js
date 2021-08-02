import { ref, watch } from 'vue'
import gremlinApi from "@/composables/api/gremlin-api"
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
        gremlinApi(gremlinInvoke.command).then( (resultData) => {
            console.log('query target pattern result: ', resultData)
            const piece = new targetPatternPieceManager.LinearTargetPatternPiece(targetPatternPieceManager.LinearTargetPatternPiece.types.token)
            console.log('piece type: ', piece.type)
            console.log('piece type compare: ', piece.type === targetPatternPieceManager.LinearTargetPatternPiece.types.token)
        })

    })

    const targetPatternPieces = ref([])
    const targetPatternPiecesForRevert = []

    const queryOrGenerateDefaultPieces = (currentSpacySentence) => {
        targetPatternPieceManager.queryOrGenerateDefaultPieces(currentSpacySentence, targetPatternPieces.value, targetPatternPiecesForRevert)
    }

    const addFixedTextPiece = () => {
        const fixedTextPiece = new targetPatternPieceManager.LinearTargetPatternPiece()
        fixedTextPiece.specifiedVuekey = 'fixed-' + targetPatternPieces.value.filter(item => item.type === targetPatternPieceManager.LinearTargetPatternPiece.types.text).length
        console.log(fixedTextPiece.specifiedVuekey)
        targetPatternPieces.value.push(fixedTextPiece)
    }

    return {
        targetPatternContent: {
            targetPatternPieces: targetPatternPieces
            , queryOrGenerateDefaultPieces: queryOrGenerateDefaultPieces
            , targetPatternPiecesForRevert: targetPatternPiecesForRevert
            , addFixedTextPiece: addFixedTextPiece
        }
    }

}
