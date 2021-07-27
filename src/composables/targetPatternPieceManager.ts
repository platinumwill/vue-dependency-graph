import * as sentenceManager from "@/composables/sentenceManager"

export class LinearTargetPatternPiece {

    source: sentenceManager.ModifiedSpacyElement
    appliedText?: string
    specifiedVuekey?: string

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

    constructor(source: sentenceManager.ModifiedSpacyElement) {
        this.source = source
    }

    get isPlaceholder () {
        if (this.source instanceof sentenceManager.ModifiedSpacyDependency) return this.source.isPlaceholder
        return false
    }

    get displayText () {
        if (
            this.source instanceof sentenceManager.ModifiedSpacyDependency
            && this.source.isPlaceholder
            ) return "{" + this.source.label + " 連接處}"
        return this.appliedText
    }
    
    get content () {
        if (this.source instanceof sentenceManager.ModifiedSpacyToken) return this.source.tag + " (" + this.source.lemma + ")"
        if (this.source instanceof sentenceManager.ModifiedSpacyDependency) return this.source.label
        return "TEXT" // fixed text 
    }

    get type () {
        if (this.source instanceof sentenceManager.ModifiedSpacyToken) return LinearTargetPatternPiece.types.token
        if (this.source instanceof sentenceManager.ModifiedSpacyDependency) return LinearTargetPatternPiece.types.dependency
        return LinearTargetPatternPiece.types.text
    }

    get vueKey () {
        if (this.specifiedVuekey == undefined) return this.source.vueKey
        return this.specifiedVuekey
    }

    get sortOrder () {
        if (this.source instanceof sentenceManager.ModifiedSpacyToken) return this.source.indexInSentence
        if (this.source instanceof sentenceManager.ModifiedSpacyDependency) return (this.source.trueStart + this.source.trueEnd) / 2
        const error: string = "不應該執行到這裡"
        throw error
    }

}

export function queryOrGenerateDefaultPieces (currentSpacySentence: sentenceManager.ModifiedSpacySentence, targetPatternPieces: any[], targetPatternPiecesForRevert: any[]) {
    console.log(currentSpacySentence)

    const segmentPieces: LinearTargetPatternPiece[] = []

    const selectedWords = currentSpacySentence.words.filter((word) => {
        return word.selectedMorphologyInfoTypes.length > 0
    })
    selectedWords.forEach((selectedWord) => {
        const piece = new LinearTargetPatternPiece(selectedWord)
        segmentPieces.push(piece)
    })
    currentSpacySentence.arcs.filter((arc) => {
        return arc.selected
    }).forEach((selectedArc) => {
        const piece = new LinearTargetPatternPiece(selectedArc)
        segmentPieces.push(piece)
    })

    segmentPieces.sort(function(a, b) {
        return a.sortOrder - b.sortOrder
    })
    targetPatternPieces.splice(0, targetPatternPieces.length, ...segmentPieces)
    targetPatternPiecesForRevert.splice(
        0
        ,targetPatternPiecesForRevert.length
        , ...segmentPieces
    )
}
