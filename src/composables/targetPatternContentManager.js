import { ref, watch } from 'vue'
import gremlinApi, * as gremlinUtils from "@/composables/api/gremlin-api"
import * as sentenceManager from "@/composables/sentenceManager"

class LinearTargetPatternPiece {

    static types = Object.freeze({
        token: {
            caption: "Token"
            , name: "token"
            , isToken: true
        }
        , dependency: {
            caption: "Dependency"
            , name: "dependency"
        }
        , text: {
            caption: "Text"
            , name: "text"
            , isText: true
        }
    })

    constructor(source) {
        this.source = source
    }

    get displayText () {
        return this.appliedText
    }

    get type () {
        if (this.source instanceof sentenceManager.ModifiedSpacyToken) return LinearTargetPatternPiece.types.token
        if (this.source instanceof sentenceManager.ModifiedSpacyDependency) return LinearTargetPatternPiece.types.dependency
        return LinearTargetPatternPiece.types.text
    }

}

export default function(
    targetPattern
    , patternHelper
    ) {

    const tempUtil = patternHelper

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
            const piece = new LinearTargetPatternPiece(LinearTargetPatternPiece.types.token)
            console.log('piece type: ', piece.type)
            console.log('piece type compare: ', piece.type === LinearTargetPatternPiece.types.token)
        })

    })

    const targetPatternPieces = ref([])
    const targetPatternPiecesForRevert = []

    const queryOrGenerateDefaultPieces = (currentSpacySentence) => {
        console.log(currentSpacySentence)

        const segmentPieces = []

        const selectedWords = currentSpacySentence.words.filter((word) => {
            return word.selectedMorphologyInfoTypes.length > 0
        })
        selectedWords.forEach((selectedWord) => {
            const item = new LinearTargetPatternPiece(selectedWord)
            item.content = selectedWord.tag + ' (' + selectedWord.lemma + ')'
            item.vueKey = "token-" + selectedWord.indexInSentence
            item.sortOrder = selectedWord.indexInSentence
            segmentPieces.push(item)
        })
        currentSpacySentence.arcs.filter((arc) => {
            return arc.selected
        }).forEach((selectedArc) => {
            const item = new LinearTargetPatternPiece(selectedArc)
            item.content = selectedArc.label
            item.vueKey = "dependency-" + selectedArc.indexInSentence

            item.sortOrder = (selectedArc.trueStart + selectedArc.trueEnd) / 2
            if (tempUtil.isDependencyPlaceholder(selectedArc, selectedWords)) {
                item.isPlaceholder = true
                item.appliedText = '{' + selectedArc.label + ' 連接處}'
            }
            segmentPieces.push(item)
        })

        segmentPieces.sort(function(a, b) {
            return a.sortOrder - b.sortOrder
        })
        targetPatternPieces.value.splice(0, targetPatternPieces.value.length, ...segmentPieces)
        targetPatternPiecesForRevert.splice(
            0
            ,targetPatternPiecesForRevert.length
            , ...segmentPieces
        )
    }

    const addFixedTextPiece = () => {
        const fixedTextPiece = new LinearTargetPatternPiece()
        fixedTextPiece.content = 'TEXT'
        fixedTextPiece.vueKey = 'fixed-' + targetPatternPieces.value.filter(item => item.type === LinearTargetPatternPiece.types.text).length
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
